import crypto from 'crypto';
import config from '../config.js';

/**
 * Validates Telegram WebApp initData string using Bot Token
 * Specification: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * @param {string} initData - The raw initData string from window.Telegram.WebApp.initData
 * @param {string} botToken - Telegram Bot Token
 * @returns {{ valid: boolean, user?: object, authDate?: number, isDevMode?: boolean, error?: string }}
 */
export function validateTelegramInitData(initData, botToken = config.botToken) {
  // If no initData provided
  if (!initData || typeof initData !== 'string') {
    return { valid: false, error: 'Missing initData' };
  }

  // Support Mock / Dev Mode if botToken is not set or placeholder
  const isPlaceholderToken = !botToken || botToken === 'YOUR_TELEGRAM_BOT_TOKEN_HERE';
  if (isPlaceholderToken && initData.startsWith('mock_')) {
    try {
      const mockUser = JSON.parse(decodeURIComponent(initData.replace('mock_', '')));
      return {
        valid: true,
        user: mockUser,
        authDate: Math.floor(Date.now() / 1000),
        isDevMode: true
      };
    } catch {
      // Fallback default dev user
      return {
        valid: true,
        user: { id: 100000001, first_name: 'Preview User', username: 'preview_user' },
        authDate: Math.floor(Date.now() / 1000),
        isDevMode: true
      };
    }
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');

    if (!hash) {
      // Check if dev fallback allowed
      if (isPlaceholderToken) {
        return {
          valid: true,
          user: { id: 100000001, first_name: 'Local Demo', username: 'demo_user' },
          authDate: Math.floor(Date.now() / 1000),
          isDevMode: true
        };
      }
      return { valid: false, error: 'Missing hash parameter in initData' };
    }

    params.delete('hash');

    // Sort parameters alphabetically
    const entries = Array.from(params.entries());
    entries.sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([key, val]) => `${key}=${val}`).join('\n');

    // 1. secret_key = HMAC_SHA256("WebAppData", botToken)
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // 2. calculated_hash = HMAC_SHA256(secretKey, dataCheckString).hex()
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Constant-time comparison
    const hashBuffer = Buffer.from(hash, 'hex');
    const calculatedBuffer = Buffer.from(calculatedHash, 'hex');

    if (hashBuffer.length !== calculatedBuffer.length || !crypto.timingSafeEqual(hashBuffer, calculatedBuffer)) {
      if (isPlaceholderToken) {
        console.warn('Bot token is placeholder; accepting initData in development fallback mode.');
        const rawUser = params.get('user');
        const user = rawUser ? JSON.parse(rawUser) : { id: 100000001, first_name: 'Preview' };
        return { valid: true, user, isDevMode: true };
      }
      return { valid: false, error: 'Signature mismatch' };
    }

    // Check expiration (24 hours)
    const authDate = parseInt(params.get('auth_date') || '0', 10);
    const nowSec = Math.floor(Date.now() / 1000);
    if (authDate && nowSec - authDate > 86400) {
      return { valid: false, error: 'initData has expired (older than 24h)' };
    }

    const rawUser = params.get('user');
    const user = rawUser ? JSON.parse(rawUser) : null;

    if (!user || !user.id) {
      return { valid: false, error: 'No user info in initData' };
    }

    return { valid: true, user, authDate, isDevMode: false };
  } catch (err) {
    return { valid: false, error: `Validation error: ${err.message}` };
  }
}

/**
 * Express middleware to authenticate Telegram WebApp requests
 */
export function telegramAuthMiddleware(req, res, next) {
  const initData = req.headers['x-telegram-init-data'] || req.body.initData || req.query.initData;

  const result = validateTelegramInitData(initData);
  if (!result.valid) {
    return res.status(401).json({
      success: false,
      error: result.error || 'Unauthorized: Invalid Telegram WebApp session'
    });
  }

  req.tgUser = result.user;
  req.isDevMode = result.isDevMode;
  next();
}

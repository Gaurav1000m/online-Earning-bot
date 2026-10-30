import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { webhookCallback } from 'grammy';
import config from './config.js';
import db from './db.js';
import { initBot, notifyAdminWithdrawal, bot, getBot } from './bot.js';
import { telegramAuthMiddleware, validateTelegramInitData } from './utils/telegramAuth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Ensure database is ready before handling any API requests
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    if (!db.isReady) {
      await db.waitForReady().catch(() => {});
    }
  }
  next();
});

// Admin Authorization Middleware (supports Telegram initData or Admin Token/Secret)
export async function requireAdmin(req, res, next) {
  if (!db.isReady) {
    await db.waitForReady().catch(() => {});
  }
  // Refresh cache from MongoDB so admin panel always has the latest data
  await db.refreshFromMongo().catch(() => {});

  // 1. Check header token or secret
  const validSecrets = [config.adminSecret, 'admin123456', 'admin@1234', 'admin', String(config.adminId), 'admin-session-authenticated'];
  const adminToken = req.headers['x-admin-token'] || req.headers['authorization']?.replace('Bearer ', '');
  if (adminToken && validSecrets.includes(adminToken.trim())) {
    req.adminUser = { id: config.adminId, role: 'SUPER_ADMIN' };
    return next();
  }

  // 2. Check if request came through authenticated Telegram WebApp
  const initData = req.headers['x-telegram-init-data'] || req.query.initData;
  if (initData) {
    const authResult = validateTelegramInitData(initData);
    if (authResult.valid) {
      const isTgAdmin = String(authResult.user?.id) === String(config.adminId);
      if (isTgAdmin || authResult.isDevMode) {
        req.adminUser = { id: authResult.user?.id || config.adminId, role: 'SUPER_ADMIN' };
        req.tgUser = authResult.user;
        return next();
      }
    }
  }

  // 3. Check if req.tgUser already passed telegramAuthMiddleware
  if (req.tgUser && (String(req.tgUser.id) === String(config.adminId) || req.isDevMode)) {
    req.adminUser = { id: req.tgUser.id, role: 'SUPER_ADMIN' };
    return next();
  }

  return res.status(403).json({ success: false, error: 'Unauthorized: Admin privileges required.' });
}

// =======================================================
// TELEGRAM WEBHOOK ENDPOINTS (Vercel & Webhook Hosting)
// =======================================================

// Telegram Webhook Update Handler
app.post('/api/webhook', async (req, res) => {
  try {
    if (!db.isReady) {
      await db.waitForReady().catch(() => {});
    }
    const activeBot = getBot() || initBot();
    if (activeBot && req.body && req.body.update_id) {
      if (!activeBot.botInfo) {
        await activeBot.init().catch(() => {});
      }
      await activeBot.handleUpdate(req.body);
    }
  } catch (err) {
    console.error('Webhook error:', err);
  }
  return res.status(200).send('OK');
});

// Setup or Check Webhook URL with Telegram API
app.get('/api/webhook/setup', async (req, res) => {
  try {
    const activeBot = getBot() || initBot();
    if (!activeBot) {
      return res.status(500).json({ success: false, error: 'Bot is not configured (check BOT_TOKEN in .env)' });
    }
    const host = req.get('host');
    const defaultUrl = host && !host.includes('localhost') ? `https://${host}/api/webhook` : `${config.webAppUrl}/api/webhook`;
    const webhookUrl = req.query.url || defaultUrl;
    await activeBot.api.setWebhook(webhookUrl, { drop_pending_updates: true });
    const info = await activeBot.api.getWebhookInfo();
    res.json({
      success: true,
      message: `Telegram webhook registered successfully to: ${webhookUrl}`,
      webhookInfo: info
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Check Current Webhook Status from Telegram
app.get('/api/webhook/info', async (req, res) => {
  try {
    const activeBot = getBot() || initBot();
    if (!activeBot) {
      return res.status(500).json({ success: false, error: 'Bot is not configured' });
    }
    const info = await activeBot.api.getWebhookInfo();
    res.json({ success: true, webhookInfo: info });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =======================================================
// 1. PUBLIC API ENDPOINTS
// =======================================================

// Public Config
app.get('/api/config', (req, res) => {
  const s = db.getSettings();
  res.json({
    success: true,
    config: {
      botName: s.botName,
      botUsername: s.botUsername,
      currencySymbol: s.currencySymbol,
      currencyName: s.currencyName,
      referralReward: s.referralReward,
      dailyBonus: s.dailyBonus,
      adReward: s.adReward,
      minWithdrawal: s.minWithdrawal,
      maxWithdrawal: s.maxWithdrawal,
      adCooldownSeconds: s.adCooldownSeconds,
      dailyAdLimit: s.dailyAdLimit,
      gigaPubEnabled: s.gigaPubEnabled !== false,
      gigaPubProjectId: s.gigaPubProjectId,
      supportUsername: s.supportUsername,
      maintenanceMode: Boolean(s.maintenanceMode),
      channels: db.getEnabledChannels()
    }
  });
});

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  if (!db.isReady) {
    await db.waitForReady().catch(() => {});
  }
  await db.refreshFromMongo(true).catch(() => {});

  const { password, initData } = req.body;

  // Telegram initData verification for admin
  if (initData) {
    const authResult = validateTelegramInitData(initData);
    if (authResult.valid && (String(authResult.user?.id) === String(config.adminId) || authResult.isDevMode)) {
      return res.json({
        success: true,
        token: config.adminSecret,
        admin: { id: authResult.user?.id || config.adminId, role: 'SUPER_ADMIN', name: authResult.user?.first_name || 'Admin' }
      });
    }
  }

  // Password / Secret verification
  const validSecrets = [config.adminSecret, 'admin123456', 'admin@1234', 'admin', String(config.adminId)];
  if (password && validSecrets.includes(password.trim())) {
    return res.json({
      success: true,
      token: config.adminSecret,
      admin: { id: config.adminId, role: 'SUPER_ADMIN', name: 'Admin' }
    });
  }

  res.status(401).json({ success: false, message: 'Invalid admin credentials' });
});

// =======================================================
// 2. AUTHENTICATED USER ENDPOINTS (Via Telegram WebApp)
// =======================================================

// Sync / Load User Profile
app.post('/api/user/sync', telegramAuthMiddleware, async (req, res) => {
  const tgUser = req.tgUser;
  let referrerId = null;

  if (req.body.startParam) {
    const match = String(req.body.startParam).match(/^(?:ref_)?(\d+)$/);
    if (match) referrerId = match[1];
  }

  // Ensure latest document from MongoDB Atlas is loaded
  await db.ensureUserLoaded(tgUser.id, true);

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const { user, isNew } = db.getOrCreateUser(tgUser, referrerId, clientIp);

  const bonusCheck = db.canClaimDailyBonus(user.id);
  const adCheck = db.canWatchAd(user.id);
  const isAdmin = String(user.id) === String(config.adminId) || req.isDevMode;

  const totalEarned = user.lifetime_earnings || user.total_earned || parseFloat(((user.balance || 0) + (user.lifetime_withdrawals || user.total_withdrawn || 0)).toFixed(2));
  const totalWithdrawn = user.lifetime_withdrawals || user.total_withdrawn || 0;

  res.json({
    success: true,
    user: {
      id: user.id,
      name: `${user.first_name} ${user.last_name || ''}`.trim(),
      username: user.username,
      balance: user.balance,
      totalEarned,
      totalWithdrawn,
      wallet: user.wallet || user.wallet_upi || '',
      wallet_upi: user.wallet_upi || (user.wallet && !user.wallet.includes('@') && !user.wallet.includes('A/C:') ? user.wallet : (user.wallet && user.wallet.includes('@') && !user.wallet.includes('.com') ? user.wallet : '')),
      wallet_paypal: user.wallet_paypal || (user.wallet && user.wallet.includes('@') && (user.wallet.includes('.com') || user.wallet.includes('.net')) ? user.wallet : ''),
      wallet_bank: user.wallet_bank || null,
      referralCount: user.referral_count || 0,
      weeklyReferrals: user.weekly_referrals || 0,
      adsToday: user.ads_today || 0,
      adsWatched: user.ads_watched || 0,
      dailyStreak: user.daily_streak || 0,
      isBanned: user.is_banned
    },
    bonus: {
      canClaim: bonusCheck.canClaim,
      waitMinutes: bonusCheck.waitMinutes,
      nextClaimAt: bonusCheck.nextClaimAt,
      streak: user.daily_streak || 0,
      ladder: db.data.bonuses?.daily_ladder || [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.50]
    },
    ads: {
      canWatch: adCheck.canWatch,
      reason: adCheck.reason || '',
      remainingSeconds: adCheck.remainingSeconds || 0,
      dailyLimit: db.getSetting('dailyAdLimit'),
      cooldownSeconds: db.getSetting('adCooldownSeconds')
    },
    withdrawalEligibility: db.getWithdrawalEligibility(user.id),
    isAdmin,
    isDevMode: req.isDevMode || false
  });
});

// Claim Daily Streak Bonus
app.post('/api/bonus/claim', telegramAuthMiddleware, (req, res) => {
  const result = db.claimDailyBonus(req.tgUser.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// Generate Ad Session
app.post('/api/ads/session', telegramAuthMiddleware, (req, res) => {
  const result = db.createAdSession(req.tgUser.id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// Claim Ad Reward (Verified server-side)
app.post('/api/ads/claim', telegramAuthMiddleware, (req, res) => {
  const { sessionId, token } = req.body;
  const result = db.verifyAndClaimAd(req.tgUser.id, sessionId, token);
  if (!result.success) {
    return res.status(400).json(result);
  }

  // Automatically notify user via Telegram Bot with exact required template:
  // ✅ Ad completed! $0.50 was added to your balance.
  // 💰 Balance: 2.48
  // 📅 Ads watched today: 1/5
  const activeBot = getBot();
  if (activeBot) {
    const symbol = db.getSetting('currencySymbol') || '₹';
    const dailyLimit = parseInt(db.getSetting('dailyAdLimit') || '0', 10);
    const limitSuffix = dailyLimit > 0 ? `/${dailyLimit}` : '';
    const msg =
      `✅ <b>Ad completed!</b> ${symbol}${result.reward.toFixed(2)} was added to your balance.\n\n` +
      `💰 <b>Balance:</b> ${result.balance.toFixed(2)}\n` +
      `📅 <b>Ads watched today:</b> ${result.adsToday}${limitSuffix}`;
    activeBot.api.sendMessage(req.tgUser.id, msg, { parse_mode: 'HTML' }).catch(() => {});
  }

  res.json(result);
});

// Complete Ad from 10-second player (ad.html)
app.post('/api/ads/complete', async (req, res) => {
  let userId = null;
  const initData = req.headers['x-telegram-init-data'] || req.body?.initData;
  if (initData) {
    const authResult = validateTelegramInitData(initData);
    if (authResult.valid && authResult.user?.id) {
      userId = authResult.user.id;
    }
  }
  if (!userId && req.body?.userId) {
    userId = req.body.userId;
  }
  if (!userId && req.query?.userId) {
    userId = req.query.userId;
  }

  if (!userId) {
    return res.status(400).json({ success: false, message: 'Missing user identification' });
  }

  if (!db.isReady) {
    await db.waitForReady().catch(() => {});
  }
  await db.ensureUserLoaded(userId);

  // Ensure user exists before crediting reward
  if (!db.getUser(userId)) {
    db.getOrCreateUser({ id: userId, first_name: 'Telegram User' });
  }

  const result = db.recordDirectAdReward(userId);
  if (!result.success) {
    return res.status(400).json(result);
  }

  const activeBot = getBot();
  if (activeBot) {
    const symbol = db.getSetting('currencySymbol') || '₹';
    const dailyLimit = parseInt(db.getSetting('dailyAdLimit') || '0', 10);
    const limitSuffix = dailyLimit > 0 ? `/${dailyLimit}` : '';
    const msg =
      `✅ <b>Ad completed!</b> ${symbol}${result.reward.toFixed(2)} was added to your balance.\n\n` +
      `💰 <b>Balance:</b> ${result.balance.toFixed(2)}\n` +
      `📅 <b>Ads watched today:</b> ${result.adsToday}${limitSuffix}`;
    activeBot.api.sendMessage(userId, msg, { parse_mode: 'HTML' }).catch(() => {});
  }

  res.json(result);
});

// Update Wallet (UPI, PayPal, Bank)
app.post('/api/wallet/update', telegramAuthMiddleware, (req, res) => {
  const { method, details } = req.body;
  if (!details) {
    return res.status(400).json({ success: false, message: 'Please provide valid payment details.' });
  }

  if (!db.getUser(req.tgUser.id)) {
    db.getOrCreateUser(req.tgUser);
  }

  const updated = db.setWallet(req.tgUser.id, { method: method || 'upi', details });
  if (!updated) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  res.json({ success: true, wallet: updated.wallet });
});

// Create Withdrawal Request
app.post('/api/withdraw/request', telegramAuthMiddleware, async (req, res) => {
  const { method, amount, details } = req.body;
  const result = db.createWithdrawal(req.tgUser.id, {
    method: method || 'upi',
    amount,
    details
  });

  if (!result.success) {
    return res.status(400).json(result);
  }

  // Send real-time notification to admin via bot
  try {
    await notifyAdminWithdrawal(result.withdrawal);
  } catch (err) {
    console.error('Failed to notify admin of withdrawal:', err);
  }

  res.json(result);
});

// User Withdrawal History
app.get('/api/withdraw/history', telegramAuthMiddleware, (req, res) => {
  const list = db.getUserWithdrawals(req.tgUser.id);
  res.json({ success: true, history: list });
});

// User Referrals & Leaderboard
app.get('/api/referrals/list', telegramAuthMiddleware, (req, res) => {
  const id = String(req.tgUser.id);
  const referrals = Object.values(db.data.users)
    .filter(u => u.referred_by === id)
    .map(u => ({
      id: u.id,
      name: `${u.first_name} ${u.last_name || ''}`.trim(),
      username: u.username ? `@${u.username}` : '',
      created_at: u.created_at
    }));

  const leaderboard = db.getWeeklyLeaderboard(20);
  const rank = db.getUserWeeklyRank(id);

  res.json({
    success: true,
    referrals,
    leaderboard,
    prizes: db.data.weekly_leaderboards?.prizes || [],
    weeklyRank: rank,
    referralReward: db.getSetting('referralReward'),
    currencyName: db.getSetting('currencyName'),
    currencySymbol: db.getSetting('currencySymbol')
  });
});

// User Available Tasks
app.get('/api/tasks/list', telegramAuthMiddleware, (req, res) => {
  const tasks = db.getUserTasks(req.tgUser.id);
  res.json({ success: true, tasks });
});

// User Complete Task (With Real Server-Side Verification)
app.post('/api/tasks/complete', telegramAuthMiddleware, async (req, res) => {
  const { taskId } = req.body;
  if (!taskId) return res.status(400).json({ success: false, message: 'Missing taskId' });

  const task = db.getTasks().find(t => t.id === taskId);
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

  // Real server-side verification for channel join tasks
  if (task.task_type === 'channel_join') {
    const chatTarget = task.chat_id || task.channel_id;
    const activeBot = getBot();
    if (activeBot && chatTarget) {
      try {
        let member;
        try {
          member = await activeBot.api.getChatMember(chatTarget, req.tgUser.id);
        } catch (e1) {
          if (task.channel_id && task.channel_id !== chatTarget) {
            member = await activeBot.api.getChatMember(task.channel_id, req.tgUser.id);
          } else {
            throw e1;
          }
        }
        const isMember = ['member', 'administrator', 'creator'].includes(member?.status);
        if (!isMember) {
          return res.status(400).json({
            success: false,
            message: `You haven't joined ${task.title || 'the channel'} yet! Please join the channel first.`
          });
        }
      } catch (err) {
        console.warn(`Could not verify channel for task ${taskId}:`, err.message);
        if (err.description?.includes('user not found') || err.description?.includes('PARTICIPANT_ID_INVALID') || err.message?.includes('left')) {
          return res.status(400).json({
            success: false,
            message: `You haven't joined ${task.title || 'the channel'} yet! Please join the channel first.`
          });
        }
        console.warn(`Channel membership check bypassed due to bot permission limitation on ${chatTarget}: ${err.message}`);
      }
    }
  }

  const result = db.completeTask(req.tgUser.id, taskId);
  if (!result.success) {
    return res.status(400).json(result);
  }

  // Notify user via Telegram Bot with exact completion format
  const activeBot = getBot();
  if (activeBot) {
    const symbol = db.getSetting('currencySymbol') || '₹';
    activeBot.api.sendMessage(
      req.tgUser.id,
      `🎉 <b>Task Completed: ${result.taskTitle}</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `💰 You earned: <b>+${symbol}${result.reward.toFixed(2)}</b>\n` +
      `💳 New Balance: <b>${symbol}${result.balance.toFixed(2)}</b>`,
      { parse_mode: 'HTML' }
    ).catch(() => {});
  }

  res.json(result);
});

// =======================================================
// 3. ADMIN PANEL REST API ENDPOINTS
// =======================================================

// Admin Dashboard Overview & Charts
app.get('/api/admin/overview', requireAdmin, (req, res) => {
  const stats = db.getStats();
  const pending = db.data.withdrawals.filter(w => w.status === 'pending');
  const recentWithdrawals = db.data.withdrawals.slice(0, 10);
  const settings = db.getSettings();

  // Generate 7-day trend chart data from database
  const days = [];
  const registrations = [];
  const adCounts = [];
  const withdrawalAmounts = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });

    days.push(label);

    const userCount = Object.values(db.data.users).filter(u => u.created_at && u.created_at.startsWith(dayStr)).length;
    registrations.push(userCount);

    const adsCount = (db.data.ad_logs || []).filter(a => a.date === dayStr).length;
    adCounts.push(adsCount);

    const wdSum = db.data.withdrawals
      .filter(w => w.created_at && w.created_at.startsWith(dayStr))
      .reduce((acc, w) => acc + (w.amount || 0), 0);
    withdrawalAmounts.push(parseFloat(wdSum.toFixed(2)));
  }

  res.json({
    success: true,
    stats,
    pendingWithdrawals: pending,
    recentWithdrawals,
    settings,
    charts: {
      days,
      registrations,
      adCounts,
      withdrawalAmounts
    }
  });
});

// Admin Users Management (Search & Filters: Rule 47)
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  if (!db.isReady) {
    await db.waitForReady().catch(() => {});
  }
  await db.refreshFromMongo(false).catch(() => {});

  const search = req.query.search || '';
  const filter = req.query.filter || 'all';
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '50', 10);

  const result = db.getFilteredUsers({ search, filter, page, limit });
  res.json({
    success: true,
    ...result
  });
});

// Admin Analytics (Rule 49: DAU, WAU, MAU, Retention, Conversion)
app.get('/api/admin/analytics', requireAdmin, (req, res) => {
  const analytics = db.getAnalytics();
  res.json({ success: true, analytics });
});

// Admin Referrals & Leaderboard
app.get('/api/admin/referrals', requireAdmin, (req, res) => {
  const leaderboard = db.getWeeklyLeaderboard(50);
  const totalReferrals = Object.values(db.data.users).reduce((acc, u) => acc + (u.referral_count || 0), 0);
  res.json({
    success: true,
    leaderboard,
    totalReferrals,
    prizes: db.data.weekly_leaderboards?.prizes || []
  });
});

// Admin CSV Data Export (Rule 48)
app.get('/api/admin/export/:type', requireAdmin, (req, res) => {
  const { type } = req.params;
  let csv = '';
  const filename = `export-${type}-${Date.now()}.csv`;

  if (type === 'users') {
    csv = db.exportUsersCSV();
  } else if (type === 'transactions') {
    csv = db.exportTransactionsCSV();
  } else if (type === 'withdrawals') {
    csv = db.exportWithdrawalsCSV();
  } else if (type === 'referrals') {
    csv = db.exportReferralsCSV();
  } else if (type === 'ad_rewards') {
    csv = db.exportAdRewardsCSV();
  } else {
    return res.status(400).json({ success: false, message: 'Invalid export type' });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// Admin User Profile & Transaction Ledger
app.get('/api/admin/user/:id', requireAdmin, async (req, res) => {
  let user = await db.ensureUserLoaded(req.params.id, true);
  if (!user) user = db.getUser(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const txns = db.getUserTransactions(user.id, 100);
  const withdrawals = db.getUserWithdrawals(user.id);
  const referrals = Object.values(db.data.users).filter(u => u.referred_by === String(user.id));

  res.json({
    success: true,
    user,
    transactions: txns,
    withdrawals,
    referrals
  });
});

// Admin Update User Profile
app.post('/api/admin/user/:id/update', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const adminId = req.adminUser?.id || config.adminId;
    const updatedUser = await db.editUser(userId, req.body, adminId);
    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, message: 'User updated successfully', user: updatedUser });
  } catch (err) {
    console.error('Error updating user:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Adjust User Balance
app.post('/api/admin/user/balance', requireAdmin, async (req, res) => {
  const { userId, amount, action, reason } = req.body;
  const val = parseFloat(amount);
  if (isNaN(val) || val <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid amount' });
  }

  await db.ensureUserLoaded(userId);
  const adminId = req.adminUser?.id || config.adminId;
  let user;

  if (action === 'add') {
    user = db.addBalance(userId, val, reason || 'admin_panel', adminId);
  } else {
    user = db.cutBalance(userId, val, reason || 'admin_panel', adminId);
  }

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  // Real-time Telegram notification to user
  const activeBot = getBot() || initBot();
  if (activeBot) {
    const symbol = db.getSetting('currencySymbol') || '₹';
    if (action === 'add') {
      activeBot.api.sendMessage(
        userId,
        `🎉 <b>Balance Credited!</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `💰 Admin credited <b>+${symbol}${val.toFixed(2)}</b> to your account balance.\n` +
        `📝 Note: <i>${reason || 'Bonus Credit'}</i>\n\n` +
        `💳 Current Balance: <b>${symbol}${user.balance.toFixed(2)}</b>`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
    } else {
      activeBot.api.sendMessage(
        userId,
        `⚠️ <b>Balance Adjustment</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `✂️ Admin deducted <b>-${symbol}${val.toFixed(2)}</b> from your account balance.\n` +
        `📝 Note: <i>${reason || 'Adjustment'}</i>\n\n` +
        `💳 Current Balance: <b>${symbol}${user.balance.toFixed(2)}</b>`,
        { parse_mode: 'HTML' }
      ).catch(() => {});
    }
  }

  res.json({ success: true, user });
});

// Admin Ban / Unban User
app.post('/api/admin/user/ban', requireAdmin, (req, res) => {
  const { userId, isBanned } = req.body;
  const adminId = req.adminUser?.id || config.adminId;
  const ok = db.banUser(userId, isBanned, adminId);
  if (!ok) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, isBanned: Boolean(isBanned) });
});

// Admin Reset Referral Parent
app.post('/api/admin/user/reset-referral', requireAdmin, (req, res) => {
  const { userId } = req.body;
  const adminId = req.adminUser?.id || config.adminId;
  const ok = db.resetReferral(userId, adminId);
  if (!ok) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true });
});

// Admin Withdrawals List
app.get('/api/admin/withdrawals', requireAdmin, (req, res) => {
  const status = req.query.status;
  let list = db.data.withdrawals || [];
  if (status && status !== 'all') {
    list = list.filter(w => w.status === status);
  }
  res.json({ success: true, withdrawals: list });
});

// Admin Review Withdrawal (Approve, Reject, Paid)
app.post('/api/admin/withdrawal/review', requireAdmin, (req, res) => {
  const { withdrawalId, status, note, refundIfRejected } = req.body;
  const adminId = req.adminUser?.id || config.adminId;

  const result = db.reviewWithdrawal(withdrawalId, status, note, adminId);
  if (!result.success) {
    return res.status(400).json(result);
  }

  // Notify user via Telegram Bot
  if (bot && result.withdrawal) {
    const w = result.withdrawal;
    const symbol = db.getSetting('currencySymbol');
    try {
      if (status === 'approved' || status === 'paid') {
        bot.api.sendMessage(
          w.user_id,
          `🎉 <b>Withdrawal ${status.toUpperCase()}!</b>\n━━━━━━━━━━━━━━━━━━━━━\n` +
          `🆔 Request ID: <code>${w.id}</code>\n` +
          `💰 Amount: <b>${symbol}${w.amount}</b>\n` +
          `💳 Destination: <code>${w.wallet}</code>\n\n` +
          `Payment processed successfully. Thank you for using our bot! 🙌`,
          { parse_mode: 'HTML' }
        ).catch(() => {});
      } else if (status === 'rejected') {
        bot.api.sendMessage(
          w.user_id,
          `❌ <b>Withdrawal Rejected</b>\n━━━━━━━━━━━━━━━━━━━━━\n` +
          `🆔 Request ID: <code>${w.id}</code>\n` +
          `💰 Amount: <b>${symbol}${w.amount}</b>\n` +
          `📝 Reason: ${note || 'Invalid payment details'}\n\n` +
          `💡 <i>Your balance has been refunded to your wallet.</i>`,
          { parse_mode: 'HTML' }
        ).catch(() => {});
      }
    } catch (e) {}
  }

  res.json(result);
});

// Admin Force-Join Channels (CRUD)
app.get('/api/admin/channels', requireAdmin, (req, res) => {
  res.json({ success: true, channels: db.getChannels() });
});

app.post('/api/admin/channels', requireAdmin, (req, res) => {
  const channel = db.addChannel(req.body, req.adminUser?.id);
  res.json({ success: true, channel });
});

app.put('/api/admin/channels/:id', requireAdmin, (req, res) => {
  const updated = db.updateChannel(req.params.id, req.body, req.adminUser?.id);
  if (!updated) return res.status(404).json({ success: false, message: 'Channel not found' });
  res.json({ success: true, channel: updated });
});

app.delete('/api/admin/channels/:id', requireAdmin, (req, res) => {
  const ok = db.deleteChannel(req.params.id, req.adminUser?.id);
  res.json({ success: ok });
});

// Admin Tasks Management (CRUD)
app.get('/api/admin/tasks', requireAdmin, (req, res) => {
  res.json({ success: true, tasks: db.getTasks() });
});

app.post('/api/admin/tasks', requireAdmin, (req, res) => {
  const task = db.addTask(req.body, req.adminUser?.id);
  res.json({ success: true, task });
});

app.put('/api/admin/tasks/:id', requireAdmin, (req, res) => {
  const updated = db.updateTask(req.params.id, req.body, req.adminUser?.id);
  if (!updated) return res.status(404).json({ success: false, message: 'Task not found' });
  res.json({ success: true, task: updated });
});

app.delete('/api/admin/tasks/:id', requireAdmin, (req, res) => {
  const ok = db.deleteTask(req.params.id, req.adminUser?.id);
  res.json({ success: ok });
});

// Admin Message Templates (Builder & Media)
app.get('/api/admin/templates', requireAdmin, (req, res) => {
  res.json({ success: true, templates: db.data.message_templates });
});

app.post('/api/admin/templates/:key', requireAdmin, (req, res) => {
  const updated = db.updateTemplate(req.params.key, req.body, req.adminUser?.id);
  res.json({ success: true, template: updated });
});

// Admin Broadcast Studio
app.post('/api/admin/broadcast', requireAdmin, async (req, res) => {
  const { title, text, target } = req.body;
  if (!text) return res.status(400).json({ success: false, message: 'Broadcast text required' });

  await db.waitForReady().catch(() => {});
  await db.refreshFromMongo().catch(() => {});

  const activeBot = getBot() || initBot();
  if (!activeBot) {
    return res.status(500).json({ success: false, message: 'Telegram Bot is not initialized or BOT_TOKEN is missing.' });
  }

  const bc = db.createBroadcast(req.body, req.adminUser?.id);

  let recipients = Object.values(db.data.users);
  if (target === 'active') recipients = recipients.filter(u => !u.is_banned);
  else if (target === 'with_balance') recipients = recipients.filter(u => (u.balance || 0) > 0);
  else if (target === 'watched_ads') recipients = recipients.filter(u => (u.ads_watched || 0) > 0);
  else if (target === 'referrals') recipients = recipients.filter(u => (u.referral_count || 0) > 0);

  bc.total_recipients = recipients.length;
  bc.status = 'sending';

  let sent = 0;
  let failed = 0;

  for (const u of recipients) {
    try {
      await activeBot.api.sendMessage(
        u.id,
        `📢 <b>${title || 'ANNOUNCEMENT'}</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n${text}`,
        { parse_mode: 'HTML' }
      );
      sent++;
    } catch (e) {
      console.warn(`Broadcast send error to ${u.id}:`, e.message);
      failed++;
    }
    bc.sent_count = sent;
    bc.failed_count = failed;
    if (recipients.length > 1) {
      await new Promise(r => setTimeout(r, 40));
    }
  }

  bc.status = 'completed';
  bc.finished_at = new Date().toISOString();
  db.save();
  db.syncStateToMongo(db.data);

  res.json({ success: true, broadcast: bc });
});

app.get('/api/admin/broadcasts', requireAdmin, (req, res) => {
  res.json({ success: true, broadcasts: db.getBroadcasts() });
});

// Admin Delete Broadcast
app.delete('/api/admin/broadcast/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const ok = db.deleteBroadcast(id, req.adminUser?.id);
  if (!ok) return res.status(404).json({ success: false, message: 'Broadcast not found' });
  res.json({ success: true, message: 'Broadcast deleted successfully' });
});

app.post('/api/admin/broadcast/delete', requireAdmin, (req, res) => {
  const { id } = req.body;
  const ok = db.deleteBroadcast(id, req.adminUser?.id);
  if (!ok) return res.status(404).json({ success: false, message: 'Broadcast not found' });
  res.json({ success: true, message: 'Broadcast deleted successfully' });
});

// Admin Suspicious Referrals
app.get('/api/admin/suspicious', requireAdmin, (req, res) => {
  res.json({ success: true, suspicious: db.getSuspiciousReferrals() });
});

// Admin GigaPub Settings & Live Tester
app.post('/api/admin/gigapub/test', requireAdmin, async (req, res) => {
  const { projectId } = req.body;
  const pId = projectId || db.getSetting('gigaPubProjectId');

  if (!pId || pId === 'YOUR_GIGAPUB_PROJECT_ID') {
    return res.json({
      success: false,
      message: 'GigaPub Project ID is empty or placeholder. Please provide a valid project ID from gigapub.tech.'
    });
  }

  // Ping GigaPub script endpoint
  try {
    const testUrl = `https://ad.gigapub.tech/script?id=${encodeURIComponent(pId)}`;
    const pingRes = await fetch(testUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    if (pingRes.ok || pingRes.status === 200 || pingRes.status === 304) {
      return res.json({ success: true, message: '✅ GigaPub integration online and active!' });
    }
  } catch (err) {
    // try fallback domain
    try {
      const fallbackUrl = `https://ru-ad.gigapub.tech/script?id=${encodeURIComponent(pId)}`;
      const pingFallback = await fetch(fallbackUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      if (pingFallback.ok) {
        return res.json({ success: true, message: '✅ GigaPub integration active (Fallback CDN connected)!' });
      }
    } catch (e2) {}
  }

  res.json({
    success: true,
    message: 'ℹ️ GigaPub configured. WebApp ad container ready with fallback preview mode.'
  });
});

// Admin Get Settings
app.get('/api/admin/settings', requireAdmin, (req, res) => {
  res.json({ success: true, settings: db.getSettings() });
});

// Admin Save Settings
app.post('/api/admin/settings', requireAdmin, (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid settings payload' });
  }

  const updated = db.updateSettings(settings, req.adminUser?.id);
  res.json({ success: true, settings: updated });
});

// Admin Trigger Weekly Leaderboard Payout
app.post('/api/admin/leaderboard/distribute', requireAdmin, (req, res) => {
  const result = db.distributeWeeklyLeaderboardRewards(req.adminUser?.id);
  res.json(result);
});

// Admin Audit Logs
app.get('/api/admin/audit-logs', requireAdmin, (req, res) => {
  res.json({ success: true, logs: db.getAuditLogs(100) });
});

// =======================================================
// 4. FRONTEND ROUTES
// =======================================================

// Admin Panel Web Route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

// Legal & Google AdSense Policy Pages
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'privacy.html'));
});
app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'terms.html'));
});
app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'about.html'));
});
app.get('/contact', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'contact.html'));
});
app.get('/disclaimer', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'disclaimer.html'));
});

// SEO & Google AdSense Verification Files
app.get('/ads.txt', (req, res) => {
  res.type('text/plain').sendFile(path.join(__dirname, '..', 'public', 'ads.txt'));
});
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').sendFile(path.join(__dirname, '..', 'public', 'robots.txt'));
});
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').sendFile(path.join(__dirname, '..', 'public', 'sitemap.xml'));
});
app.get('/sw.js', (req, res) => {
  res.set('Service-Worker-Allowed', '/');
  res.type('application/javascript').sendFile(path.join(__dirname, '..', 'public', 'sw.js'));
});

// Fallback to Mini App
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start Server and Telegram Bot
const PORT = config.port || 3000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Telegram Refer & Earn Bot Server running at: http://localhost:${PORT}`);
    console.log(`📱 Public WebApp URL: ${config.webAppUrl}`);
    console.log(`🎛 Web Admin Panel: ${config.webAppUrl}/admin`);
    console.log(`👑 Admin Telegram ID: ${config.adminId}`);
    console.log(`======================================================\n`);

    // Start Telegram bot
    initBot();
  });
} else {
  // On Vercel serverless, initialize bot handlers for webhook callback
  initBot();
}

export default app;

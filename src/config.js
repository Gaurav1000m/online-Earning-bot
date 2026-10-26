import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

export const config = {
  // Bot & Server
  botToken: process.env.BOT_TOKEN || '',
  adminId: String(process.env.ADMIN_ID || '6656939308').trim(),
  adminSecret: process.env.ADMIN_SECRET || 'admin123456',
  port: parseInt(process.env.PORT || '3000', 10),
  webAppUrl: (process.env.WEBAPP_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  botUsername: (process.env.BOT_USERNAME || '').replace(/^@/, '').trim(),
  supportUsername: (process.env.SUPPORT_USERNAME || 'gaurav_tnwr00').replace(/^@/, '').trim(),

  // GigaPub Ads
  gigaPubProjectId: process.env.GIGAPUB_PROJECT_ID || 'YOUR_GIGAPUB_PROJECT_ID',
  gigaPubApiKey: process.env.GIGAPUB_API_KEY || '',
  gigaPubAppId: process.env.GIGAPUB_APP_ID || '',

  // Channel Verification (legacy fallback)
  channelUsername: (process.env.CHANNEL_USERNAME || '').trim(),
  channelUrl: (process.env.CHANNEL_URL || '').trim(),

  // Economy & Rewards
  currencyName: process.env.CURRENCY_NAME || 'Points',
  currencySymbol: process.env.CURRENCY_SYMBOL || '₹',
  pointsPerInr: parseFloat(process.env.POINTS_PER_INR || '1'),

  referralReward: parseFloat(process.env.REFERRAL_REWARD || '1.0'),
  dailyBonus: parseFloat(process.env.DAILY_BONUS || '0.5'),
  adReward: parseFloat(process.env.AD_REWARD || '0.2'),

  minWithdrawal: parseFloat(process.env.MIN_WITHDRAWAL || '10.0'),
  maxWithdrawal: parseFloat(process.env.MAX_WITHDRAWAL || '1000.0'),

  adCooldownSeconds: parseInt(process.env.AD_COOLDOWN_SECONDS || '30', 10),
  dailyAdLimit: parseInt(process.env.DAILY_AD_LIMIT || '30', 10),
  maxDailyAdEarnings: parseFloat(process.env.MAX_DAILY_AD_EARNINGS || '5.0'),

  maintenanceMode: process.env.MAINTENANCE_MODE === 'true'
};

export default config;

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const rawToken = (process.env.BOT_TOKEN || '').trim();
const botToken = (rawToken && rawToken.includes(':') && !rawToken.includes('YOUR_'))
  ? rawToken
  : '7651918317:AAH1zEwWXZQxJFrkJ9rZ3Q86fubk8ODMmnw';

const rawGiga = (process.env.GIGAPUB_PROJECT_ID || '').trim();
const gigaPubProjectId = (rawGiga && !rawGiga.includes('YOUR_') && rawGiga !== '')
  ? rawGiga
  : '8839';

export const config = {
  // Bot & Server
  botToken,
  adminId: String(process.env.ADMIN_ID || '6656939308').trim(),
  adminSecret: process.env.ADMIN_SECRET || 'admin123456',
  port: parseInt(process.env.PORT || '3000', 10),
  webAppUrl: (process.env.WEBAPP_URL || 'https://onlineearning-inky.vercel.app').replace(/\/+$/, ''),
  botUsername: (process.env.BOT_USERNAME || 'easyandfastearn_bot').replace(/^@/, '').trim(),
  supportUsername: (process.env.SUPPORT_USERNAME || 'gaurav_tnwr00').replace(/^@/, '').trim(),

  // GigaPub Ads
  gigaPubProjectId,
  gigaPubApiKey: process.env.GIGAPUB_API_KEY || '',
  gigaPubAppId: process.env.GIGAPUB_APP_ID || '',

  // Channel Verification (Default: https://t.me/allinonemodz4u)
  channelUsername: (process.env.CHANNEL_USERNAME || '@allinonemodz4u').trim(),
  channelUrl: (process.env.CHANNEL_URL || 'https://t.me/allinonemodz4u').trim(),

  // Economy & Rewards
  currencyName: process.env.CURRENCY_NAME || '₹',
  currencySymbol: process.env.CURRENCY_SYMBOL || '₹',
  pointsPerInr: parseFloat(process.env.POINTS_PER_INR || '1'),

  referralReward: parseFloat(process.env.REFERRAL_REWARD || '20.0'),
  dailyBonus: parseFloat(process.env.DAILY_BONUS || '0.5'),
  adReward: parseFloat(process.env.AD_REWARD || '5.0'),

  minWithdrawal: parseFloat(process.env.MIN_WITHDRAWAL || '500.0'),
  maxWithdrawal: parseFloat(process.env.MAX_WITHDRAWAL || '10000.0'),

  adCooldownSeconds: parseInt(process.env.AD_COOLDOWN_SECONDS || '20', 10),
  dailyAdLimit: parseInt(process.env.DAILY_AD_LIMIT || '0', 10),
  maxDailyAdEarnings: parseFloat(process.env.MAX_DAILY_AD_EARNINGS || '25.0'),

  // LibTL / Monetag Ads & Direct Links
  libtlZoneId: process.env.LIBTL_ZONE_ID || '12128125',
  adDirectLinks: [
    process.env.AD_DIRECT_LINK_1 || 'https://uplcm.com/4/11717959',
    process.env.AD_DIRECT_LINK_2 || 'https://uplcm.com/4/11717884'
  ],

  // Adsterra SmartLink for High Revenue
  adsterraSmartLink: process.env.ADSTERRA_SMARTLINK || 'https://arwf.org/4/ef8f2a6df3e5243a89a484add434af25',

  // MongoDB Atlas Cloud Persistence (for Vercel & permanent cloud storage)
  mongodbUri: (process.env.MONGODB_URI || '').trim(),

  maintenanceMode: process.env.MAINTENANCE_MODE === 'true'
};

export default config;

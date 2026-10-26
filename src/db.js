import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import config from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.VERCEL ? '/tmp/data' : path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Seed on Vercel from repository snapshot if available
if (process.env.VERCEL && !fs.existsSync(DB_PATH)) {
  const seedFile = path.join(__dirname, '..', 'data', 'database.json');
  if (fs.existsSync(seedFile)) {
    try {
      fs.copyFileSync(seedFile, DB_PATH);
    } catch (_) {}
  }
}

export const DEFAULT_TEMPLATES = {
  START_MESSAGE: {
    text: `👋 <b>Welcome, {{first_name}}!</b>\n\n🌟 Welcome to the <b>Refer & Earn Bot</b>.\n\n💡 <b>How to Earn:</b>\n• 👥 <b>Refer Friends:</b> Earn <b>{{currency_symbol}}{{referral_reward}}</b> per valid invite\n• 🎬 <b>Watch Ads:</b> Earn <b>{{currency_symbol}}{{ad_reward}}</b> per ad\n• 🎁 <b>Daily Bonus:</b> Streak rewards up to <b>{{currency_symbol}}35</b>\n• 📋 <b>Tasks:</b> High-reward social tasks\n• 💸 <b>Instant Withdrawal:</b> Fast payouts to UPI, PayPal & Bank\n\n👇 <i>Choose an option from the menu below to start earning!</i>`,
    media_type: 'none',
    media_url: '',
    inline_buttons: [
      [{ text: '🚀 Open Mini App', web_app: true, url: '' }],
      [{ text: '👥 Invite Friends', url: 'https://t.me/share/url?url={{referral_link}}&text=Join+and+earn+cash!' }]
    ]
  },
  FORCE_JOIN_MESSAGE: {
    text: `🔒 <b>Access Restricted</b>\n━━━━━━━━━━━━━━━━━━━━━\n⚠️ <b>You must join all our channels</b>\nto unlock bot features.\n\n📢 <b>Subscribe to every channel</b>\nusing the buttons below.\n\n✅ <b>After joining all channels,</b>\ntap the Verify Membership button.`,
    media_type: 'none',
    media_url: '',
    inline_buttons: []
  },
  VERIFICATION_SUCCESS: {
    text: `🎉 <b>Verification Successful!</b>\n\nYou now have full access to the bot. Happy earning! 🚀`,
    media_type: 'none',
    media_url: '',
    inline_buttons: []
  },
  VERIFY_FAILED: {
    text: `❌ <b>Verification Failed</b>\n\nYou haven't joined all required channels yet.\nPlease join every channel and try again.`,
    media_type: 'none',
    media_url: '',
    inline_buttons: []
  },
  BALANCE_MESSAGE: {
    text: `╔══════════════════╗\n💰 <b>YOUR BALANCE</b>\n╚══════════════════╝\n\n💵 <b>Balance:</b> {{currency_symbol}}{{balance}}\n👥 <b>Referrals:</b> {{referrals}}\n🎬 <b>Ads Watched:</b> {{ads_watched}}\n🎁 <b>Daily Bonuses:</b> {{bonuses_claimed}}\n🏆 <b>Weekly Rank:</b> #{{weekly_rank}}\n\n━━━━━━━━━━━━━━━━━━\n🚀 <i>Keep earning and grow your balance!</i>`,
    media_type: 'none',
    media_url: '',
    inline_buttons: []
  },
  REFERRAL_MESSAGE: {
    text: `{{referral_link}}\nMaine iss bot se ₹ {{sender_balance}} kamaye. Aap bhi try karein.\n\n━━━━━━━━━━━━━━━━━━\n👥 <b>INVITE & EARN</b>\n💰 <b>Reward:</b> {{currency_symbol}}{{referral_reward}} per referral\n👥 <b>Your Referrals:</b> {{referrals}}\n💵 <b>Referral Earnings:</b> {{currency_symbol}}{{referral_earnings}}\n🏆 <b>Weekly Rank:</b> #{{weekly_rank}}`,
    media_type: 'none',
    media_url: '',
    inline_buttons: []
  },
  WATCH_AD_MESSAGE: {
    text: `🎬 <b>Watch Ads & Earn</b>\n\nWatch an advertisement and earn {{currency_symbol}}{{ad_reward}} for each completed ad. Reward is credited once you finish and close (❌) the ad. You can watch {{daily_ad_limit_text}} per day.\n\n📊 <b>Total ads watched:</b> {{total_ads_watched}}\n👀 <b>Ads watched today:</b> {{ads_today_display}}\n\nTap below to open the ad👇`,
    media_type: 'none',
    media_url: '',
    inline_buttons: []
  },
  AD_SUCCESS_MESSAGE: {
    text: `✅ <b>Ad completed!</b> {{currency_symbol}}{{ad_reward}} was added to your balance.\n\n💰 <b>Balance:</b> {{balance}}\n📅 <b>Ads watched today:</b> {{ads_today_display}}`,
    media_type: 'none',
    media_url: '',
    inline_buttons: []
  },
  AD_LIMIT_MESSAGE: {
    text: `🚫 <b>DAILY LIMIT REACHED</b>\n\nYou have watched all available ads for today.\n📺 <b>Ads watched:</b> {{ads_today}} / {{daily_ad_limit}}\n⏰ Come back tomorrow for more rewards!`,
    media_type: 'none',
    media_url: '',
    inline_buttons: []
  },
  WITHDRAW_MESSAGE: {
    text: `💸 <b>WITHDRAWAL</b>\n━━━━━━━━━━━━━━━━━━\n\n💰 <b>Available Balance:</b> {{currency_symbol}}{{balance}}\n\nSelect your withdrawal method below:`,
    media_type: 'none',
    media_url: '',
    inline_buttons: []
  },
  WITHDRAW_SUCCESS: {
    text: `⏳ <b>WITHDRAWAL REQUESTED</b>\n━━━━━━━━━━━━━━━━━━\n\n💰 <b>Amount:</b> {{currency_symbol}}{{withdrawal_amount}}\n💳 <b>Method:</b> {{withdrawal_method}}\n🆔 <b>Request ID:</b> <code>{{withdrawal_id}}</code>\n📌 <b>Status:</b> Pending\n\nOur admin team will review and process your request.`,
    media_type: 'none',
    media_url: '',
    inline_buttons: []
  },
  WITHDRAW_REJECTED: {
    text: `❌ <b>Withdrawal Rejected</b>\n\n🆔 Request ID: <code>{{withdrawal_id}}</code>\n💰 Amount: {{currency_symbol}}{{withdrawal_amount}}\n💡 <i>Your balance has been refunded to your wallet.</i>`,
    media_type: 'none',
    media_url: '',
    inline_buttons: []
  },
  BONUS_MESSAGE: {
    text: `╔══════════════════╗\n🎁 <b>DAILY BONUS</b>\n╚══════════════════╝\n\n🎉 Congratulations!\nYour daily bonus is waiting:\n💰 <b>+{{currency_symbol}}{{daily_bonus}}</b>\n\nClaim your bonus and keep earning every day! 🚀`,
    media_type: 'none',
    media_url: '',
    inline_buttons: []
  },
  BONUS_ALREADY_CLAIMED: {
    text: `⏰ <b>BONUS ALREADY CLAIMED</b>\n\nYou have already received today's bonus.\n💰 <b>Today's bonus:</b> {{currency_symbol}}{{daily_bonus}}\n🎁 Come back tomorrow!\nNext available: in {{wait_time}}`,
    media_type: 'none',
    media_url: '',
    inline_buttons: []
  },
  TASK_MESSAGE: {
    text: `📋 <b>Task #{{task_index}}</b>\n\n📌 <b>{{task_title}}</b>\n\n💰 <b>Reward:</b> {{currency_symbol}}{{task_reward}}\n\n{{task_description}}\nafter that click Joined ☑️ button to verify and continue.\n\n⚠️ <b>Important:</b> Task will be checked and reviewed by our team carefully. Only real and verified completions will be rewarded.\n\n📊 <b>Progress:</b> {{progress_text}}`,
    media_type: 'none',
    media_url: '',
    inline_buttons: []
  },
  LEADERBOARD_MESSAGE: {
    text: `🏆 <b>WEEKLY LEADERBOARD</b>\n━━━━━━━━━━━━━━━━━━\n\n{{leaderboard_rows}}\n\n━━━━━━━━━━━━━━━━━━\nYour current rank: 🏆 <b>#{{weekly_rank}}</b> ({{weekly_referrals}} invites)\n\nPrizes are paid automatically at the end of the week!`,
    media_type: 'none',
    media_url: '',
    inline_buttons: [
      [{ text: '👥 Invite More Friends', callback_data: 'menu_refer' }]
    ]
  },
  ERROR_MESSAGE: {
    text: `⚠️ <b>Something went wrong.</b>\n\nPlease try again in a few seconds.`,
    media_type: 'none',
    media_url: '',
    inline_buttons: []
  },
  MAINTENANCE_MESSAGE: {
    text: `🚧 <b>BOT UNDER MAINTENANCE</b>\n━━━━━━━━━━━━━━━━━━━━━\n\nWe're currently performing scheduled maintenance to improve our systems.\n\nPlease check back shortly! Thank you for your patience. ❤️`,
    media_type: 'none',
    media_url: '',
    inline_buttons: []
  }
};

const DEFAULT_STATE = {
  users: {},
  wallet_transactions: [],
  withdrawals: [],
  channels: [
    {
      id: 'chan_allinonemodz',
      name: 'All in One Modz',
      username: '@allinonemodz4u',
      channel_id: '-1004390905200',
      invite_url: 'https://t.me/allinonemodz4u',
      button_label: '📢 Join All in One Modz',
      is_enabled: true,
      order: 1
    }
  ],
  tasks: [
    {
      id: 'task_join_allinonemodz',
      title: 'Join Telegram Channel',
      description: 'Join Telegram Channel 📢 and earn ₹5.00 extra rewards,',
      reward: 5.00,
      task_type: 'channel_join',
      target_url: 'https://t.me/allinonemodz4u',
      chat_id: '@allinonemodz4u',
      icon: '📢',
      is_active: true,
      max_completions: 100000,
      completions_count: 0
    },
    {
      id: 'task_join_channel_2',
      title: 'Join Partner Channel',
      description: 'Join Telegram Channel 📢 and earn ₹5.00 extra rewards,',
      reward: 5.00,
      task_type: 'channel_join',
      target_url: 'https://t.me/studywithgaurav0',
      chat_id: '@studywithgaurav0',
      icon: '📢',
      is_active: true,
      max_completions: 100000,
      completions_count: 0
    }
  ],
  task_completions: [],
  ad_sessions: {},
  ad_logs: [],
  bonuses: {
    daily_ladder: [5, 10, 15, 20, 25, 30, 35],
    welcome_bonus: 0.00,
    streak_bonus: 0.00
  },
  message_templates: DEFAULT_TEMPLATES,
  broadcasts: [],
  weekly_leaderboards: {
    current_week_start: new Date().toISOString(),
    prizes: [
      { rank: 1, prize: 50 },
      { rank: 2, prize: 30 },
      { rank: 3, prize: 20 },
      { ranks: '4-10', prize: 10 },
      { ranks: '11-20', prize: 5 }
    ],
    history: []
  },
  audit_logs: [],
  admins: [
    {
      id: config.adminId,
      role: 'SUPER_ADMIN',
      name: 'Primary Admin'
    }
  ],
  settings: {
    botName: 'Refer & Earn Bot',
    botUsername: config.botUsername,
    currencySymbol: config.currencySymbol,
    currencyName: config.currencyName,
    decimalPrecision: 2,
    pointsPerInr: config.pointsPerInr,

    referralReward: config.referralReward,
    dailyBonus: config.dailyBonus,
    adReward: config.adReward,

    minWithdrawal: config.minWithdrawal,
    maxWithdrawal: config.maxWithdrawal,

    adCooldownSeconds: config.adCooldownSeconds,
    dailyAdLimit: config.dailyAdLimit,
    maxDailyAdEarnings: config.maxDailyAdEarnings,

    gigaPubEnabled: true,
    gigaPubProjectId: config.gigaPubProjectId,
    gigaPubApiKey: config.gigaPubApiKey,
    gigaPubAppId: config.gigaPubAppId,

    supportUsername: config.supportUsername,
    maintenanceMode: config.maintenanceMode,
    refundOnReject: true,

    // Button Labels matching exact required Reply Keyboard
    btn_balance: '💰 My Balance',
    btn_withdraw: '💸 Withdraw',
    btn_ads: '🎬 Watch Ads',
    btn_refer: '👥 Invite Friends',
    btn_bonus: '🎁 Bonus',
    btn_tasks: '📋 Tasks',

    withdraw_methods: {
      upi: true,
      paypal: true,
      bank: true
    }
  }
};

class Database {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        const parsed = JSON.parse(raw);

        const state = {
          users: parsed.users || {},
          wallet_transactions: parsed.wallet_transactions || [],
          withdrawals: parsed.withdrawals || [],
          channels: parsed.channels && parsed.channels.length ? parsed.channels : DEFAULT_STATE.channels,
          tasks: parsed.tasks && parsed.tasks.length ? parsed.tasks : DEFAULT_STATE.tasks,
          task_completions: parsed.task_completions || [],
          ad_sessions: parsed.ad_sessions || {},
          ad_logs: parsed.ad_logs || [],
          bonuses: { ...DEFAULT_STATE.bonuses, ...(parsed.bonuses || {}) },
          message_templates: { ...DEFAULT_TEMPLATES, ...(parsed.message_templates || {}) },
          broadcasts: parsed.broadcasts || [],
          weekly_leaderboards: { ...DEFAULT_STATE.weekly_leaderboards, ...(parsed.weekly_leaderboards || {}) },
          audit_logs: parsed.audit_logs || [],
          admins: parsed.admins && parsed.admins.length ? parsed.admins : DEFAULT_STATE.admins,
          settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) }
        };

        // Ensure new requested templates are active
        if (!state.message_templates.FORCE_JOIN_MESSAGE || state.message_templates.FORCE_JOIN_MESSAGE.text.includes('JOIN REQUIRED CHANNELS')) {
          state.message_templates.FORCE_JOIN_MESSAGE = DEFAULT_TEMPLATES.FORCE_JOIN_MESSAGE;
        }
        if (!state.message_templates.WATCH_AD_MESSAGE || !state.message_templates.WATCH_AD_MESSAGE.text.includes('close (❌) the ad')) {
          state.message_templates.WATCH_AD_MESSAGE = DEFAULT_TEMPLATES.WATCH_AD_MESSAGE;
        }
        if (!state.message_templates.AD_SUCCESS_MESSAGE || state.message_templates.AD_SUCCESS_MESSAGE.text.includes('🎉 You earned') || state.message_templates.AD_SUCCESS_MESSAGE.text.includes('{{ads_today}}/{{daily_ad_limit}}')) {
          state.message_templates.AD_SUCCESS_MESSAGE = DEFAULT_TEMPLATES.AD_SUCCESS_MESSAGE;
        }
        if (!state.message_templates.START_MESSAGE || state.message_templates.START_MESSAGE.text.includes('0.50')) {
          state.message_templates.START_MESSAGE = DEFAULT_TEMPLATES.START_MESSAGE;
        }
        if (!state.message_templates.TASK_MESSAGE || state.message_templates.TASK_MESSAGE.text.includes('Select a task below')) {
          state.message_templates.TASK_MESSAGE = DEFAULT_TEMPLATES.TASK_MESSAGE;
        }

        // Guarantee button label is exactly "🎁 Bonus"
        if (state.settings.btn_bonus === '🎁 Bonus System') {
          state.settings.btn_bonus = '🎁 Bonus';
        }

        // Apply updated daily bonus streak ladder [5, 10, 15, 20, 25, 30, 35]
        if (!state.bonuses) state.bonuses = {};
        state.bonuses.daily_ladder = [5, 10, 15, 20, 25, 30, 35];

        // Ensure tasks reward is updated to ₹5.00 per task
        if (Array.isArray(state.tasks)) {
          state.tasks.forEach(t => {
            if (t.reward < 5.0) t.reward = 5.0;
            if (t.description && t.description.includes('0.5$')) {
              t.description = t.description.replace('0.5$', '₹5.00');
            }
          });
        }

        // Apply updated referral message template
        if (!state.message_templates) state.message_templates = {};
        state.message_templates.REFERRAL_MESSAGE = DEFAULT_TEMPLATES.REFERRAL_MESSAGE;

        // Apply environment economy settings
        state.settings.referralReward = config.referralReward;
        state.settings.adReward = config.adReward;
        state.settings.minWithdrawal = config.minWithdrawal;
        state.settings.dailyAdLimit = config.dailyAdLimit;
        state.settings.currencySymbol = config.currencySymbol;
        state.settings.currencyName = config.currencyName;
        state.settings.adCooldownSeconds = config.adCooldownSeconds;

        return state;
      }
    } catch (err) {
      console.error('Error loading database, initializing default schema:', err);
    }

    const initial = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.save(initial);
    return initial;
  }

  save(dataToSave = this.data) {
    try {
      const tempPath = `${DB_PATH}.tmp.${Date.now()}.${Math.random().toString(36).substring(7)}`;
      fs.writeFileSync(tempPath, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_PATH);
    } catch (err) {
      console.error('CRITICAL: Failed to atomic-save database:', err);
    }
  }

  getTodayString() {
    return new Date().toISOString().split('T')[0];
  }

  // =======================================================
  // 1. WALLET LEDGER & ATOMIC IDEMPOTENT TRANSACTIONS (Rule 45)
  // =======================================================

  recordTransaction({ userId, amount, type, referenceId = '', description = '' }) {
    const id = String(userId);
    const user = this.getUser(id);
    if (!user) return null;

    // Idempotency check: prevent duplicate reward/processing for same referenceId & user
    if (referenceId && this.data.wallet_transactions.some(t => t.reference_id === String(referenceId) && t.user_id === id)) {
      console.warn(`[IDEMPOTENCY BLOCKED] Duplicate transaction detected: ${referenceId} for user ${id}`);
      return { duplicate: true, message: 'Event has already been processed and rewarded' };
    }

    const numAmount = parseFloat(amount);
    const balanceBefore = user.balance || 0;
    const balanceAfter = parseFloat(Math.max(0, balanceBefore + numAmount).toFixed(2));

    const txn = {
      id: `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      user_id: id,
      amount: numAmount,
      type, // REFERRAL_REWARD, AD_REWARD, BONUS_REWARD, TASK_REWARD, ADMIN_CREDIT, ADMIN_DEBIT, WITHDRAWAL_HOLD, WITHDRAWAL_REFUND, LEADERBOARD_REWARD
      reference_id: String(referenceId || `REF-${Date.now()}`),
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      timestamp: Date.now(),
      created_at: new Date().toISOString(),
      description
    };

    user.balance = balanceAfter;
    if (numAmount > 0 && !['WITHDRAWAL_REFUND'].includes(type)) {
      user.lifetime_earnings = parseFloat(((user.lifetime_earnings || 0) + numAmount).toFixed(2));
      user.total_earned = user.lifetime_earnings;
    }

    this.data.wallet_transactions.unshift(txn);
    if (this.data.wallet_transactions.length > 10000) {
      this.data.wallet_transactions.splice(10000);
    }

    this.save();
    return txn;
  }

  getUserTransactions(userId, limit = 50) {
    const id = String(userId);
    return this.data.wallet_transactions
      .filter(t => t.user_id === id)
      .slice(0, limit);
  }

  // =======================================================
  // 2. USER OPERATIONS & REFERRAL SYSTEM (Rule 44)
  // =======================================================

  getUser(userId) {
    if (!userId) return null;
    return this.data.users[String(userId)] || null;
  }

  getOrCreateUser(tgUser, referrerParam = null, ip = '') {
    const id = String(tgUser.id);
    const today = this.getTodayString();

    if (!this.data.users[id]) {
      const referralCode = `ref_${id}`;

      let referredBy = null;
      let validReferral = false;

      // Anti-self-referral and valid referrer check
      if (referrerParam) {
        const cleanRef = String(referrerParam).replace(/^ref_/, '').trim();
        if (cleanRef !== id && this.data.users[cleanRef]) {
          const parent = this.data.users[cleanRef];
          if (!parent.is_banned) {
            referredBy = cleanRef;
            validReferral = true;
          }
        }
      }

      const newUser = {
        id,
        first_name: tgUser.first_name || 'Anonymous',
        last_name: tgUser.last_name || '',
        username: tgUser.username ? tgUser.username.replace(/^@/, '') : '',
        language_code: tgUser.language_code || 'en',
        balance: 0,
        total_earned: 0,
        lifetime_earnings: 0,
        total_withdrawn: 0,
        lifetime_withdrawals: 0,
        wallet: '',
        wallet_upi: '',
        wallet_paypal: '',
        wallet_bank: null,
        referral_code: referralCode,
        referred_by: referredBy,
        referral_count: 0,
        weekly_referrals: 0,
        referral_status: validReferral ? 'pending_verification' : 'direct',
        referral_reward_status: validReferral ? 'pending_verification' : 'none',
        ads_watched: 0,
        ads_today: 0,
        ads_today_date: today,
        last_ad_timestamp: 0,
        daily_streak: 0,
        last_daily_bonus: 0,
        bonuses_claimed: 0,
        tasks_completed: 0,
        is_banned: false,
        ip: ip || '',
        created_at: new Date().toISOString(),
        last_active: new Date().toISOString(),
        admin_notes: ''
      };

      this.data.users[id] = newUser;
      this.save();

      // Rule 44: If there are 0 required force-join channels enabled, qualify immediately!
      const enabledChannels = this.getEnabledChannels();
      if (enabledChannels.length === 0 && validReferral) {
        this.qualifyReferral(id);
      }

      return { user: newUser, isNew: true, referrerId: referredBy };
    }

    // Refresh existing user info
    const user = this.data.users[id];
    let changed = false;

    if (tgUser.first_name && user.first_name !== tgUser.first_name) {
      user.first_name = tgUser.first_name;
      changed = true;
    }
    if (tgUser.username && user.username !== tgUser.username.replace(/^@/, '')) {
      user.username = tgUser.username.replace(/^@/, '');
      changed = true;
    }
    user.last_active = new Date().toISOString();

    if (user.ads_today_date !== today) {
      user.ads_today = 0;
      user.ads_today_date = today;
      changed = true;
    }

    if (changed) {
      this.save();
    }

    return { user, isNew: false, referrerId: user.referred_by };
  }

  /**
   * Qualifies referral reward upon successful force-join verification (Rule 44)
   */
  qualifyReferral(userId) {
    const id = String(userId);
    const user = this.getUser(id);
    if (!user || !user.referred_by) return { rewarded: false };

    // Prevent duplicate reward
    if (user.referral_reward_status === 'rewarded') {
      return { rewarded: false, reason: 'Already rewarded' };
    }

    const referrer = this.getUser(user.referred_by);
    if (!referrer || referrer.is_banned || String(referrer.id) === id) {
      return { rewarded: false, reason: 'Invalid referrer' };
    }

    const refReward = this.getSetting('referralReward');
    const refEventId = `REF-${referrer.id}-${id}-${Date.now()}`;

    // Mark user status
    user.referral_reward_status = 'rewarded';
    user.referral_status = 'active';

    referrer.referral_count = (referrer.referral_count || 0) + 1;
    referrer.weekly_referrals = (referrer.weekly_referrals || 0) + 1;

    // Credit referrer with idempotent transaction
    const txn = this.recordTransaction({
      userId: referrer.id,
      amount: refReward,
      type: 'REFERRAL_REWARD',
      referenceId: refEventId,
      description: `Referral reward for verified invite: ${user.first_name} (@${user.username || id})`
    });

    this.save();

    return {
      rewarded: true,
      referrerId: referrer.id,
      referrerName: referrer.first_name,
      reward: refReward,
      newBalance: referrer.balance,
      newUser: user,
      transaction: txn
    };
  }

  updateUser(userId, updates) {
    const id = String(userId);
    if (!this.data.users[id]) return null;
    this.data.users[id] = { ...this.data.users[id], ...updates, last_active: new Date().toISOString() };
    this.save();
    return this.data.users[id];
  }

  setWallet(userId, { method = 'upi', details }) {
    const user = this.getUser(userId);
    if (!user) return null;

    if (method === 'upi') {
      user.wallet_upi = String(details).trim();
      user.wallet = user.wallet_upi;
    } else if (method === 'paypal') {
      user.wallet_paypal = String(details).trim();
      user.wallet = user.wallet_paypal;
    } else if (method === 'bank') {
      user.wallet_bank = details;
      user.wallet = `${details.bank_name || 'Bank'} A/C: ${details.account_number || ''}`;
    }

    this.save();
    return user;
  }

  addBalance(userId, amount, reason = 'admin_credit', adminId = 'ADMIN') {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return null;

    const refEventId = `ADMIN-CREDIT-${userId}-${Date.now()}`;
    this.recordTransaction({
      userId,
      amount: val,
      type: 'ADMIN_CREDIT',
      referenceId: refEventId,
      description: `Manual balance credit by admin (${reason})`
    });

    this.logAudit(adminId, 'BALANCE_CREDIT', userId, { amount: val, reason });
    return this.getUser(userId);
  }

  cutBalance(userId, amount, reason = 'admin_debit', adminId = 'ADMIN') {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return null;

    const refEventId = `ADMIN-DEBIT-${userId}-${Date.now()}`;
    this.recordTransaction({
      userId,
      amount: -val,
      type: 'ADMIN_DEBIT',
      referenceId: refEventId,
      description: `Manual balance debit by admin (${reason})`
    });

    this.logAudit(adminId, 'BALANCE_DEBIT', userId, { amount: val, reason });
    return this.getUser(userId);
  }

  banUser(userId, isBanned = true, adminId = 'ADMIN') {
    const user = this.getUser(userId);
    if (!user) return false;
    user.is_banned = Boolean(isBanned);
    this.save();
    this.logAudit(adminId, isBanned ? 'BAN_USER' : 'UNBAN_USER', userId, {});
    return true;
  }

  resetReferral(userId, adminId = 'ADMIN') {
    const user = this.getUser(userId);
    if (!user) return false;
    user.referred_by = null;
    user.referral_status = 'direct';
    user.referral_reward_status = 'none';
    this.save();
    this.logAudit(adminId, 'RESET_REFERRAL', userId, {});
    return true;
  }

  // =======================================================
  // 3. SEARCH & FILTERS (Rule 47)
  // =======================================================

  getFilteredUsers({ search = '', filter = 'all', page = 1, limit = 50 }) {
    let list = Object.values(this.data.users);
    const cleanSearch = (search || '').toLowerCase().trim();

    // 1. Search by Telegram ID, Username, Name, Referral Code
    if (cleanSearch) {
      list = list.filter(u =>
        String(u.id).includes(cleanSearch) ||
        (u.first_name && u.first_name.toLowerCase().includes(cleanSearch)) ||
        (u.last_name && u.last_name.toLowerCase().includes(cleanSearch)) ||
        (u.username && u.username.toLowerCase().includes(cleanSearch)) ||
        (u.referral_code && u.referral_code.toLowerCase().includes(cleanSearch)) ||
        (u.wallet && u.wallet.toLowerCase().includes(cleanSearch))
      );
    }

    // 2. Filters
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    if (filter === 'banned') {
      list = list.filter(u => u.is_banned);
    } else if (filter === 'active') {
      list = list.filter(u => !u.is_banned);
    } else if (filter === 'inactive') {
      list = list.filter(u => {
        const last = u.last_active ? new Date(u.last_active).getTime() : 0;
        return now - last > sevenDaysMs;
      });
    } else if (filter === 'has_balance') {
      list = list.filter(u => (u.balance || 0) > 0);
    } else if (filter === 'has_referrals') {
      list = list.filter(u => (u.referral_count || 0) > 0);
    } else if (filter === 'watched_ads') {
      list = list.filter(u => (u.ads_watched || 0) > 0);
    } else if (filter === 'made_withdrawal') {
      list = list.filter(u => (u.lifetime_withdrawals || 0) > 0 || (u.total_withdrawn || 0) > 0);
    }

    list.reverse();
    const total = list.length;
    const paginated = list.slice((page - 1) * limit, page * limit);

    return {
      users: paginated,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // =======================================================
  // 4. CSV EXPORTS (Rule 48)
  // =======================================================

  exportUsersCSV() {
    const headers = ['Telegram ID', 'First Name', 'Last Name', 'Username', 'Balance', 'Total Earned', 'Total Withdrawn', 'Referrals', 'Ads Watched', 'Banned', 'Joined Date', 'Wallet'];
    const rows = Object.values(this.data.users).map(u => [
      `"${u.id}"`,
      `"${(u.first_name || '').replace(/"/g, '""')}"`,
      `"${(u.last_name || '').replace(/"/g, '""')}"`,
      `"${(u.username || '').replace(/"/g, '""')}"`,
      u.balance || 0,
      u.lifetime_earnings || u.total_earned || 0,
      u.lifetime_withdrawals || u.total_withdrawn || 0,
      u.referral_count || 0,
      u.ads_watched || 0,
      u.is_banned ? 'YES' : 'NO',
      `"${u.created_at || ''}"`,
      `"${(u.wallet || '').replace(/"/g, '""')}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  exportTransactionsCSV() {
    const headers = ['Transaction ID', 'User ID', 'Amount', 'Type', 'Reference ID', 'Balance Before', 'Balance After', 'Date', 'Description'];
    const rows = (this.data.wallet_transactions || []).map(t => [
      `"${t.id}"`,
      `"${t.user_id}"`,
      t.amount,
      `"${t.type}"`,
      `"${t.reference_id || ''}"`,
      t.balance_before,
      t.balance_after,
      `"${t.created_at || new Date(t.timestamp).toISOString()}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  exportWithdrawalsCSV() {
    const headers = ['Request ID', 'User ID', 'Name', 'Amount', 'Method', 'Wallet / Address', 'Status', 'Date', 'Admin Note'];
    const rows = (this.data.withdrawals || []).map(w => [
      `"${w.id}"`,
      `"${w.user_id}"`,
      `"${(w.name || '').replace(/"/g, '""')}"`,
      w.amount,
      `"${w.method || ''}"`,
      `"${(w.wallet || '').replace(/"/g, '""')}"`,
      `"${w.status}"`,
      `"${w.created_at}"`,
      `"${(w.admin_note || '').replace(/"/g, '""')}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  exportReferralsCSV() {
    const headers = ['Invited User ID', 'Invited Name', 'Invited Username', 'Referrer ID', 'Status', 'Reward Status', 'Join Date'];
    const rows = Object.values(this.data.users)
      .filter(u => u.referred_by)
      .map(u => [
        `"${u.id}"`,
        `"${(u.first_name || '').replace(/"/g, '""')}"`,
        `"${(u.username || '').replace(/"/g, '""')}"`,
        `"${u.referred_by}"`,
        `"${u.referral_status || 'active'}"`,
        `"${u.referral_reward_status || 'rewarded'}"`,
        `"${u.created_at || ''}"`
      ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  exportAdRewardsCSV() {
    const headers = ['Log ID', 'User ID', 'Reward Amount', 'Date', 'Session ID'];
    const rows = (this.data.ad_logs || []).map(a => [
      `"${a.id || ''}"`,
      `"${a.user_id}"`,
      a.reward,
      `"${a.date || ''}"`,
      `"${a.session_id || ''}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  // =======================================================
  // 5. ANALYTICS (Rule 49)
  // =======================================================

  getAnalytics() {
    const allUsers = Object.values(this.data.users);
    const totalUsers = allUsers.length;
    const now = Date.now();

    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    const monthMs = 30 * dayMs;

    // DAU, WAU, MAU
    const dau = allUsers.filter(u => u.last_active && (now - new Date(u.last_active).getTime()) <= dayMs).length;
    const wau = allUsers.filter(u => u.last_active && (now - new Date(u.last_active).getTime()) <= weekMs).length;
    const mau = allUsers.filter(u => u.last_active && (now - new Date(u.last_active).getTime()) <= monthMs).length;

    // Retention Rate (% registered > 7 days ago who were active in last 7 days)
    const olderCohort = allUsers.filter(u => (now - new Date(u.created_at).getTime()) > weekMs);
    const retained = olderCohort.filter(u => u.last_active && (now - new Date(u.last_active).getTime()) <= weekMs).length;
    const retentionRate = olderCohort.length > 0 ? parseFloat(((retained / olderCohort.length) * 100).toFixed(1)) : 100;

    // Referral Conversion (% of referred users who passed verification)
    const totalReferred = allUsers.filter(u => u.referred_by).length;
    const verifiedReferred = allUsers.filter(u => u.referred_by && u.referral_reward_status === 'rewarded').length;
    const referralConversion = totalReferred > 0 ? parseFloat(((verifiedReferred / totalReferred) * 100).toFixed(1)) : 100;

    // Average earnings
    const totalEarned = allUsers.reduce((sum, u) => sum + (u.lifetime_earnings || u.total_earned || 0), 0);
    const avgEarnings = totalUsers > 0 ? parseFloat((totalEarned / totalUsers).toFixed(2)) : 0;

    // Ad completion rate
    const totalAdSessions = Object.keys(this.data.ad_sessions || {}).length;
    const completedAdSessions = (this.data.ad_logs || []).length;
    const adCompletionRate = totalAdSessions > 0 ? parseFloat(((completedAdSessions / totalAdSessions) * 100).toFixed(1)) : 100;

    // Withdrawal rate
    const totalWithdrawn = allUsers.reduce((sum, u) => sum + (u.lifetime_withdrawals || u.total_withdrawn || 0), 0);
    const withdrawalRate = totalEarned > 0 ? parseFloat(((totalWithdrawn / totalEarned) * 100).toFixed(1)) : 0;

    // Task completion rate
    const totalTaskSlots = (this.data.tasks || []).length * totalUsers;
    const totalTaskDone = (this.data.task_completions || []).length;
    const taskCompletionRate = totalTaskSlots > 0 ? parseFloat(((totalTaskDone / totalTaskSlots) * 100).toFixed(1)) : 0;

    return {
      dau,
      wau,
      mau,
      totalUsers,
      retentionRate,
      referralConversion,
      avgEarnings,
      totalAdViews: completedAdSessions,
      adCompletionRate,
      withdrawalRate,
      taskCompletionRate
    };
  }

  // =======================================================
  // 6. FORCE JOIN CHANNELS
  // =======================================================

  getChannels() {
    return (this.data.channels || []).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getEnabledChannels() {
    return this.getChannels().filter(c => c.is_enabled);
  }

  addChannel(channelData, adminId = 'ADMIN') {
    const newChan = {
      id: `chan_${Date.now()}`,
      name: channelData.name || 'Telegram Channel',
      username: (channelData.username || '').trim(),
      channel_id: (channelData.channel_id || '').trim(),
      invite_url: (channelData.invite_url || '').trim(),
      button_label: channelData.button_label || `📢 Join ${channelData.name || 'Channel'}`,
      is_enabled: channelData.is_enabled !== undefined ? Boolean(channelData.is_enabled) : true,
      order: this.data.channels.length + 1
    };

    this.data.channels.push(newChan);
    this.save();
    this.logAudit(adminId, 'ADD_CHANNEL', newChan.id, newChan);
    return newChan;
  }

  updateChannel(channelId, updates, adminId = 'ADMIN') {
    const idx = this.data.channels.findIndex(c => c.id === channelId);
    if (idx === -1) return null;
    this.data.channels[idx] = { ...this.data.channels[idx], ...updates };
    this.save();
    this.logAudit(adminId, 'UPDATE_CHANNEL', channelId, updates);
    return this.data.channels[idx];
  }

  deleteChannel(channelId, adminId = 'ADMIN') {
    const initialLen = this.data.channels.length;
    this.data.channels = this.data.channels.filter(c => c.id !== channelId);
    if (this.data.channels.length !== initialLen) {
      this.save();
      this.logAudit(adminId, 'DELETE_CHANNEL', channelId, {});
      return true;
    }
    return false;
  }

  // =======================================================
  // 7. TASKS SYSTEM
  // =======================================================

  getTasks() {
    return this.data.tasks || [];
  }

  getActiveTasks() {
    return (this.data.tasks || []).filter(t => t.is_active);
  }

  getUserTasks(userId) {
    const id = String(userId);
    const completedTaskIds = new Set(
      (this.data.task_completions || [])
        .filter(c => c.user_id === id && c.status === 'completed')
        .map(c => c.task_id)
    );

    return this.getActiveTasks().map(task => ({
      ...task,
      is_completed: completedTaskIds.has(task.id)
    }));
  }

  addTask(taskData, adminId = 'ADMIN') {
    const newTask = {
      id: `task_${Date.now()}`,
      title: taskData.title || 'New Task',
      description: taskData.description || '',
      reward: parseFloat(taskData.reward) || 0.10,
      task_type: taskData.task_type || 'url_visit',
      target_url: taskData.target_url || '',
      chat_id: taskData.chat_id || '',
      icon: taskData.icon || '🎯',
      is_active: taskData.is_active !== undefined ? Boolean(taskData.is_active) : true,
      max_completions: parseInt(taskData.max_completions || '100000', 10),
      completions_count: 0,
      created_at: new Date().toISOString()
    };

    this.data.tasks.push(newTask);
    this.save();
    this.logAudit(adminId, 'ADD_TASK', newTask.id, newTask);
    return newTask;
  }

  updateTask(taskId, updates, adminId = 'ADMIN') {
    const idx = this.data.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return null;
    this.data.tasks[idx] = { ...this.data.tasks[idx], ...updates };
    this.save();
    this.logAudit(adminId, 'UPDATE_TASK', taskId, updates);
    return this.data.tasks[idx];
  }

  deleteTask(taskId, adminId = 'ADMIN') {
    const initialLen = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter(t => t.id !== taskId);
    if (this.data.tasks.length !== initialLen) {
      this.save();
      this.logAudit(adminId, 'DELETE_TASK', taskId, {});
      return true;
    }
    return false;
  }

  completeTask(userId, taskId) {
    const id = String(userId);
    const user = this.getUser(id);
    if (!user) return { success: false, message: 'User not found' };
    if (user.is_banned) return { success: false, message: 'Account is suspended' };

    const task = this.data.tasks.find(t => t.id === taskId);
    if (!task) return { success: false, message: 'Task not found' };
    if (!task.is_active) return { success: false, message: 'Task is no longer active' };

    // Idempotency: Prevent duplicate task completion
    const existing = this.data.task_completions.find(c => c.user_id === id && c.task_id === taskId);
    if (existing) {
      return { success: false, message: 'Task already completed!' };
    }

    if (task.completions_count >= task.max_completions) {
      return { success: false, message: 'Task has reached maximum completion limit' };
    }

    const taskEventId = `TASK-${id}-${taskId}`;

    task.completions_count = (task.completions_count || 0) + 1;
    user.tasks_completed = (user.tasks_completed || 0) + 1;

    const completion = {
      id: `tc_${Date.now()}`,
      task_id: taskId,
      user_id: id,
      reward: task.reward,
      status: 'completed',
      completed_at: new Date().toISOString()
    };
    this.data.task_completions.push(completion);

    this.recordTransaction({
      userId: id,
      amount: task.reward,
      type: 'TASK_REWARD',
      referenceId: taskEventId,
      description: `Task completed: ${task.title}`
    });

    return {
      success: true,
      reward: task.reward,
      balance: user.balance,
      taskTitle: task.title
    };
  }

  revokeTaskCompletion(userId, taskId) {
    const id = String(userId);
    const initialLen = (this.data.task_completions || []).length;
    this.data.task_completions = (this.data.task_completions || []).filter(
      c => !(c.user_id === id && c.task_id === taskId)
    );
    if (this.data.task_completions.length !== initialLen) {
      const user = this.getUser(id);
      if (user && user.tasks_completed > 0) {
        user.tasks_completed = Math.max(0, user.tasks_completed - 1);
      }
      this.save();
      return true;
    }
    return false;
  }

  penalizeLeftChannel(userId, channelIdentifier, penaltyAmount = 10.0) {
    const id = String(userId);
    const user = this.getUser(id);
    if (!user) return null;

    const penalty = parseFloat(penaltyAmount) || 10.0;
    const refEventId = `PENALTY-LEFT-${id}-${Date.now()}`;

    // Deduct penalty
    this.recordTransaction({
      userId: id,
      amount: -penalty,
      type: 'CHANNEL_LEFT_PENALTY',
      referenceId: refEventId,
      description: `Penalty for leaving required channel (${channelIdentifier})`
    });

    // Mark channels as unverified
    user.verified_channels = false;
    user.referral_status = 'pending_verification';

    this.save();
    this.logAudit('SYSTEM', 'CHANNEL_LEFT_PENALTY', id, { channel: channelIdentifier, penalty, balanceAfter: user.balance });
    return user;
  }

  // =======================================================
  // 8. DAILY BONUS SYSTEM (Rule 15 & 16)
  // =======================================================

  canClaimDailyBonus(userId) {
    const user = this.getUser(userId);
    if (!user) return { canClaim: false, waitMinutes: 0 };
    const now = Date.now();
    const lastClaim = user.last_daily_bonus || 0;
    const diffMs = now - lastClaim;
    const cooldownMs = 24 * 60 * 60 * 1000;

    if (diffMs >= cooldownMs) {
      return { canClaim: true, waitMinutes: 0, nextClaimAt: now };
    }
    const waitMs = cooldownMs - diffMs;
    return {
      canClaim: false,
      waitMinutes: Math.ceil(waitMs / (60 * 1000)),
      nextClaimAt: lastClaim + cooldownMs
    };
  }

  claimDailyBonus(userId) {
    const id = String(userId);
    const user = this.getUser(id);
    if (!user) return { success: false, message: 'User not found' };
    if (user.is_banned) return { success: false, message: 'Account is banned' };

    const check = this.canClaimDailyBonus(id);
    if (!check.canClaim) {
      const hours = Math.floor(check.waitMinutes / 60);
      const mins = check.waitMinutes % 60;
      return {
        success: false,
        message: `Already claimed! Next bonus in ${hours}h ${mins}m.`,
        nextClaimAt: check.nextClaimAt,
        waitTime: `${hours}h ${mins}m`
      };
    }

    const ladder = this.data.bonuses?.daily_ladder || [5, 10, 15, 20, 25, 30, 35];
    const now = Date.now();
    const lastClaim = user.last_daily_bonus || 0;
    const hoursSinceLast = (now - lastClaim) / (1000 * 60 * 60);

    let streak = user.daily_streak || 0;
    if (lastClaim === 0 || hoursSinceLast > 48) {
      streak = 1;
    } else {
      streak = (streak % ladder.length) + 1;
    }

    const bonusAmount = ladder[streak - 1] || ladder[0];
    const bonusEventId = `BONUS-${id}-${this.getTodayString()}-${streak}`;

    user.daily_streak = streak;
    user.last_daily_bonus = now;
    user.bonuses_claimed = (user.bonuses_claimed || 0) + 1;

    this.recordTransaction({
      userId: id,
      amount: bonusAmount,
      type: 'BONUS_REWARD',
      referenceId: bonusEventId,
      description: `Daily Bonus Claimed (Day ${streak})`
    });

    return {
      success: true,
      amount: bonusAmount,
      streak,
      balance: user.balance,
      nextClaimAt: now + 24 * 60 * 60 * 1000
    };
  }

  // =======================================================
  // 9. GIGAPUB ADS SYSTEM & ANTI-FRAUD SESSION ENGINE
  // =======================================================

  canWatchAd(userId) {
    const user = this.getUser(userId);
    if (!user) return { canWatch: false, reason: 'User not found' };
    if (user.is_banned) return { canWatch: false, reason: 'Account suspended' };

    const today = this.getTodayString();
    if (user.ads_today_date !== today) {
      user.ads_today = 0;
      user.ads_today_date = today;
      this.save();
    }

    const dailyLimit = this.getSetting('dailyAdLimit');
    if (dailyLimit > 0 && user.ads_today >= dailyLimit) {
      return { canWatch: false, reason: `Daily limit of ${dailyLimit} ads reached. Resets tomorrow!` };
    }

    const cooldownSec = this.getSetting('adCooldownSeconds');
    const now = Date.now();
    const elapsedSec = Math.floor((now - (user.last_ad_timestamp || 0)) / 1000);

    if (elapsedSec < cooldownSec) {
      const wait = cooldownSec - elapsedSec;
      return {
        canWatch: false,
        reason: `Please wait ${wait} seconds before watching another ad.`,
        remainingSeconds: wait
      };
    }

    return { canWatch: true };
  }

  createAdSession(userId) {
    const id = String(userId);
    const check = this.canWatchAd(id);
    if (!check.canWatch) {
      return { success: false, message: check.reason, remainingSeconds: check.remainingSeconds };
    }

    const sessionId = `ADS_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const token = crypto.randomBytes(16).toString('hex');
    const adReward = this.getSetting('adReward');

    const session = {
      id: sessionId,
      user_id: id,
      token,
      status: 'created',
      reward: adReward,
      created_at: Date.now(),
      expires_at: Date.now() + 5 * 60 * 1000
    };

    this.data.ad_sessions[sessionId] = session;
    this.save();

    return {
      success: true,
      sessionId,
      token,
      reward: adReward
    };
  }

  verifyAndClaimAd(userId, sessionId, token) {
    const id = String(userId);
    const user = this.getUser(id);
    if (!user) return { success: false, message: 'User not found' };

    const session = this.data.ad_sessions[sessionId];
    if (!session || session.user_id !== id) {
      return this.recordDirectAdReward(id);
    }

    if (session.status === 'completed') {
      return { success: false, message: 'Ad reward has already been claimed for this session!' };
    }

    if (Date.now() > session.expires_at) {
      return { success: false, message: 'Ad session expired. Please start a new ad.' };
    }

    if (token && session.token !== token) {
      return { success: false, message: 'Invalid session token signature' };
    }

    const check = this.canWatchAd(id);
    if (!check.canWatch) {
      return { success: false, message: check.reason, remainingSeconds: check.remainingSeconds };
    }

    const adReward = session.reward || this.getSetting('adReward');
    const now = Date.now();
    const adEventId = `AD-${sessionId}`;

    session.status = 'completed';
    session.completed_at = now;

    user.last_ad_timestamp = now;
    user.ads_today = (user.ads_today || 0) + 1;
    user.ads_watched = (user.ads_watched || 0) + 1;

    this.recordTransaction({
      userId: id,
      amount: adReward,
      type: 'AD_REWARD',
      referenceId: adEventId,
      description: `GigaPub Ad completed (Session ${sessionId})`
    });

    this.data.ad_logs.push({
      id: `adl_${Date.now()}`,
      user_id: id,
      reward: adReward,
      timestamp: now,
      date: this.getTodayString(),
      session_id: sessionId
    });

    if (this.data.ad_logs.length > 5000) {
      this.data.ad_logs.splice(0, 1000);
    }

    this.save();

    return {
      success: true,
      reward: adReward,
      balance: user.balance,
      adsToday: user.ads_today,
      dailyLimit: this.getSetting('dailyAdLimit'),
      cooldownSeconds: this.getSetting('adCooldownSeconds')
    };
  }

  recordDirectAdReward(userId) {
    const id = String(userId);
    const user = this.getUser(id);
    if (!user) return { success: false, message: 'User not found' };

    const check = this.canWatchAd(id);
    if (!check.canWatch) {
      return { success: false, message: check.reason, remainingSeconds: check.remainingSeconds };
    }

    const adReward = this.getSetting('adReward');
    const now = Date.now();
    const adEventId = `AD-DIRECT-${id}-${now}`;

    user.last_ad_timestamp = now;
    user.ads_today = (user.ads_today || 0) + 1;
    user.ads_watched = (user.ads_watched || 0) + 1;

    this.recordTransaction({
      userId: id,
      amount: adReward,
      type: 'AD_REWARD',
      referenceId: adEventId,
      description: 'GigaPub Ad completed'
    });

    this.data.ad_logs.push({
      id: `adl_${now}`,
      user_id: id,
      reward: adReward,
      timestamp: now,
      date: this.getTodayString(),
      session_id: adEventId
    });

    this.save();

    return {
      success: true,
      reward: adReward,
      balance: user.balance,
      adsToday: user.ads_today,
      dailyLimit: this.getSetting('dailyAdLimit'),
      cooldownSeconds: this.getSetting('adCooldownSeconds')
    };
  }

  // =======================================================
  // 10. WITHDRAWAL SYSTEM (MULTI-METHOD)
  // =======================================================

  getWithdrawalEligibility(userId) {
    const id = String(userId);
    const user = this.getUser(id);
    if (!user) {
      return {
        eligible: false,
        reason: 'User not found',
        requiredReferrals: 10,
        requiredAds: 30,
        currentReferrals: 0,
        currentAds: 0,
        remainingReferrals: 10,
        remainingAds: 30,
        balance: 0
      };
    }

    const REQUIRED_REFERRALS = 10;
    const REQUIRED_ADS = 30;
    const currentReferrals = user.referral_count || 0;
    const currentAds = user.ads_watched || 0;

    const remainingReferrals = Math.max(0, REQUIRED_REFERRALS - currentReferrals);
    const remainingAds = Math.max(0, REQUIRED_ADS - currentAds);
    const eligible = currentReferrals >= REQUIRED_REFERRALS && currentAds >= REQUIRED_ADS;

    return {
      eligible,
      requiredReferrals: REQUIRED_REFERRALS,
      requiredAds: REQUIRED_ADS,
      currentReferrals,
      currentAds,
      remainingReferrals,
      remainingAds,
      balance: user.balance || 0,
      minWithdrawal: this.getSetting('minWithdrawal') || 500
    };
  }

  createWithdrawal(userId, { method = 'upi', amount, details, bypassRules = false }) {
    const id = String(userId);
    const user = this.getUser(id);
    if (!user) return { success: false, message: 'User not found' };
    if (user.is_banned) return { success: false, message: 'Your account is banned' };

    const eligibility = this.getWithdrawalEligibility(id);
    if (!eligibility.eligible && !bypassRules) {
      const parts = [];
      if (eligibility.remainingReferrals > 0) parts.push(`${eligibility.remainingReferrals} more referral(s)`);
      if (eligibility.remainingAds > 0) parts.push(`${eligibility.remainingAds} more ad(s)`);
      return {
        success: false,
        locked: true,
        message: `🔒 Withdrawal Locked: You must complete at least 10 referrals (${eligibility.currentReferrals}/10) and watch 30 ads (${eligibility.currentAds}/30) to unlock withdrawals. You still need ${parts.join(' and ')}.`,
        eligibility
      };
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      return { success: false, message: 'Please enter a valid amount' };
    }
    const minWith = this.getSetting('minWithdrawal') || 500;
    if (amt < minWith && !bypassRules) {
      return { success: false, message: `Minimum withdrawal amount is ${this.getSetting('currencySymbol')}${minWith}` };
    }
    if (amt > user.balance) {
      return { success: false, message: `Insufficient balance! You have ${this.getSetting('currencySymbol')}${user.balance.toFixed(2)}` };
    }
    const maxWith = this.getSetting('maxWithdrawal');
    if (maxWith && amt > maxWith) {
      return { success: false, message: `Maximum withdrawal limit is ${this.getSetting('currencySymbol')}${maxWith}` };
    }

    let walletLabel = '';
    if (method === 'upi') {
      const upiId = (typeof details === 'object' ? details.upi_id : details) || user.wallet_upi || user.wallet;
      if (!upiId || upiId.length < 3) return { success: false, message: 'Please provide a valid UPI ID' };
      user.wallet_upi = upiId;
      user.wallet = upiId;
      walletLabel = `UPI: ${upiId}`;
    } else if (method === 'paypal') {
      const email = (typeof details === 'object' ? details.paypal_email : details) || user.wallet_paypal || user.wallet;
      if (!email || !email.includes('@')) return { success: false, message: 'Please provide a valid PayPal email' };
      user.wallet_paypal = email;
      user.wallet = email;
      walletLabel = `PayPal: ${email}`;
    } else if (method === 'bank') {
      const bank = typeof details === 'object' ? details : (user.wallet_bank || {});
      if (!bank.account_number || !bank.ifsc) return { success: false, message: 'Please provide Bank Account Number and IFSC' };
      user.wallet_bank = bank;
      walletLabel = `Bank: ${bank.bank_name || ''} A/C ${bank.account_number} (IFSC: ${bank.ifsc})`;
      user.wallet = walletLabel;
    }

    const reqId = `WD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const wdEventId = `WD-${id}-${reqId}`;

    this.recordTransaction({
      userId: id,
      amount: -amt,
      type: 'WITHDRAWAL_HOLD',
      referenceId: wdEventId,
      description: `Withdrawal request placed (${reqId}) via ${method.toUpperCase()}`
    });

    const withdrawal = {
      id: reqId,
      user_id: id,
      name: `${user.first_name} ${user.last_name || ''}`.trim(),
      username: user.username ? `@${user.username}` : '',
      amount: amt,
      method: method.toLowerCase(),
      details,
      wallet: walletLabel,
      status: 'pending',
      created_at: new Date().toISOString(),
      reviewed_at: null,
      admin_note: ''
    };

    this.data.withdrawals.unshift(withdrawal);
    this.save();

    return {
      success: true,
      withdrawal,
      remainingBalance: user.balance
    };
  }

  getWithdrawalById(reqId) {
    return this.data.withdrawals.find(w => w.id === reqId) || null;
  }

  getUserWithdrawals(userId) {
    const id = String(userId);
    return this.data.withdrawals.filter(w => w.user_id === id);
  }

  reviewWithdrawal(reqId, status, adminNote = '', adminId = 'ADMIN') {
    const item = this.getWithdrawalById(reqId);
    if (!item) return { success: false, message: 'Withdrawal not found' };
    if (!['pending', 'approved'].includes(item.status) && status !== 'paid') {
      return { success: false, message: `Withdrawal is already ${item.status}` };
    }

    const user = this.getUser(item.user_id);
    const validStatuses = ['approved', 'rejected', 'paid'];
    if (!validStatuses.includes(status)) {
      return { success: false, message: 'Invalid status' };
    }

    item.status = status;
    item.reviewed_at = new Date().toISOString();
    item.admin_note = adminNote || `Reviewed by admin (${status})`;

    if (status === 'approved' || status === 'paid') {
      if (user) {
        user.lifetime_withdrawals = parseFloat(((user.lifetime_withdrawals || 0) + item.amount).toFixed(2));
        user.total_withdrawn = user.lifetime_withdrawals;
      }
    } else if (status === 'rejected') {
      const refundOnReject = this.getSetting('refundOnReject') !== false;
      if (refundOnReject && user) {
        this.recordTransaction({
          userId: item.user_id,
          amount: item.amount,
          type: 'WITHDRAWAL_REFUND',
          referenceId: `REFUND-${item.id}`,
          description: `Withdrawal refund for rejected request ${item.id}`
        });
      }
    }

    this.save();
    this.logAudit(adminId, `WITHDRAWAL_${status.toUpperCase()}`, item.id, { amount: item.amount, adminNote });
    return { success: true, withdrawal: item, user };
  }

  // =======================================================
  // 11. WEEKLY LEADERBOARD
  // =======================================================

  getWeeklyLeaderboard(limit = 20) {
    const users = Object.values(this.data.users)
      .map(u => ({
        id: u.id,
        name: `${u.first_name} ${u.last_name || ''}`.trim(),
        username: u.username ? `@${u.username}` : '',
        weekly_referrals: u.weekly_referrals || 0,
        total_referrals: u.referral_count || 0,
        balance: u.balance || 0
      }))
      .sort((a, b) => b.weekly_referrals - a.weekly_referrals || b.total_referrals - a.total_referrals);

    return users.slice(0, limit);
  }

  getUserWeeklyRank(userId) {
    const id = String(userId);
    const list = this.getWeeklyLeaderboard(1000);
    const idx = list.findIndex(u => u.id === id);
    return idx !== -1 ? idx + 1 : list.length + 1;
  }

  distributeWeeklyLeaderboardRewards(adminId = 'SYSTEM') {
    const leaderboard = this.getWeeklyLeaderboard(20);
    const winners = [];

    leaderboard.forEach((entry, idx) => {
      const rank = idx + 1;
      let prizeAmount = 0;

      if (rank === 1) prizeAmount = 10;
      else if (rank === 2) prizeAmount = 10;
      else if (rank === 3) prizeAmount = 10;
      else if (rank >= 4 && rank <= 10) prizeAmount = 5;
      else if (rank >= 11 && rank <= 20) prizeAmount = 3;

      if (prizeAmount > 0 && entry.weekly_referrals > 0) {
        this.recordTransaction({
          userId: entry.id,
          amount: prizeAmount,
          type: 'LEADERBOARD_REWARD',
          referenceId: `WEEKLY-${Date.now()}-${entry.id}`,
          description: `Weekly Leaderboard Prize (#${rank})`
        });

        winners.push({ rank, userId: entry.id, name: entry.name, prize: prizeAmount, referrals: entry.weekly_referrals });
      }
    });

    // Reset weekly counters
    Object.values(this.data.users).forEach(u => {
      u.weekly_referrals = 0;
    });

    const record = {
      id: `wkl_${Date.now()}`,
      date: new Date().toISOString(),
      winners
    };

    if (!this.data.weekly_leaderboards.history) {
      this.data.weekly_leaderboards.history = [];
    }
    this.data.weekly_leaderboards.history.unshift(record);
    this.data.weekly_leaderboards.current_week_start = new Date().toISOString();

    this.save();
    this.logAudit(adminId, 'DISTRIBUTE_WEEKLY_REWARDS', record.id, { winnersCount: winners.length });

    return { success: true, winners };
  }

  // =======================================================
  // 12. MESSAGE TEMPLATES & DYNAMIC VARIABLE PARSER
  // =======================================================

  getTemplate(key) {
    return this.data.message_templates[key] || DEFAULT_TEMPLATES[key] || { text: '', media_type: 'none', media_url: '', inline_buttons: [] };
  }

  updateTemplate(key, templateData, adminId = 'ADMIN') {
    if (!this.data.message_templates) this.data.message_templates = { ...DEFAULT_TEMPLATES };
    this.data.message_templates[key] = {
      ...(this.data.message_templates[key] || {}),
      ...templateData
    };
    this.save();
    this.logAudit(adminId, 'UPDATE_TEMPLATE', key, templateData);
    return this.data.message_templates[key];
  }

  renderTemplate(key, variables = {}) {
    const template = this.getTemplate(key);
    let renderedText = template.text || '';

    const dailyLimit = parseInt(this.getSetting('dailyAdLimit') || '0', 10);
    const adsTodayVal = variables.ads_today !== undefined ? variables.ads_today : (variables.adsToday !== undefined ? variables.adsToday : 0);
    const fullVars = {
      currency_symbol: this.getSetting('currencySymbol'),
      currency_name: this.getSetting('currencyName'),
      referral_reward: this.getSetting('referralReward'),
      ad_reward: this.getSetting('adReward'),
      daily_bonus: this.getSetting('dailyBonus'),
      minimum_withdrawal: this.getSetting('minWithdrawal'),
      daily_ad_limit: dailyLimit > 0 ? String(dailyLimit) : 'unlimited',
      daily_ad_limit_text: dailyLimit > 0 ? `up to ${dailyLimit} ads` : 'unlimited ads',
      ads_today_display: dailyLimit > 0 ? `${adsTodayVal}/${dailyLimit}` : `${adsTodayVal}`,
      ...variables
    };

    for (const [vKey, vVal] of Object.entries(fullVars)) {
      const reg = new RegExp(`{{${vKey}}}`, 'g');
      renderedText = renderedText.replace(reg, vVal !== undefined ? String(vVal) : '');
    }

    return {
      text: renderedText,
      media_type: template.media_type || 'none',
      media_url: template.media_url || '',
      inline_buttons: template.inline_buttons || []
    };
  }

  // =======================================================
  // 13. BROADCAST SYSTEM
  // =======================================================

  createBroadcast(broadcastData, adminId = 'ADMIN') {
    const bc = {
      id: `bc_${Date.now()}`,
      title: broadcastData.title || 'Broadcast Announcement',
      text: broadcastData.text || '',
      media_type: broadcastData.media_type || 'none',
      media_url: broadcastData.media_url || '',
      target: broadcastData.target || 'all',
      total_recipients: 0,
      sent_count: 0,
      failed_count: 0,
      status: 'pending',
      created_at: new Date().toISOString(),
      finished_at: null,
      admin_id: adminId
    };

    if (!this.data.broadcasts) this.data.broadcasts = [];
    this.data.broadcasts.unshift(bc);
    this.save();
    return bc;
  }

  getBroadcasts() {
    return this.data.broadcasts || [];
  }

  // =======================================================
  // 14. AUDIT LOGS & SETTINGS
  // =======================================================

  logAudit(adminId, action, targetId = '', details = {}) {
    const log = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      admin_id: String(adminId),
      action,
      target_id: String(targetId),
      details,
      timestamp: new Date().toISOString()
    };

    if (!this.data.audit_logs) this.data.audit_logs = [];
    this.data.audit_logs.unshift(log);
    if (this.data.audit_logs.length > 2000) {
      this.data.audit_logs.splice(2000);
    }
    this.save();
  }

  getAuditLogs(limit = 100) {
    return (this.data.audit_logs || []).slice(0, limit);
  }

  getSettings() {
    return this.data.settings;
  }

  getSetting(key) {
    return this.data.settings[key] !== undefined ? this.data.settings[key] : config[key];
  }

  updateSettings(newSettings, adminId = 'ADMIN') {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
    this.logAudit(adminId, 'UPDATE_SETTINGS', 'SYSTEM', newSettings);
    return this.data.settings;
  }

  getSuspiciousReferrals() {
    const suspicious = [];
    const ipCounts = {};
    const allUsers = Object.values(this.data.users);

    allUsers.forEach(u => {
      if (u.ip) {
        ipCounts[u.ip] = (ipCounts[u.ip] || 0) + 1;
      }
    });

    allUsers.forEach(u => {
      let flags = [];
      if (u.ip && ipCounts[u.ip] > 3) {
        flags.push(`Shared IP with ${ipCounts[u.ip]} accounts (${u.ip})`);
      }
      if (u.referral_count > 10 && (u.ads_watched || 0) === 0 && (u.tasks_completed || 0) === 0) {
        flags.push('High referrals with 0 platform engagement');
      }

      if (flags.length > 0) {
        suspicious.push({
          id: u.id,
          name: `${u.first_name} ${u.last_name || ''}`.trim(),
          username: u.username ? `@${u.username}` : '',
          referral_count: u.referral_count || 0,
          balance: u.balance,
          flags,
          created_at: u.created_at
        });
      }
    });

    return suspicious;
  }

  getStats() {
    const allUsers = Object.values(this.data.users);
    const totalUsers = allUsers.length;
    const today = this.getTodayString();
    const newUsersToday = allUsers.filter(u => u.created_at && u.created_at.startsWith(today)).length;
    const activeUsers = allUsers.filter(u => !u.is_banned).length;

    const totalBalance = allUsers.reduce((acc, u) => acc + (u.balance || 0), 0);
    const totalWithdrawn = allUsers.reduce((acc, u) => acc + (u.lifetime_withdrawals || u.total_withdrawn || 0), 0);
    const totalReferrals = allUsers.reduce((acc, u) => acc + (u.referral_count || 0), 0);

    const pendingWithdrawals = this.data.withdrawals.filter(w => w.status === 'pending');
    const approvedWithdrawals = this.data.withdrawals.filter(w => w.status === 'approved' || w.status === 'paid');
    const totalAdsWatched = this.data.ad_logs.length;
    const totalTasksCompleted = (this.data.task_completions || []).length;

    return {
      totalUsers,
      newUsersToday,
      activeUsers,
      totalReferrals,
      totalBalance: parseFloat(totalBalance.toFixed(2)),
      totalWithdrawn: parseFloat(totalWithdrawn.toFixed(2)),
      pendingWithdrawalsCount: pendingWithdrawals.length,
      approvedWithdrawalsCount: approvedWithdrawals.length,
      totalAdsWatched,
      totalTasksCompleted,
      maintenanceMode: Boolean(this.getSetting('maintenanceMode')),
      gigaPubEnabled: Boolean(this.getSetting('gigaPubEnabled'))
    };
  }
}

export const db = new Database();
export default db;

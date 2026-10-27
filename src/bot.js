import { Bot, InlineKeyboard, Keyboard } from 'grammy';
import config from './config.js';
import db from './db.js';

let bot = null;

// User state machine for conversational withdrawal flow
const userStates = new Map();
const userAdWatchStartTime = new Map();

/**
 * Builds the 2-column Reply Keyboard matching reference UI
 */
export function buildMainMenuKeyboard() {
  const s = db.getSettings();
  const btnBalance = s.btn_balance || '💰 My Balance';
  const btnWithdraw = s.btn_withdraw || '💸 Withdraw';
  const btnAds = s.btn_ads || '🎬 Watch Ads';
  const btnRefer = s.btn_refer || '👥 Invite Friends';
  const btnBonus = s.btn_bonus || '🎁 Bonus';
  const btnTasks = s.btn_tasks || '📋 Tasks';

  return new Keyboard()
    .text(btnBalance).text(btnWithdraw).row()
    .text(btnAds).text(btnRefer).row()
    .text(btnBonus).text(btnTasks).row()
    .resized();
}

/**
 * Sends a templated message with optional media and inline buttons
 */
async function sendTemplatedMessage(ctx, templateKey, variables = {}, extraKeyboard = null) {
  const rendered = db.renderTemplate(templateKey, variables);
  const parse_mode = 'HTML';

  // Build inline keyboard from extra keyboard (if provided) or template buttons
  let inlineKeyboard = new InlineKeyboard();

  if (extraKeyboard && extraKeyboard.inline_keyboard && extraKeyboard.inline_keyboard.length > 0) {
    inlineKeyboard = extraKeyboard;
  } else if (rendered.inline_buttons && rendered.inline_buttons.length > 0) {
    rendered.inline_buttons.forEach(row => {
      row.forEach(btn => {
        let btnUrl = btn.url || '';
        for (const [k, v] of Object.entries(variables)) {
          btnUrl = btnUrl.replace(new RegExp(`{{${k}}}`, 'g'), v);
        }

        if (btn.web_app) {
          const targetUrl = btnUrl || config.webAppUrl;
          inlineKeyboard.webApp(btn.text, targetUrl);
        } else if (btnUrl) {
          inlineKeyboard.url(btn.text, btnUrl);
        } else if (btn.callback_data) {
          inlineKeyboard.text(btn.text, btn.callback_data);
        }
      });
      inlineKeyboard.row();
    });
  }

  const hasInlineButtons = inlineKeyboard.inline_keyboard && inlineKeyboard.inline_keyboard.length > 0;
  const reply_markup = hasInlineButtons ? inlineKeyboard : undefined;

  // Send based on media_type
  try {
    if (rendered.media_type === 'photo' && rendered.media_url) {
      await ctx.replyWithPhoto(rendered.media_url, { caption: rendered.text, parse_mode, reply_markup });
    } else if (rendered.media_type === 'video' && rendered.media_url) {
      await ctx.replyWithVideo(rendered.media_url, { caption: rendered.text, parse_mode, reply_markup });
    } else if (rendered.media_type === 'animation' && rendered.media_url) {
      await ctx.replyWithAnimation(rendered.media_url, { caption: rendered.text, parse_mode, reply_markup });
    } else if (rendered.media_type === 'document' && rendered.media_url) {
      await ctx.replyWithDocument(rendered.media_url, { caption: rendered.text, parse_mode, reply_markup });
    } else {
      await ctx.reply(rendered.text, { parse_mode, reply_markup, disable_web_page_preview: true });
    }
  } catch (err) {
    console.error(`Error sending templated message (${templateKey}):`, err.message);
    // Fallback to plain text message
    await ctx.reply(rendered.text, { parse_mode, reply_markup, disable_web_page_preview: true }).catch(() => {});
  }
}

/**
 * Checks if user is subscribed to all configured force-join channels
 */
async function checkUserChannels(ctx, userId) {
  const enabledChannels = db.getEnabledChannels();
  if (enabledChannels.length === 0) return { allJoined: true, missing: [] };

  const dbUser = db.getUser(userId);
  const wasVerified = Boolean(dbUser && dbUser.verified_channels);
  const missing = [];

  for (const ch of enabledChannels) {
    const target = ch.channel_id || ch.username;
    if (!target) continue;

    try {
      const member = await ctx.api.getChatMember(target, userId);
      const isMember = ['member', 'administrator', 'creator'].includes(member.status);
      if (!isMember) {
        missing.push(ch);
      }
    } catch (err) {
      console.warn(`Could not verify channel ${target} for user ${userId}: ${err.message}`);
      // Telegram throws an error if user is not in the channel (e.g. PARTICIPANT_ID_INVALID, user not found)
      missing.push(ch);
    }
  }

  // If user was previously verified but has now left one or more channels -> Apply ₹10 penalty
  if (wasVerified && missing.length > 0) {
    const chName = missing[0].name || missing[0].username || 'Official Channel';
    const PENALTY_AMOUNT = 10.0;
    const penalizedUser = db.penalizeLeftChannel(userId, chName, PENALTY_AMOUNT);
    const symbol = db.getSetting('currencySymbol') || '₹';

    await ctx.reply(
      `⚠️ <b>Channel Membership Lost!</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `You left our official channel: <b>${chName}</b>.\n\n` +
      `🚨 <b>Penalty Applied:</b> <b>-${symbol}${PENALTY_AMOUNT.toFixed(2)}</b> has been deducted from your balance!\n` +
      `💰 Current Balance: <b>${symbol}${penalizedUser ? penalizedUser.balance.toFixed(2) : '0.00'}</b>\n\n` +
      `🔒 <i>Your account access is restricted. Rejoin all required channels below to regain access.</i>`,
      { parse_mode: 'HTML' }
    ).catch(() => {});
  }

  return { allJoined: missing.length === 0, missing };
}

/**
 * Shows force join message with individual channel buttons and Verify button
 */
async function promptForceJoin(ctx, missingChannels = null) {
  const channels = (missingChannels && missingChannels.length > 0) ? missingChannels : db.getEnabledChannels();
  const keyboard = new InlineKeyboard();

  channels.forEach(ch => {
    const url = ch.invite_url || (ch.username ? `https://t.me/${ch.username.replace(/^@/, '')}` : '#');
    const label = ch.button_label || `📢 Join ${ch.name}`;
    keyboard.url(label, url).row();
  });

  keyboard.text('✅ Verify Membership', 'verify_channels');

  await ctx.reply(
    `🔒 <b>Access Restricted</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ <b>You must join all our channels</b>\n` +
    `to unlock bot features.\n\n` +
    `📢 <b>Subscribe to every channel</b>\n` +
    `using the buttons below.\n\n` +
    `✅ <b>After joining all channels,</b>\n` +
    `tap the Verify Membership button.`,
    {
      parse_mode: 'HTML',
      reply_markup: keyboard,
      disable_web_page_preview: true
    }
  );
}

export function initBot() {
  const isPlaceholder = !config.botToken || config.botToken === 'YOUR_TELEGRAM_BOT_TOKEN_HERE';

  if (isPlaceholder) {
    console.warn('\n⚠️ [Telegram Bot] BOT_TOKEN is not configured in .env.');
    console.warn('⚠️ Telegram bot polling will be paused. The Mini App web server is running for preview/admin.\n');
    return null;
  }

  try {
    const botInfo = {
      id: 7651918317,
      is_bot: true,
      first_name: 'easyandfastearn',
      username: config.botUsername || 'easyandfastearn_bot',
      can_join_groups: true,
      can_read_all_group_messages: false,
      supports_inline_queries: false
    };
    bot = new Bot(config.botToken, { botInfo });

    // =======================================================
    // Middleware: Maintenance Mode & Force-Join Check
    // =======================================================
    bot.use(async (ctx, next) => {
      const user = ctx.from;
      if (!user) return next();

      // Ensure database is ready and user loaded from MongoDB Atlas
      if (!db.isReady) {
        await db.waitForReady().catch(() => {});
      }
      await db.ensureUserLoaded(user.id);

      const isAdmin = String(user.id) === String(config.adminId);
      const isMaintenance = Boolean(db.getSetting('maintenanceMode'));

      if (isMaintenance && !isAdmin) {
        if (ctx.message || ctx.callbackQuery) {
          const rendered = db.renderTemplate('MAINTENANCE_MESSAGE');
          if (ctx.callbackQuery) {
            await ctx.answerCallbackQuery({ text: '🚧 Bot is under maintenance.', show_alert: true });
          } else {
            await ctx.reply(rendered.text, { parse_mode: 'HTML' });
          }
          return;
        }
      }

      // Enforce channel membership for non-admin interactions
      if (!isAdmin) {
        const text = ctx.message?.text || '';
        const isStart = text.startsWith('/start');
        const isVerifyCallback = ctx.callbackQuery?.data === 'verify_channels';

        if (!isStart && !isVerifyCallback) {
          const channelCheck = await checkUserChannels(ctx, user.id);
          if (!channelCheck.allJoined) {
            if (ctx.callbackQuery) {
              await ctx.answerCallbackQuery({
                text: '❌ You must join all required channels first!',
                show_alert: true
              });
            } else {
              await promptForceJoin(ctx, channelCheck.missing);
            }
            return;
          }
        }
      }

      return next();
    });

    // =======================================================
    // 1. /start Command (Referral Deep Link & Force Join Check)
    // =======================================================
    bot.command('start', async (ctx) => {
      const user = ctx.from;
      if (!user) return;

      const payload = ctx.match ? ctx.match.trim() : '';
      let referrerId = null;

      // Extract referrer from 'ref_12345' or '12345' with self-referral rejection
      if (payload) {
        const match = payload.match(/^(?:ref_)?(\d+)$/);
        if (match) {
          if (String(match[1]) === String(user.id)) {
            await ctx.reply('❌ <b>Invalid referral.</b> You cannot use your own referral link.', { parse_mode: 'HTML' });
          } else {
            referrerId = match[1];
          }
        }
      }

      // Register or fetch user
      const { user: dbUser, isNew } = db.getOrCreateUser(user, referrerId);

      if (dbUser.is_banned) {
        await ctx.reply('🚫 <b>Your account has been suspended from using this bot.</b>', { parse_mode: 'HTML' });
        return;
      }

      // If user joined via referral link, qualify reward and notify sender immediately!
      if (isNew && dbUser.referred_by) {
        const qualResult = db.qualifyReferral(user.id);
        if (qualResult.rewarded && qualResult.referrerId) {
          await notifyReferralJoined(qualResult.referrerId, user, qualResult);
        }
      }

      // Verify Force-Join Channels
      const channelCheck = await checkUserChannels(ctx, user.id);
      if (!channelCheck.allJoined) {
        await promptForceJoin(ctx, channelCheck.missing);
        return;
      }

      // If user wasn't rewarded yet (fallback), qualify and notify sender
      const qualResult = db.qualifyReferral(user.id);
      if (qualResult.rewarded && qualResult.referrerId) {
        await notifyReferralJoined(qualResult.referrerId, user, qualResult);
      }

      // Show Welcome / Start message with 2-Column Reply Keyboard!
      await showWelcomeAndMainMenu(ctx, dbUser);
    });

    // =======================================================
    // 2. Force Join Verification Callback
    // =======================================================
    bot.callbackQuery('verify_channels', async (ctx) => {
      const user = ctx.from;
      const channelCheck = await checkUserChannels(ctx, user.id);

      if (!channelCheck.allJoined) {
        await ctx.answerCallbackQuery({
          text: '❌ You haven\'t joined all required channels yet. Please join every channel and try again!',
          show_alert: true
        });
        return;
      }

      await ctx.answerCallbackQuery({ text: '🎉 Verification Successful!' });

      try {
        await ctx.deleteMessage();
      } catch {}

      const renderedSuccess = db.renderTemplate('VERIFICATION_SUCCESS');
      await ctx.reply(renderedSuccess.text, { parse_mode: 'HTML' });

      // Qualify referral reward upon successful force-join verification (if not already rewarded)!
      const qualResult = db.qualifyReferral(user.id);
      if (qualResult.rewarded && qualResult.referrerId) {
        await notifyReferralJoined(qualResult.referrerId, user, qualResult);
      }

      const dbUser = db.getUser(user.id) || db.getOrCreateUser(user).user;
      await showWelcomeAndMainMenu(ctx, dbUser);
    });

    // Direct command aliases
    bot.command('balance', handleBalanceAction);
    bot.command('withdraw', handleWithdrawAction);
    bot.command('watchads', handleWatchAdsAction);
    bot.command('invite', handleInviteFriendsAction);
    bot.command('bonus', handleBonusAction);
    bot.command('tasks', handleTasksAction);
    bot.command('help', async (ctx) => {
      await ctx.reply(
        `ℹ️ <b>Refer & Earn Bot Help</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `• <b>💰 My Balance:</b> View current balance & statistics\n` +
        `• <b>💸 Withdraw:</b> Request instant payout via UPI, PayPal or Bank\n` +
        `• <b>🎬 Watch Ads:</b> Watch sponsored GigaPub ads to earn money\n` +
        `• <b>👥 Invite Friends:</b> Share invite link to earn referral bonuses\n` +
        `• <b>🎁 Bonus:</b> Claim your daily cash reward\n` +
        `• <b>📋 Tasks:</b> Complete high-paying partner tasks\n\n` +
        `Need assistance? Use /support to contact the team!`,
        { parse_mode: 'HTML', reply_markup: buildMainMenuKeyboard() }
      );
    });

    // =======================================================
    // 3. Main Menu Button Handlers (2-Column Reply Keyboard)
    // =======================================================

    // My Balance Handler
    bot.hears(/Balance/i, async (ctx) => {
      await handleBalanceAction(ctx);
    });

    // Withdraw Handler
    bot.hears(/Withdraw/i, async (ctx) => {
      await handleWithdrawAction(ctx);
    });

    // Watch Ads Handler
    bot.hears(/Watch Ads/i, async (ctx) => {
      await handleWatchAdsAction(ctx);
    });

    // Invite Friends Handler
    bot.hears(/Invite/i, async (ctx) => {
      await handleInviteFriendsAction(ctx);
    });

    // Bonus Handler (matches "🎁 Bonus", "Bonus", "Bonus System")
    bot.hears(/Bonus/i, async (ctx) => {
      await handleBonusAction(ctx);
    });

    // Tasks Handler
    bot.hears(/Tasks/i, async (ctx) => {
      await handleTasksAction(ctx);
    });

    // =======================================================
    // 4. Inline Callback Queries for Sub-features
    // =======================================================

    bot.callbackQuery('menu_balance', async (ctx) => {
      await ctx.answerCallbackQuery();
      await handleBalanceAction(ctx);
    });

    bot.callbackQuery('menu_withdraw', async (ctx) => {
      await ctx.answerCallbackQuery();
      await handleWithdrawAction(ctx);
    });

    bot.callbackQuery('menu_refer', async (ctx) => {
      await ctx.answerCallbackQuery();
      await handleInviteFriendsAction(ctx);
    });

    // In-Bot Ad Viewing Callback -> Credit reward on crossing/closing ad
    bot.callbackQuery('bot_watch_ad', async (ctx) => {
      const user = ctx.from;
      const canWatch = db.canWatchAd(user.id);
      if (!canWatch.canWatch) {
        return ctx.answerCallbackQuery({ text: canWatch.reason, show_alert: true });
      }

      await ctx.answerCallbackQuery();
      userAdWatchStartTime.set(user.id, Date.now());

      const symbol = db.getSetting('currencySymbol') || '₹';
      const adReward = db.getSetting('adReward') || 5.0;
      const smartLink = config.adsterraSmartLink || 'https://arwf.org/4/ef8f2a6df3e5243a89a484add434af25';

      const keyboard = new InlineKeyboard()
        .url('🎬 Open Sponsored Ad', smartLink)
        .row()
        .text('❌ Close Ad & Claim (+₹5)', 'claim_closed_ad');

      await ctx.reply(
        `🎬 <b>Watch Ad & Earn</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `1️⃣ Tap <b>"Open Sponsored Ad"</b> below to view the ad.\n` +
        `2️⃣ Watch the complete ad (at least 15–20s).\n` +
        `3️⃣ When finished, tap <b>"Close Ad & Claim (❌)"</b> to credit your balance!\n\n` +
        `💰 <b>Reward:</b> <b>+${symbol}${adReward.toFixed(2)}</b>`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    });

    bot.callbackQuery('claim_closed_ad', async (ctx) => {
      const user = ctx.from;
      const check = db.canWatchAd(user.id);
      if (!check.canWatch) {
        return ctx.answerCallbackQuery({ text: check.reason, show_alert: true });
      }

      const startTime = userAdWatchStartTime.get(user.id) || 0;
      const elapsedSec = (Date.now() - startTime) / 1000;
      if (elapsedSec < 15) {
        const remaining = Math.ceil(15 - elapsedSec);
        return ctx.answerCallbackQuery({
          text: `⏳ You must finish watching the ad! Please wait ${remaining}s before claiming.`,
          show_alert: true
        });
      }

      const result = db.recordDirectAdReward(user.id);
      if (result.success) {
        await ctx.answerCallbackQuery({ text: '🎉 Ad completed & reward credited!' });
        try { await ctx.deleteMessage(); } catch {}

        const symbol = db.getSetting('currencySymbol') || '₹';
        const dailyLimit = parseInt(db.getSetting('dailyAdLimit') || '0', 10);
        const limitSuffix = dailyLimit > 0 ? `/${dailyLimit}` : '';

        const completionText =
          `✅ <b>Ad completed!</b> ${symbol}${result.reward.toFixed(2)} was added to your balance.\n\n` +
          `💰 <b>Balance:</b> ${result.balance.toFixed(2)}\n` +
          `📅 <b>Ads watched today:</b> ${result.adsToday}${limitSuffix}`;

        await ctx.reply(completionText, { parse_mode: 'HTML' });
      } else {
        await ctx.answerCallbackQuery({ text: result.message || 'Could not claim ad reward.', show_alert: true });
      }
    });

    bot.callbackQuery('claim_daily_bonus', async (ctx) => {
      const user = ctx.from;
      const result = db.claimDailyBonus(user.id);
      const symbol = db.getSetting('currencySymbol');
      const currency = db.getSetting('currencyName');

      if (result.success) {
        await ctx.answerCallbackQuery({ text: `🎉 Claimed +${symbol}${result.amount}!` });
        const bonusKeyboard = new InlineKeyboard()
          .text('💰 My Balance', 'menu_balance')
          .webApp('🚀 Open Mini App', config.webAppUrl);

        await ctx.reply(
          `🎉 <b>DAILY BONUS CLAIMED!</b>\n━━━━━━━━━━━━━━━━━━━━━\n` +
          `🔥 <b>Streak:</b> Day ${result.streak} / 7\n` +
          `💰 <b>Reward:</b> <b>+${symbol}${result.amount} ${currency}</b>\n` +
          `💳 <b>New Balance:</b> <b>${symbol}${result.balance.toFixed(2)} ${currency}</b>\n\n` +
          `⏰ <i>Come back tomorrow to continue your streak!</i>`,
          { parse_mode: 'HTML', reply_markup: bonusKeyboard }
        );
      } else {
        await ctx.answerCallbackQuery({ text: result.message, show_alert: true });
      }
    });

    // Withdrawal Method Pickers
    bot.callbackQuery(/^wd_method_(upi|paypal|bank)$/, async (ctx) => {
      const method = ctx.match[1];
      const user = ctx.from;
      const dbUser = db.getUser(user.id);

      if (!dbUser) {
        await ctx.answerCallbackQuery({ text: 'Please send /start first' });
        return;
      }

      // Check 10 referrals & 30 ads rule
      const eligibility = db.getWithdrawalEligibility(user.id);
      if (!eligibility.eligible) {
        await ctx.answerCallbackQuery({
          text: `🔒 Locked: Need ${eligibility.remainingReferrals} more referrals and ${eligibility.remainingAds} more ads!`,
          show_alert: true
        });
        await handleWithdrawAction(ctx);
        return;
      }

      await ctx.answerCallbackQuery();

      userStates.set(user.id, { step: 'awaiting_payment_details', method });

      let promptMsg = '';
      if (method === 'upi') {
        promptMsg = `📱 <b>Enter your UPI ID</b> (e.g. <code>user@paytm</code> or <code>mobile@oksbi</code>):`;
      } else if (method === 'paypal') {
        promptMsg = `📧 <b>Enter your PayPal Email Address:</b>`;
      } else if (method === 'bank') {
        promptMsg = `🏦 <b>Enter your Bank Details in this format:</b>\n\n<code>Account Name, Account Number, IFSC Code, Bank Name</code>`;
      }

      await ctx.reply(promptMsg, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().text('❌ Cancel', 'cancel_withdrawal')
      });
    });

    bot.callbackQuery('cancel_withdrawal', async (ctx) => {
      userStates.delete(ctx.from.id);
      await ctx.answerCallbackQuery({ text: 'Withdrawal cancelled.' });
      try {
        await ctx.deleteMessage();
      } catch {}
      await ctx.reply('Withdrawal cancelled. What would you like to do next?', {
        reply_markup: buildMainMenuKeyboard()
      });
    });

    // Task navigation callbacks (Task #1, #2, etc.)
    bot.callbackQuery(/^task_nav_(\d+)$/, async (ctx) => {
      await ctx.answerCallbackQuery();
      const taskIndex = parseInt(ctx.match[1], 10);
      const card = renderTaskCard(ctx.from.id, taskIndex);
      try {
        await ctx.editMessageText(card.text, {
          parse_mode: 'HTML',
          reply_markup: card.reply_markup,
          disable_web_page_preview: true
        });
      } catch {}
    });

    // Task already completed notification
    bot.callbackQuery(/^(?:task_already_done_|task_already_done:)(.+)$/, async (ctx) => {
      const taskId = ctx.match[1];
      const task = db.getTasks().find(t => t.id === taskId);
      const symbol = db.getSetting('currencySymbol') || '₹';
      const rewardTxt = task ? ` (+${symbol}${task.reward.toFixed(2)})` : '';
      await ctx.answerCallbackQuery({
        text: `✅ You have already completed this task and received your reward${rewardTxt}!`,
        show_alert: true
      });
    });

    bot.callbackQuery(/^(?:task_already_done_|task_already_done:)$/, async (ctx) => {
      await ctx.answerCallbackQuery({ text: '✅ You have already completed this task!', show_alert: true });
    });

    // Task completion callbacks (supports task IDs with underscores)
    bot.callbackQuery(/^(?:task_verify:(.+?):(\d+)|task_verify_(.+))$/, async (ctx) => {
      let taskId = ctx.match[1];
      let taskIndex = ctx.match[2] !== undefined ? parseInt(ctx.match[2], 10) : 0;
      if (!taskId && ctx.match[3]) {
        const payload = ctx.match[3];
        const lastUnderscore = payload.lastIndexOf('_');
        if (lastUnderscore !== -1 && /^\d+$/.test(payload.slice(lastUnderscore + 1))) {
          taskId = payload.slice(0, lastUnderscore);
          taskIndex = parseInt(payload.slice(lastUnderscore + 1), 10);
        } else {
          taskId = payload;
        }
      }

      const user = ctx.from;
      const task = db.getTasks().find(t => t.id === taskId);

      if (!task) {
        await ctx.answerCallbackQuery({ text: 'Task not found!', show_alert: true });
        return;
      }

      // Check if already completed
      const existing = (db.data.task_completions || []).find(c => String(c.user_id) === String(user.id) && c.task_id === taskId);
      if (existing) {
        const symbol = db.getSetting('currencySymbol') || '₹';
        await ctx.answerCallbackQuery({
          text: `✅ You have already completed this task and received +${symbol}${task.reward.toFixed(2)}!`,
          show_alert: true
        });
        return;
      }

      // If channel_join task, check Telegram membership
      if (task.task_type === 'channel_join') {
        const chatTarget = task.chat_id || task.channel_id;
        if (chatTarget) {
          try {
            let member;
            try {
              member = await ctx.api.getChatMember(chatTarget, user.id);
            } catch (err1) {
              if (task.channel_id && task.channel_id !== chatTarget) {
                member = await ctx.api.getChatMember(task.channel_id, user.id);
              } else {
                throw err1;
              }
            }

            const isMember = ['member', 'administrator', 'creator'].includes(member?.status);
            if (!isMember) {
              await ctx.answerCallbackQuery({
                text: `❌ You have not joined ${task.title || 'the channel'} yet! Please tap the Join button, subscribe, and then tap Joined ☑️.`,
                show_alert: true
              });
              return;
            }
          } catch (err) {
            console.warn(`Could not verify channel for task ${taskId}:`, err.message);
            if (err.description?.includes('user not found') || err.description?.includes('PARTICIPANT_ID_INVALID') || err.message?.includes('left')) {
              await ctx.answerCallbackQuery({
                text: `❌ You have not joined ${task.title || 'the channel'} yet! Please tap the Join button, subscribe, and then tap Joined ☑️.`,
                show_alert: true
              });
              return;
            }
            // If bot is not admin or member list is inaccessible, bypass gracefully to not block user
            console.warn(`Channel check bypassed due to bot permission limitation on ${chatTarget}: ${err.message}`);
          }
        }
      }

      const res = db.completeTask(user.id, task.id);
      if (res.success) {
        const symbol = db.getSetting('currencySymbol') || '₹';
        await ctx.answerCallbackQuery({ text: `✅ Task completed! +${symbol}${res.reward.toFixed(2)}` });

        // Update the current task card to show completed state
        try {
          const updatedCard = renderTaskCard(user.id, taskIndex);
          if (updatedCard && updatedCard.task) {
            await ctx.editMessageText(updatedCard.text, {
              parse_mode: 'HTML',
              reply_markup: updatedCard.reply_markup,
              disable_web_page_preview: true
            });
          }
        } catch {}

        const activeTasks = db.getTasks().filter(t => t.is_active);
        const taskKeyboard = new InlineKeyboard()
          .text('💰 My Balance', 'menu_balance');
        if (taskIndex + 1 < activeTasks.length) {
          taskKeyboard.text('📋 Next Task', `task_nav_${taskIndex + 1}`);
        }

        await ctx.reply(
          `🎉 <b>Task Completed: ${res.taskTitle}</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `💰 You earned: <b>+${symbol}${res.reward.toFixed(2)}</b>\n` +
          `💳 New Balance: <b>${symbol}${res.balance.toFixed(2)}</b>`,
          { parse_mode: 'HTML', reply_markup: taskKeyboard }
        );
      } else {
        await ctx.answerCallbackQuery({ text: res.message, show_alert: true });
      }
    });

    // Real-Time Channel Departure Listener (detects when user leaves an official channel)
    bot.on('chat_member', async (ctx) => {
      const update = ctx.chatMember;
      if (!update) return;

      const oldStatus = update.old_chat_member?.status;
      const newStatus = update.new_chat_member?.status;
      const targetUser = update.new_chat_member?.user;
      if (!targetUser) return;

      if (['member', 'administrator', 'creator'].includes(oldStatus) && ['left', 'kicked'].includes(newStatus)) {
        const dbUser = db.getUser(targetUser.id);
        if (dbUser && dbUser.verified_channels) {
          const channelTitle = ctx.chat?.title || ctx.chat?.username || 'Official Channel';
          const PENALTY_AMOUNT = 10.0;
          const penalizedUser = db.penalizeLeftChannel(targetUser.id, channelTitle, PENALTY_AMOUNT);
          const symbol = db.getSetting('currencySymbol') || '₹';

          try {
            await ctx.api.sendMessage(
              targetUser.id,
              `⚠️ <b>Channel Membership Lost!</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `You left our channel: <b>${channelTitle}</b>.\n\n` +
              `🚨 <b>Penalty Applied:</b> <b>-${symbol}${PENALTY_AMOUNT.toFixed(2)}</b> has been deducted from your balance!\n` +
              `💰 Current Balance: <b>${symbol}${penalizedUser ? penalizedUser.balance.toFixed(2) : '0.00'}</b>\n\n` +
              `🔒 <i>Your account access is restricted. Please rejoin our channel and verify to unlock features.</i>`,
              { parse_mode: 'HTML' }
            );
          } catch (err) {
            console.warn(`Could not send penalty message to user ${targetUser.id}:`, err.message);
          }
        }
      }
    });

    // =======================================================
    // 5. Conversational State Handler for Withdrawals
    // =======================================================
    bot.on('message:text', async (ctx, next) => {
      const user = ctx.from;
      const state = userStates.get(user.id);
      if (!state) return next();

      const text = ctx.message.text.trim();

      // Check if user clicked a menu button while in withdrawal flow
      const s = db.getSettings();
      const menuButtons = [
        s.btn_balance || '💰 My Balance',
        s.btn_withdraw || '💸 Withdraw',
        s.btn_ads || '🎬 Watch Ads',
        s.btn_refer || '👥 Invite Friends',
        s.btn_bonus || '🎁 Bonus System',
        s.btn_tasks || '📋 Tasks'
      ];

      if (menuButtons.some(b => text.toLowerCase().includes(b.toLowerCase()))) {
        userStates.delete(user.id);
        return next();
      }

      if (state.step === 'awaiting_payment_details') {
        state.details = text;
        state.step = 'awaiting_amount';
        userStates.set(user.id, state);

        const dbUser = db.getUser(user.id);
        const symbol = db.getSetting('currencySymbol');

        await ctx.reply(
          `✅ <b>Payment Details Saved:</b> <code>${text}</code>\n\n` +
          `💵 Available Balance: <b>${symbol}${dbUser.balance.toFixed(2)}</b>\n` +
          `🎉 <i>Withdrawals Unlocked: You can withdraw ANY amount up to your balance!</i>\n\n` +
          `👇 <b>Enter the amount you wish to withdraw:</b>`,
          {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard().text('❌ Cancel', 'cancel_withdrawal')
          }
        );
        return;
      }

      if (state.step === 'awaiting_amount') {
        const amount = parseFloat(text);
        if (isNaN(amount) || amount <= 0) {
          await ctx.reply('⚠️ Please enter a valid numerical amount (e.g. 10):');
          return;
        }

        userStates.delete(user.id);

        const result = db.createWithdrawal(user.id, {
          method: state.method,
          amount,
          details: state.details
        });

        if (!result.success) {
          await ctx.reply(`❌ <b>${result.message}</b>`, {
            parse_mode: 'HTML',
            reply_markup: buildMainMenuKeyboard()
          });
          return;
        }

        const symbol = db.getSetting('currencySymbol');
        const wd = result.withdrawal;

        await ctx.reply(
          `⏳ <b>Withdrawal request submitted!</b>\n━━━━━━━━━━━━━━━━━━━━━\n` +
          `💰 <b>Amount:</b> ${symbol}${wd.amount}\n` +
          `🆔 <b>Request ID:</b> <code>${wd.id}</code>\n` +
          `💳 <b>Destination:</b> <code>${wd.wallet}</code>\n\n` +
          `<b>Status:</b> ⏳ <i>Pending Review</i>\n\n` +
          `💎 <i>Your request has been logged. Admin will process your payout shortly!</i>`,
          {
            parse_mode: 'HTML',
            reply_markup: buildMainMenuKeyboard()
          }
        );

        // Notify Admin instantly
        await notifyAdminWithdrawal(wd);
      }
    });

    // =======================================================
    // 6. Admin Inline Callbacks for Approving/Rejecting Payouts
    // =======================================================
    bot.callbackQuery(/^(approve|reject)_(WD.+)$/, async (ctx) => {
      if (String(ctx.from.id) !== String(config.adminId)) {
        return ctx.answerCallbackQuery({ text: 'Access denied: Admin only.' });
      }

      const action = ctx.match[1]; // 'approve' | 'reject'
      const reqId = ctx.match[2];

      const reviewStatus = action === 'approve' ? 'approved' : 'rejected';
      const result = db.reviewWithdrawal(reqId, reviewStatus, `Reviewed via Telegram by ${ctx.from.first_name}`);

      if (!result.success) {
        await ctx.answerCallbackQuery({ text: result.message, show_alert: true });
        return;
      }

      const item = result.withdrawal;
      await ctx.answerCallbackQuery({ text: `Withdrawal ${item.id} ${reviewStatus}!` });

      const statusBadge = reviewStatus === 'approved' ? '✅ APPROVED' : '❌ REJECTED';
      const symbol = db.getSetting('currencySymbol');

      await ctx.editMessageText(
        `💸 <b>Withdrawal #${item.id}</b> [${statusBadge}]\n━━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 User: ${item.name} (${item.username ? '@' + item.username : item.user_id})\n` +
        `💰 Amount: <b>${symbol}${item.amount}</b>\n` +
        `💳 Destination: <code>${item.wallet}</code>\n` +
        `⏰ Processed: ${new Date().toLocaleString()}`,
        { parse_mode: 'HTML' }
      );

      // Notify the user on Telegram
      try {
        if (reviewStatus === 'approved') {
          await bot.api.sendMessage(
            item.user_id,
            `🎉 <b>Withdrawal Approved!</b>\n━━━━━━━━━━━━━━━━━━━━━\n` +
            `🆔 Request ID: <code>${item.id}</code>\n` +
            `💰 Amount: <b>${symbol}${item.amount}</b>\n` +
            `💳 Destination: <code>${item.wallet}</code>\n\n` +
            `Funds have been successfully transferred! Thank you for using our bot. 🙌`,
            { parse_mode: 'HTML' }
          );
        } else {
          await bot.api.sendMessage(
            item.user_id,
            `❌ <b>Withdrawal Request Rejected</b>\n━━━━━━━━━━━━━━━━━━━━━\n` +
            `🆔 Request ID: <code>${item.id}</code>\n` +
            `💰 Amount: <b>${symbol}${item.amount}</b>\n` +
            `💳 Destination: <code>${item.wallet}</code>\n\n` +
            `💡 <i>Your balance has been refunded to your wallet balance.</i> Please verify your details or contact support.`,
            { parse_mode: 'HTML' }
          );
        }
      } catch (err) {
        console.warn(`Could not notify user ${item.user_id}: ${err.message}`);
      }
    });

    // =======================================================
    // 7. Admin Commands & Management
    // =======================================================
    bot.command('admin', async (ctx) => {
      const user = ctx.from;
      if (String(user.id) !== String(config.adminId)) {
        await ctx.reply('🚫 <b>Access Denied:</b> Admin only command.', { parse_mode: 'HTML' });
        return;
      }

      const stats = db.getStats();
      const symbol = db.getSetting('currencySymbol');

      const keyboard = new InlineKeyboard()
        .webApp('⚙️ Open Admin WebApp', `${config.webAppUrl}/admin`)
        .row()
        .text('⏳ View Pending Withdrawals', 'admin_view_pending');

      await ctx.reply(
        `🎛 <b>ADMIN CONTROL DASHBOARD</b>\n━━━━━━━━━━━━━━━━━━━━━\n` +
        `👥 <b>Total Users:</b> ${stats.totalUsers} | 🟢 <b>Active:</b> ${stats.activeUsers}\n` +
        `💰 <b>Total Balance:</b> ${symbol}${stats.totalBalance} | 💸 <b>Paid:</b> ${symbol}${stats.totalWithdrawn}\n` +
        `🎬 <b>Ads Watched:</b> ${stats.totalAdsWatched} | 📋 <b>Tasks:</b> ${stats.totalTasksCompleted}\n` +
        `⏳ <b>Pending Withdrawals:</b> <b>${stats.pendingWithdrawalsCount}</b>\n━━━━━━━━━━━━━━━━━━━━━\n` +
        `<b>Quick Bot Commands:</b>\n` +
        `• <code>/addchannel &lt;Name&gt; &lt;@user&gt; [url]</code> - Add force-join channel\n` +
        `• <code>/delchannel &lt;id&gt;</code> | <code>/channels</code> - Manage channels\n` +
        `• <code>/addtask &lt;Title&gt; &lt;Reward&gt; &lt;URL&gt;</code> - Add social task\n` +
        `• <code>/deltask &lt;id&gt;</code> | <code>/taskslist</code> - Manage tasks\n` +
        `• <code>/addbal &lt;userId&gt; &lt;amount&gt;</code> - Credit balance\n` +
        `• <code>/cutbal &lt;userId&gt; &lt;amount&gt;</code> - Debit balance\n` +
        `• <code>/ban &lt;userId&gt;</code> | <code>/unban &lt;userId&gt;</code> - User access\n` +
        `• <code>/checkbal &lt;userId&gt;</code> - View user info & ledger\n` +
        `• <code>/broadcast &lt;msg&gt;</code> - Broadcast announcement\n` +
        `• <code>/maintenance &lt;on|off&gt;</code> - Toggle maintenance mode`,
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    });

    bot.command('maintenance', async (ctx) => {
      if (String(ctx.from.id) !== String(config.adminId)) return;
      const arg = (ctx.match || '').trim().toLowerCase();
      if (arg === 'on') {
        db.updateSettings({ maintenanceMode: true }, ctx.from.id);
        await ctx.reply('🚧 Maintenance mode enabled. Regular users will be blocked.');
      } else if (arg === 'off') {
        db.updateSettings({ maintenanceMode: false }, ctx.from.id);
        await ctx.reply('✅ Maintenance mode disabled. Bot is accessible to all users.');
      } else {
        const cur = db.getSetting('maintenanceMode');
        await ctx.reply(`Maintenance mode is currently: <b>${cur ? 'ON' : 'OFF'}</b>\nUse <code>/maintenance on</code> or <code>/maintenance off</code>`, { parse_mode: 'HTML' });
      }
    });

    bot.command('addbal', async (ctx) => {
      if (String(ctx.from.id) !== String(config.adminId)) return;
      const args = ctx.match.split(' ');
      if (args.length < 2) return ctx.reply('Usage: /addbal <userId> <amount>');
      const targetId = args[0].trim();
      const amount = parseFloat(args[1]);
      if (isNaN(amount) || amount <= 0) return ctx.reply('Invalid amount');

      const user = db.addBalance(targetId, amount, 'bot_command', ctx.from.id);
      if (!user) return ctx.reply(`User ${targetId} not found.`);
      await ctx.reply(`✅ Credited +${amount} to ${user.first_name} (${targetId}). New balance: ${user.balance}`);
    });

    bot.command('cutbal', async (ctx) => {
      if (String(ctx.from.id) !== String(config.adminId)) return;
      const args = ctx.match.split(' ');
      if (args.length < 2) return ctx.reply('Usage: /cutbal <userId> <amount>');
      const targetId = args[0].trim();
      const amount = parseFloat(args[1]);
      if (isNaN(amount) || amount <= 0) return ctx.reply('Invalid amount');

      const user = db.cutBalance(targetId, amount, 'bot_command', ctx.from.id);
      if (!user) return ctx.reply(`User ${targetId} not found.`);
      await ctx.reply(`✂️ Deducted -${amount} from ${user.first_name} (${targetId}). New balance: ${user.balance}`);
    });

    bot.command('ban', async (ctx) => {
      if (String(ctx.from.id) !== String(config.adminId)) return;
      const targetId = ctx.match.trim();
      if (!targetId) return ctx.reply('Usage: /ban <userId>');
      const ok = db.banUser(targetId, true, ctx.from.id);
      if (ok) await ctx.reply(`🚫 User ${targetId} has been suspended.`);
      else await ctx.reply(`User ${targetId} not found.`);
    });

    bot.command('unban', async (ctx) => {
      if (String(ctx.from.id) !== String(config.adminId)) return;
      const targetId = ctx.match.trim();
      if (!targetId) return ctx.reply('Usage: /unban <userId>');
      const ok = db.banUser(targetId, false, ctx.from.id);
      if (ok) await ctx.reply(`✅ User ${targetId} has been reinstated.`);
      else await ctx.reply(`User ${targetId} not found.`);
    });

    bot.command('checkbal', async (ctx) => {
      if (String(ctx.from.id) !== String(config.adminId)) return;
      const targetId = ctx.match.trim();
      if (!targetId) return ctx.reply('Usage: /checkbal <userId>');
      const target = db.getUser(targetId);
      if (!target) return ctx.reply('User not found.');

      const symbol = db.getSetting('currencySymbol');
      const txns = db.getUserTransactions(targetId, 5);

      let txnSummary = txns.map(t => `• [${t.type}] ${t.amount > 0 ? '+' : ''}${t.amount} (Bal: ${t.balance_after})`).join('\n');

      await ctx.reply(
        `👤 <b>User Info:</b> ${target.first_name} ${target.last_name || ''}\n` +
        `🆔 <b>ID:</b> <code>${target.id}</code>\n` +
        `📛 <b>Username:</b> ${target.username ? '@' + target.username : 'None'}\n` +
        `💰 <b>Balance:</b> ${symbol}${target.balance}\n` +
        `👥 <b>Referrals:</b> ${target.referral_count || 0}\n` +
        `🎬 <b>Ads Watched:</b> ${target.ads_watched || 0}\n` +
        `🚫 <b>Banned:</b> ${target.is_banned ? 'YES' : 'NO'}\n\n` +
        `📜 <b>Recent Transactions:</b>\n${txnSummary || 'None'}`,
        { parse_mode: 'HTML' }
      );
    });

    bot.command('broadcast', async (ctx) => {
      const user = ctx.from;
      const isAdmin = String(user.id) === String(config.adminId) ||
                      db.data.admins?.some(a => String(a.id) === String(user.id));

      if (!isAdmin) {
        return ctx.reply('🚫 <b>Access Denied:</b> Admin only command.', { parse_mode: 'HTML' });
      }

      const replyMsg = ctx.message?.reply_to_message;
      const text = (ctx.match || '').trim();

      if (!replyMsg && !text) {
        return ctx.reply(
          `📢 <b>BROADCAST INSTRUCTIONS</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `• <b>Text Broadcast:</b>\n<code>/broadcast Your message here</code>\n\n` +
          `• <b>Forward/Media Broadcast:</b>\nReply to any post, photo, or video with <code>/broadcast</code> to forward it to all users!`,
          { parse_mode: 'HTML' }
        );
      }

      const users = Object.values(db.data.users);
      const statusMsg = await ctx.reply(`📢 Broadcasting announcement to <b>${users.length}</b> registered users...`, { parse_mode: 'HTML' });

      let sent = 0;
      let failed = 0;

      for (const u of users) {
        try {
          if (replyMsg) {
            await ctx.api.copyMessage(u.id, ctx.chat.id, replyMsg.message_id);
          } else {
            await bot.api.sendMessage(
              u.id,
              `📢 <b>ANNOUNCEMENT</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n${text}`,
              { parse_mode: 'HTML' }
            );
          }
          sent++;
          await new Promise(r => setTimeout(r, 40));
        } catch {
          failed++;
        }
      }

      // Record in broadcasts database
      try {
        db.createBroadcast({
          title: 'Bot Broadcast',
          text: replyMsg ? '[Replied Media/Message]' : text,
          target: 'all'
        }, user.id);
      } catch {}

      const reportText =
        `✅ <b>BROADCAST COMPLETED!</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👥 <b>Total Users:</b> ${users.length}\n` +
        `✉️ <b>Delivered:</b> ${sent}\n` +
        `🚫 <b>Blocked/Failed:</b> ${failed}`;

      try {
        await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, reportText, { parse_mode: 'HTML' });
      } catch {
        await ctx.reply(reportText, { parse_mode: 'HTML' });
      }
    });

    // Admin Channel Management Commands
    bot.command('addchannel', async (ctx) => {
      if (String(ctx.from.id) !== String(config.adminId)) return;
      const text = (ctx.match || '').trim();
      let parts = [];
      if (text.includes('|')) {
        parts = text.split('|').map(s => s.trim());
      } else {
        parts = text.split(/\s+/);
      }

      if (parts.length < 2) {
        return ctx.reply(
          `ℹ️ <b>Usage:</b> <code>/addchannel &lt;Name&gt; &lt;@username_or_id&gt; [invite_url]</code>\n\n` +
          `<b>Example:</b>\n<code>/addchannel Updates @mychannel https://t.me/mychannel</code>`,
          { parse_mode: 'HTML' }
        );
      }

      const name = parts[0];
      const target = parts[1];
      const inviteUrl = parts[2] || (target.startsWith('@') ? `https://t.me/${target.replace(/^@/, '')}` : '');
      const isId = target.startsWith('-') || /^\d+$/.test(target);

      const newChan = db.addChannel({
        name,
        username: isId ? '' : (target.startsWith('@') ? target : `@${target}`),
        channel_id: isId ? target : '',
        invite_url: inviteUrl,
        button_label: `📢 Join ${name}`
      }, ctx.from.id);

      await ctx.reply(
        `✅ <b>Force-Join Channel Added!</b>\n━━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 <b>ID:</b> <code>${newChan.id}</code>\n` +
        `📛 <b>Name:</b> ${newChan.name}\n` +
        `📢 <b>Target:</b> ${newChan.username || newChan.channel_id}\n` +
        `🔗 <b>URL:</b> ${newChan.invite_url || 'None'}\n\n` +
        `<i>All regular users must join this channel before accessing the bot.</i>`,
        { parse_mode: 'HTML' }
      );
    });

    bot.command('delchannel', async (ctx) => {
      if (String(ctx.from.id) !== String(config.adminId)) return;
      const chanId = (ctx.match || '').trim();
      if (!chanId) {
        return ctx.reply('Usage: /delchannel <channel_id>\nUse /channels to view active channel IDs.');
      }

      const ok = db.deleteChannel(chanId, ctx.from.id);
      if (ok) {
        await ctx.reply(`🗑️ Channel <code>${chanId}</code> successfully deleted.`, { parse_mode: 'HTML' });
      } else {
        const found = db.getChannels().find(c => c.username?.toLowerCase() === chanId.toLowerCase() || c.id === chanId);
        if (found) {
          db.deleteChannel(found.id, ctx.from.id);
          await ctx.reply(`🗑️ Channel <b>${found.name}</b> (${found.id}) successfully deleted.`, { parse_mode: 'HTML' });
        } else {
          await ctx.reply(`❌ Channel <code>${chanId}</code> not found.`, { parse_mode: 'HTML' });
        }
      }
    });

    bot.command('channels', async (ctx) => {
      if (String(ctx.from.id) !== String(config.adminId)) return;
      const channels = db.getChannels();
      if (channels.length === 0) {
        return ctx.reply('🔐 <b>No force-join channels configured.</b>\nAdd one using: <code>/addchannel &lt;Name&gt; &lt;@username&gt;</code>', { parse_mode: 'HTML' });
      }

      let text = `🔐 <b>CONFIGURED FORCE-JOIN CHANNELS (${channels.length})</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
      channels.forEach((c, i) => {
        text += `${i + 1}️⃣ <b>${c.name}</b>\n` +
                `• ID: <code>${c.id}</code>\n` +
                `• Handle: ${c.username || c.channel_id || 'N/A'}\n` +
                `• URL: ${c.invite_url || 'N/A'}\n` +
                `• Status: ${c.is_enabled ? '🟢 Active' : '⚪ Disabled'}\n\n`;
      });
      text += `Delete a channel: <code>/delchannel &lt;id&gt;</code>`;

      await ctx.reply(text, { parse_mode: 'HTML', disable_web_page_preview: true });
    });

    // Admin Task Management Commands
    bot.command('addtask', async (ctx) => {
      if (String(ctx.from.id) !== String(config.adminId)) return;
      const text = (ctx.match || '').trim();
      let parts = [];
      if (text.includes('|')) {
        parts = text.split('|').map(s => s.trim());
      } else {
        parts = text.split(/\s+/);
      }

      if (parts.length < 3) {
        return ctx.reply(
          `ℹ️ <b>Usage:</b> <code>/addtask &lt;Title&gt; &lt;Reward&gt; &lt;URL_or_Channel&gt; [Description]</code>\n\n` +
          `<b>Or with pipes:</b>\n<code>/addtask Title | Reward | URL | Description</code>\n\n` +
          `<b>Example:</b>\n<code>/addtask "Follow on Twitter" 0.50 https://x.com/ourbrand</code>`,
          { parse_mode: 'HTML' }
        );
      }

      const title = parts[0];
      const reward = parseFloat(parts[1]) || 0.10;
      const targetUrl = parts[2];
      const desc = parts[3] || `Complete to earn reward points`;
      const isChannel = targetUrl.startsWith('@') || targetUrl.includes('t.me/');

      const newTask = db.addTask({
        title,
        reward,
        description: desc,
        target_url: targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`,
        task_type: isChannel ? 'channel_join' : 'url_visit',
        chat_id: targetUrl.startsWith('@') ? targetUrl : ''
      }, ctx.from.id);

      const symbol = db.getSetting('currencySymbol');
      await ctx.reply(
        `✅ <b>New Task Created!</b>\n━━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 <b>ID:</b> <code>${newTask.id}</code>\n` +
        `📋 <b>Title:</b> ${newTask.title}\n` +
        `💰 <b>Reward:</b> +${symbol}${newTask.reward}\n` +
        `🔗 <b>Target:</b> ${newTask.target_url}\n` +
        `📝 <b>Description:</b> ${newTask.description}`,
        { parse_mode: 'HTML' }
      );
    });

    bot.command('deltask', async (ctx) => {
      if (String(ctx.from.id) !== String(config.adminId)) return;
      const taskId = (ctx.match || '').trim();
      if (!taskId) return ctx.reply('Usage: /deltask <task_id>\nUse /taskslist to view active tasks.');

      const ok = db.deleteTask(taskId, ctx.from.id);
      if (ok) {
        await ctx.reply(`🗑️ Task <code>${taskId}</code> deleted.`, { parse_mode: 'HTML' });
      } else {
        await ctx.reply(`❌ Task <code>${taskId}</code> not found.`, { parse_mode: 'HTML' });
      }
    });

    bot.command(['taskslist', 'alltasks'], async (ctx) => {
      if (String(ctx.from.id) !== String(config.adminId)) return;
      const tasks = db.getTasks();
      if (tasks.length === 0) {
        return ctx.reply('📋 <b>No tasks created yet.</b>\nAdd one using: <code>/addtask &lt;Title&gt; &lt;Reward&gt; &lt;URL&gt;</code>', { parse_mode: 'HTML' });
      }

      const symbol = db.getSetting('currencySymbol');
      let text = `📋 <b>AVAILABLE TASKS (${tasks.length})</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
      tasks.forEach((t, i) => {
        text += `${i + 1}️⃣ <b>${t.title}</b>\n` +
                `• ID: <code>${t.id}</code>\n` +
                `• Reward: +${symbol}${t.reward}\n` +
                `• Type: ${t.task_type}\n` +
                `• URL: ${t.target_url}\n` +
                `• Completions: ${t.completions_count || 0}\n\n`;
      });
      text += `Delete a task: <code>/deltask &lt;task_id&gt;</code>`;

      await ctx.reply(text, { parse_mode: 'HTML', disable_web_page_preview: true });
    });

    bot.command('support', async (ctx) => {
      const sup = db.getSetting('supportUsername') || config.supportUsername;
      const url = `https://t.me/${sup.replace(/^@/, '')}`;
      await ctx.reply(
        `💬 <b>Support & Assistance</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Have questions or need help with withdrawals?\n` +
        `Click below to contact our official support team:`,
        {
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard().url('💬 Contact Support', url)
        }
      );
    });

    // Start Bot Long-Polling if not in webhook mode
    const isWebhookMode = process.env.VERCEL || process.env.USE_WEBHOOK === 'true';
    if (!isWebhookMode) {
      bot.start({
        onStart: (botInfo) => {
          console.log(`🤖 Telegram Bot @${botInfo.username} is connected and listening for updates!`);
        }
      });
    } else {
      console.log('🤖 Telegram Bot initialized in Webhook mode (Grammy webhookCallback active)');
    }

    return bot;
  } catch (err) {
    console.error('Failed to initialize Telegram Bot:', err.message);
    return null;
  }
}

/**
 * Sends the welcome start message and renders the persistent 2-column Reply Keyboard
 */
async function showWelcomeAndMainMenu(ctx, user) {
  const botUser = bot.botInfo?.username || config.botUsername || 'easyandfastearn_bot';
  const refLink = `https://t.me/${botUser}?start=ref_${user.id}`;
  const rank = db.getUserWeeklyRank(user.id);
  const symbol = db.getSetting('currencySymbol') || '$';
  const refReward = db.getSetting('referralReward');
  const adReward = db.getSetting('adReward');

  const variables = {
    first_name: user.first_name,
    username: user.username ? `@${user.username}` : user.first_name,
    user_id: user.id,
    balance: user.balance.toFixed(2),
    referrals: user.referral_count || 0,
    referral_link: refLink,
    referral_reward: refReward,
    ad_reward: adReward,
    currency_symbol: symbol,
    weekly_rank: rank
  };

  const rendered = db.renderTemplate('START_MESSAGE', variables);

  // Send single welcome card with the 2-column Reply Keyboard attached
  await ctx.reply(rendered.text, {
    parse_mode: 'HTML',
    reply_markup: buildMainMenuKeyboard()
  });
}

/**
 * Handle My Balance Action (Master Prompt Section 6)
 */
async function handleBalanceAction(ctx) {
  const user = ctx.from;
  const dbUser = db.getUser(user.id) || db.getOrCreateUser(user).user;
  const rank = db.getUserWeeklyRank(user.id);
  const symbol = db.getSetting('currencySymbol') || '$';
  const currency = db.getSetting('currencyName') || 'Points';

  const variables = {
    first_name: user.first_name,
    username: user.username || user.first_name,
    user_id: user.id,
    currency_symbol: symbol,
    currency_name: currency,
    balance: dbUser.balance.toFixed(2),
    referrals: dbUser.referral_count || 0,
    ads_watched: dbUser.ads_watched || 0,
    bonuses_claimed: dbUser.bonuses_claimed || 0,
    bonuses_earned: ((dbUser.bonuses_claimed || 0) * db.getSetting('dailyBonus')).toFixed(2),
    rank: rank,
    weekly_rank: rank
  };

  const keyboard = new InlineKeyboard()
    .text('💸 Withdraw', 'menu_withdraw')
    .text('👥 Invite Friends', 'menu_refer')
    .row()
    .webApp('🚀 Open Mini App', config.webAppUrl);

  await sendTemplatedMessage(ctx, 'BALANCE_MESSAGE', variables, keyboard);
}

/**
 * Handle Withdraw Action
 */
async function handleWithdrawAction(ctx) {
  const user = ctx.from;
  const dbUser = db.getUser(user.id) || db.getOrCreateUser(user).user;
  const symbol = db.getSetting('currencySymbol');
  const eligibility = db.getWithdrawalEligibility(user.id);

  if (!eligibility.eligible) {
    const refBadge = eligibility.currentReferrals >= 10 ? '✅ Completed' : `⏳ ${eligibility.currentReferrals} / 10 (need ${eligibility.remainingReferrals} more)`;
    const adBadge = eligibility.currentAds >= 30 ? '✅ Completed' : `⏳ ${eligibility.currentAds} / 30 (need ${eligibility.remainingAds} more)`;

    const lockCard =
      `🔒 <b>WITHDRAWAL LOCKED</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `To ensure real user activity and qualify for withdrawals, you must complete the requirements below:\n\n` +
      `👥 <b>Invited Referrals:</b> ${refBadge}\n` +
      `🎬 <b>Ads Watched:</b> ${adBadge}\n\n` +
      `💵 <b>Available Balance:</b> <b>${symbol}${dbUser.balance.toFixed(2)}</b>\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🎉 <i>Once unlocked, you can withdraw ANY amount with instant processing!</i>`;

    const lockKeyboard = new InlineKeyboard()
      .text('👥 Invite Friends', 'menu_refer')
      .text('🎬 Watch Ads', 'bot_watch_ad')
      .row()
      .webApp('🚀 Open Mini App Wallet', `${config.webAppUrl}?tab=wallet`);

    await ctx.reply(lockCard, { parse_mode: 'HTML', reply_markup: lockKeyboard });
    return;
  }

  const variables = {
    first_name: user.first_name,
    balance: dbUser.balance.toFixed(2),
    currency_symbol: symbol
  };

  const keyboard = new InlineKeyboard()
    .text('🇮🇳 UPI', 'wd_method_upi')
    .text('💳 PayPal', 'wd_method_paypal')
    .text('🏦 Bank Transfer', 'wd_method_bank')
    .row()
    .webApp('🚀 Open Mini App Wallet', `${config.webAppUrl}?tab=wallet`);

  await sendTemplatedMessage(ctx, 'WITHDRAW_MESSAGE', variables, keyboard);
}

/**
 * Handle Watch Ads Action
 */
async function handleWatchAdsAction(ctx) {
  const user = ctx.from;
  const dbUser = db.getUser(user.id) || db.getOrCreateUser(user).user;

  const todayStr = db.getTodayString();
  const adsToday = dbUser.ads_today_date === todayStr ? (dbUser.ads_today || 0) : 0;
  const adReward = db.getSetting('adReward') || 5.0;
  const dailyLimit = parseInt(db.getSetting('dailyAdLimit') || '0', 10);
  const totalAds = dbUser.ads_watched || 0;
  const symbol = db.getSetting('currencySymbol') || '₹';

  // 1. Check daily ad limit (only when dailyLimit > 0)
  if (dailyLimit > 0 && adsToday >= dailyLimit) {
    await ctx.reply(
      `🚫 <b>Daily Limit Reached</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `You have watched all available ads for today.\n` +
      `👀 <b>Ads watched today:</b> ${adsToday}/${dailyLimit}\n` +
      `⏰ <i>Come back tomorrow for more ads!</i>`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  // 2. Check ad cooldown
  const canWatch = db.canWatchAd(user.id);
  if (!canWatch.canWatch && canWatch.remainingSeconds) {
    await ctx.reply(
      `⏳ <b>Ad Cooldown Active</b>\n\n` +
      `Please wait <b>${canWatch.remainingSeconds}s</b> before watching another ad.`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  const variables = {
    first_name: user.first_name,
    ads_today: adsToday,
    ads_today_display: dailyLimit > 0 ? `${adsToday}/${dailyLimit}` : `${adsToday}`,
    daily_ad_limit: dailyLimit > 0 ? `${dailyLimit}` : 'unlimited',
    daily_ad_limit_text: dailyLimit > 0 ? `up to ${dailyLimit} ads` : 'unlimited ads',
    ad_reward: adReward.toFixed(2),
    total_ads_watched: totalAds,
    currency_symbol: symbol
  };

  const keyboard = new InlineKeyboard();
  if (config.webAppUrl && config.webAppUrl.startsWith('https://')) {
    keyboard.webApp('🎬 Open Ad', `${config.webAppUrl}/ad.html?userId=${user.id}`).row();
  } else {
    keyboard.text('🎬 Open Ad', 'bot_watch_ad').row();
  }
  const adsterraLink = config.adsterraSmartLink || 'https://arwf.org/4/ef8f2a6df3e5243a89a484add434af25';
  keyboard.url('⚡ High Earning SmartLink', adsterraLink).row();
  keyboard.url('🔥 Sponsor Offer 1', 'https://uplcm.com/4/11717959').row();
  keyboard.url('💎 Sponsor Offer 2', 'https://uplcm.com/4/11717884');

  // Note: Open Mini App button removed as requested
  await sendTemplatedMessage(ctx, 'WATCH_AD_MESSAGE', variables, keyboard);
}

/**
 * Handle Invite Friends Action
 */
async function handleInviteFriendsAction(ctx) {
  const user = ctx.from;
  const botUser = bot.botInfo?.username || config.botUsername || 'easyandfastearn_bot';
  const refLink = `https://t.me/${botUser}?start=ref_${user.id}`;
  const dbUser = db.getUser(user.id) || db.getOrCreateUser(user).user;
  const rank = db.getUserWeeklyRank(user.id);
  const refReward = db.getSetting('referralReward');
  const currency = db.getSetting('currencyName') || 'Points';
  const symbol = db.getSetting('currencySymbol') || '₹';

  const refEarnings = ((dbUser.referral_count || 0) * refReward).toFixed(2);

  const shareText = encodeURIComponent(
    `🎁 Join this bot to earn free cash by watching ads and referring friends! Claim your reward now: ${refLink}`
  );
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${shareText}`;

  const variables = {
    first_name: user.first_name,
    referral_link: refLink,
    referral_reward: refReward,
    referrals: dbUser.referral_count || 0,
    referral_earnings: refEarnings,
    currency_symbol: symbol,
    currency_name: currency,
    weekly_rank: rank
  };

  const keyboard = new InlineKeyboard()
    .url('📤 Share Referral Link', shareUrl)
    .row()
    .webApp('🚀 Open Mini App', config.webAppUrl);

  await sendTemplatedMessage(ctx, 'REFERRAL_MESSAGE', variables, keyboard);
}

/**
 * Handle Bonus Action (Master Prompt Section 8)
 */
async function handleBonusAction(ctx) {
  const user = ctx.from;
  const dbUser = db.getUser(user.id) || db.getOrCreateUser(user).user;
  const symbol = db.getSetting('currencySymbol') || '₹';
  const currency = db.getSetting('currencyName') || 'Points';
  const check = db.canClaimDailyBonus(user.id);
  const ladder = db.data.bonuses?.daily_ladder || [5, 10, 15, 20, 25, 30, 35];

  const streak = dbUser.daily_streak || 0;
  const nextStreak = check.canClaim ? ((streak % 7) + 1) : (streak || 1);
  const nextAmount = ladder[nextStreak - 1] || ladder[0];

  let statusText = '';
  const keyboard = new InlineKeyboard();

  if (check.canClaim) {
    statusText = `🎉 <b>Status:</b> Ready to claim Day ${nextStreak} bonus!\n\n👇 <i>Tap below to claim your cash reward:</i>`;
    keyboard.text('🎁 CLAIM DAILY BONUS', 'claim_daily_bonus').row();
  } else {
    const hours = Math.floor(check.waitMinutes / 60);
    const mins = check.waitMinutes % 60;
    statusText = `⏰ <b>Status:</b> Already claimed today's bonus!\n⏳ <i>Next reward available in: <b>${hours}h ${mins}m</b></i>`;
    keyboard.text('💰 My Balance', 'menu_balance').row();
  }

  keyboard.webApp('🚀 Open Mini App', config.webAppUrl);

  const bonusCard =
    `🎁 <b>DAILY BONUS REWARDS</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Claim your free cash bonus every 24 hours to build your streak!\n\n` +
    `🔥 <b>Current Streak:</b> Day ${streak} / 7\n` +
    `💰 <b>Next Reward:</b> <b>+${symbol}${nextAmount} ${currency}</b>\n\n` +
    `<b>📅 7-Day Streak Ladder:</b>\n` +
    `• Day 1: ${symbol}5 ${streak >= 1 ? '✅' : ''}\n` +
    `• Day 2: ${symbol}10 ${streak >= 2 ? '✅' : ''}\n` +
    `• Day 3: ${symbol}15 ${streak >= 3 ? '✅' : ''}\n` +
    `• Day 4: ${symbol}20 ${streak >= 4 ? '✅' : ''}\n` +
    `• Day 5: ${symbol}25 ${streak >= 5 ? '✅' : ''}\n` +
    `• Day 6: ${symbol}30 ${streak >= 6 ? '✅' : ''}\n` +
    `• Day 7: ${symbol}35 🌟 ${streak >= 7 ? '✅' : ''}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `${statusText}`;

  await ctx.reply(bonusCard, {
    parse_mode: 'HTML',
    reply_markup: keyboard
  });
}

/**
 * Renders individual task card matching requested template:
 * 📋 Task #2
 * 📌 Join Telegram Channel
 * 💰 Reward: 0.50
 * Join Telegram Channel 📢 and earn 0.5$ extra rewards,
 * after that click Joined ☑️ button to verify and continue.
 * ⚠️ Important: Task will be checked and reviewed by our team carefully. Only real and verified completions will be rewarded.
 * 📊 Progress: 2/8 tasks
 */
export function renderTaskCard(userId, taskIndex = 0) {
  const activeTasks = db.getTasks().filter(t => t.is_active);
  if (activeTasks.length === 0) {
    return {
      text: '📋 <b>No tasks currently available.</b> Check back later for new earning tasks!',
      reply_markup: undefined,
      task: null
    };
  }

  const userTasks = db.getUserTasks(userId);
  const completedCount = userTasks.filter(t => t.is_completed).length;
  const totalTasks = activeTasks.length;

  const validIndex = Math.max(0, Math.min(taskIndex, totalTasks - 1));
  const task = activeTasks[validIndex];
  const isDone = userTasks.some(t => t.id === task.id && t.is_completed);
  const taskNum = validIndex + 1;
  const symbol = db.getSetting('currencySymbol') || '₹';

  const desc = task.description || `Join ${task.title} 📢 and earn extra rewards,`;

  let text;
  if (isDone) {
    text =
      `📋 <b>Task #${taskNum}</b>\n\n` +
      `📌 <b>${task.title}</b>\n\n` +
      `💰 <b>Reward:</b> ${symbol}${task.reward.toFixed(2)}\n\n` +
      `✅ <b>Status: COMPLETED & REWARDED (+${symbol}${task.reward.toFixed(2)})</b>\n\n` +
      `🎉 You have already completed this task and received your reward!\n\n` +
      `⚠️ <b>Important:</b> Keep subscribed to all joined channels. If you leave, penalties may be applied.\n\n` +
      `📊 <b>Progress:</b> ${completedCount}/${totalTasks} tasks`;
  } else {
    text =
      `📋 <b>Task #${taskNum}</b>\n\n` +
      `📌 <b>${task.title}</b>\n\n` +
      `💰 <b>Reward:</b> ${symbol}${task.reward.toFixed(2)}\n\n` +
      `${desc}\n` +
      `after that click Joined ☑️ button to verify and continue.\n\n` +
      `⚠️ <b>Important:</b> Task will be checked and reviewed by our team carefully. Only real and verified completions will be rewarded.\n\n` +
      `📊 <b>Progress:</b> ${completedCount}/${totalTasks} tasks`;
  }

  const keyboard = new InlineKeyboard();

  if (task.target_url) {
    const btnLabel = task.task_type === 'channel_join' ? '📌 Join Telegram Channel' : '🚀 Open Task';
    keyboard.url(btnLabel, task.target_url).row();
  }

  if (isDone) {
    keyboard.text('✅ Already Completed', `task_already_done_${task.id}`);
  } else {
    keyboard.text('Joined ☑️', `task_verify:${task.id}:${validIndex}`);
  }

  if (totalTasks > 1) {
    keyboard.row();
    if (validIndex > 0) {
      keyboard.text('⬅️ Prev', `task_nav_${validIndex - 1}`);
    }
    keyboard.text(`${taskNum}/${totalTasks}`, `task_nav_${validIndex}`);
    if (validIndex < totalTasks - 1) {
      keyboard.text('Next ➡️', `task_nav_${validIndex + 1}`);
    }
  }

  // Note: Open Mini App button removed as requested
  return { text, reply_markup: keyboard, task, validIndex, completedCount, totalTasks, isDone };
}

/**
 * Handle Tasks Action
 */
async function handleTasksAction(ctx) {
  const user = ctx.from;

  // 1. Check force-join channels
  const channelCheck = await checkUserChannels(ctx, user.id);
  if (!channelCheck.allJoined) {
    await promptForceJoin(ctx, channelCheck.missing);
    return;
  }

  // 2. Check if user completed any channel_join tasks that they have now left
  const userTasks = db.getUserTasks(user.id);
  const completedChannelTasks = userTasks.filter(t => t.task_type === 'channel_join' && t.chat_id && t.is_completed);

  for (const ct of completedChannelTasks) {
    try {
      const member = await ctx.api.getChatMember(ct.chat_id, user.id);
      const isMember = ['member', 'administrator', 'creator'].includes(member.status);
      if (!isMember) {
        // User left task channel -> Apply ₹10 penalty and revoke task completion
        const PENALTY_AMOUNT = 10.0;
        const penalizedUser = db.penalizeLeftChannel(user.id, ct.chat_id, PENALTY_AMOUNT);
        db.revokeTaskCompletion(user.id, ct.id);
        const symbol = db.getSetting('currencySymbol') || '₹';

        await ctx.reply(
          `⚠️ <b>Channel Membership Lost!</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `You left the task channel: <b>${ct.title}</b> (${ct.chat_id}).\n\n` +
          `🚨 <b>Penalty Applied:</b> <b>-${symbol}${PENALTY_AMOUNT.toFixed(2)}</b> was deducted from your balance!\n` +
          `💰 Current Balance: <b>${symbol}${penalizedUser ? penalizedUser.balance.toFixed(2) : '0.00'}</b>\n\n` +
          `🔒 <i>Please rejoin the channel and tap Joined ☑️ to continue earning.</i>`,
          { parse_mode: 'HTML' }
        ).catch(() => {});
      }
    } catch (e) {}
  }

  const activeTasks = db.getTasks().filter(t => t.is_active);

  if (activeTasks.length === 0) {
    await ctx.reply('📋 <b>No tasks currently available.</b> Check back later for new earning tasks!', { parse_mode: 'HTML' });
    return;
  }

  const refreshedUserTasks = db.getUserTasks(user.id);
  // Default to first uncompleted task if available
  let firstUnfinished = activeTasks.findIndex(t => !refreshedUserTasks.find(ut => ut.id === t.id && ut.is_completed));
  if (firstUnfinished === -1) firstUnfinished = 0;

  const card = renderTaskCard(user.id, firstUnfinished);

  await ctx.reply(card.text, {
    parse_mode: 'HTML',
    reply_markup: card.reply_markup,
    disable_web_page_preview: true
  });
}

/**
 * Send withdrawal notification to admin via Bot
 */
export async function notifyAdminWithdrawal(withdrawal) {
  if (!bot || !config.adminId) return;

  try {
    const symbol = db.getSetting('currencySymbol');
    const keyboard = new InlineKeyboard()
      .text('✅ Approve', `approve_${withdrawal.id}`)
      .text('❌ Reject', `reject_${withdrawal.id}`);

    await bot.api.sendMessage(
      config.adminId,
      `💸 <b>New Withdrawal Request!</b>\n━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 <b>ID:</b> <code>${withdrawal.id}</code>\n` +
      `👤 <b>User:</b> ${withdrawal.name} (${withdrawal.username || withdrawal.user_id})\n` +
      `💰 <b>Amount:</b> <b>${symbol}${withdrawal.amount}</b>\n` +
      `💳 <b>Method:</b> ${withdrawal.method.toUpperCase()}\n` +
      `📝 <b>Destination:</b> <code>${withdrawal.wallet}</code>\n` +
      `📅 <b>Requested:</b> ${new Date(withdrawal.created_at).toLocaleString()}\n━━━━━━━━━━━━━━━━━━━━━\n` +
      `Choose action:`,
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  } catch (err) {
    console.error('Could not notify admin of withdrawal:', err.message);
  }
}

/**
 * Formats referral notification message sent to inviter (sender)
 */
export function buildReferralJoinedMessage(user, qualResult) {
  const symbol = db.getSetting('currencySymbol') || '₹';
  const userDisplayName = user.username
    ? `<a href="tg://user?id=${user.id}">${user.first_name || 'User'}</a> (@${user.username})`
    : `<a href="tg://user?id=${user.id}">${user.first_name || 'A user'}</a>`;

  return (
    `🎉 <b>NEW REFERRAL JOINED!</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `👤 <b>${userDisplayName}</b> has successfully joined the bot using your link and reward is credited to your balance!\n\n` +
    `💰 <b>Reward Credited:</b> <b>+${symbol}${qualResult.reward.toFixed(2)}</b>\n` +
    `💵 <b>New Balance:</b> <b>${symbol}${qualResult.newBalance.toFixed(2)}</b>`
  );
}

/**
 * Notify referral inviter (sender) when a new user joins via their referral link
 */
export async function notifyReferralJoined(referrerId, user, qualResult) {
  if (!bot || !referrerId || !qualResult || !qualResult.rewarded) return;
  try {
    const text = buildReferralJoinedMessage(user, qualResult);
    await bot.api.sendMessage(referrerId, text, { parse_mode: 'HTML' });
  } catch (err) {
    console.warn(`Could not send referral notification to ${referrerId}:`, err.message);
  }
}

export function getBot() {
  return bot;
}

export { bot };

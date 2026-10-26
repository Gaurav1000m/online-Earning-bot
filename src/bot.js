import { Bot, InlineKeyboard, Keyboard } from 'grammy';
import config from './config.js';
import db from './db.js';

let bot = null;

// User state machine for conversational withdrawal flow
const userStates = new Map();

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
      // If bot is not administrator in channel or channel is private, skip failing
      console.warn(`Could not verify channel ${target}: ${err.message}`);
    }
  }

  return { allJoined: missing.length === 0, missing };
}

/**
 * Shows force join message with individual channel buttons and Verify button
 */
async function promptForceJoin(ctx, missingChannels) {
  const keyboard = new InlineKeyboard();

  missingChannels.forEach(ch => {
    const url = ch.invite_url || (ch.username ? `https://t.me/${ch.username.replace(/^@/, '')}` : '#');
    const label = ch.button_label || `📢 Join ${ch.name}`;
    keyboard.url(label, url).row();
  });

  keyboard.text('🔐 VERIFY MEMBERSHIP', 'verify_channels');

  let listText = missingChannels.map((c, i) => `${i + 1}️⃣ <b>${c.name}</b> (${c.username || 'Official'})`).join('\n');

  await ctx.reply(
    `━━━━━━━━━━━━━━━━━━\n` +
    `🔐 <b>ACCESS REQUIRED</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `To use this bot and start earning, you must join all required Telegram channels below:\n\n` +
    `${listText}\n\n` +
    `👇 <i>Tap the channels to join, then click Verify Membership!</i>`,
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

      // Verify Force-Join Channels
      const channelCheck = await checkUserChannels(ctx, user.id);
      if (!channelCheck.allJoined) {
        try {
          await ctx.reply('🔐 <b>Membership Required</b>\nPlease join all required channels to unlock the main menu.', {
            parse_mode: 'HTML',
            reply_markup: { remove_keyboard: true }
          });
        } catch {}
        await promptForceJoin(ctx, channelCheck.missing);
        return;
      }

      // If user joined directly with 0 force-join channels required, check referral qualification
      const qualResult = db.qualifyReferral(user.id);
      if (qualResult.rewarded && qualResult.referrerId) {
        const symbol = db.getSetting('currencySymbol');
        try {
          await bot.api.sendMessage(
            qualResult.referrerId,
            `🎉 <b>NEW REFERRAL!</b>\n━━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 <a href="tg://user?id=${user.id}">${user.first_name}</a> joined using your referral link!\n` +
            `💰 <b>You earned: +${symbol}${qualResult.reward}</b>\n` +
            `💵 <b>New Balance:</b> ${symbol}${qualResult.newBalance}`,
            { parse_mode: 'HTML' }
          );
        } catch (e) {}
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

      // Rule 44: Qualify referral reward upon successful force-join verification!
      const qualResult = db.qualifyReferral(user.id);
      if (qualResult.rewarded && qualResult.referrerId) {
        const symbol = db.getSetting('currencySymbol');
        try {
          await bot.api.sendMessage(
            qualResult.referrerId,
            `🎉 <b>NEW REFERRAL!</b>\n━━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 <a href="tg://user?id=${user.id}">${user.first_name}</a> joined using your referral link and verified their membership!\n` +
            `💰 <b>You earned: +${symbol}${qualResult.reward}</b>\n` +
            `💵 <b>New Balance:</b> ${symbol}${qualResult.newBalance}`,
            { parse_mode: 'HTML' }
          );
        } catch (e) {}
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
    bot.hears(/My Balance/i, async (ctx) => {
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
    bot.hears(/Invite Friends/i, async (ctx) => {
      await handleInviteFriendsAction(ctx);
    });

    // Bonus System Handler
    bot.hears(/Bonus System/i, async (ctx) => {
      await handleBonusAction(ctx);
    });

    // Tasks Handler
    bot.hears(/Tasks/i, async (ctx) => {
      await handleTasksAction(ctx);
    });

    // =======================================================
    // 4. Inline Callback Queries for Sub-features
    // =======================================================

    bot.callbackQuery('menu_withdraw', async (ctx) => {
      await ctx.answerCallbackQuery();
      await handleWithdrawAction(ctx);
    });

    bot.callbackQuery('menu_refer', async (ctx) => {
      await ctx.answerCallbackQuery();
      await handleInviteFriendsAction(ctx);
    });

    // In-Bot Ad Viewing Callback (Interactive Simulation & Instant Reward)
    bot.callbackQuery('bot_watch_ad', async (ctx) => {
      const user = ctx.from;
      const canWatch = db.canWatchAd(user.id);
      if (!canWatch.canWatch) {
        return ctx.answerCallbackQuery({ text: canWatch.reason, show_alert: true });
      }

      const session = db.createAdSession(user.id);
      if (!session.success) {
        return ctx.answerCallbackQuery({ text: session.message || 'Ad session could not be created', show_alert: true });
      }

      await ctx.answerCallbackQuery({ text: '🎬 Loading sponsored advertisement...' });

      const adMessages = [
        '📢 <b>Sponsor: Easy & Fast Earn</b>\n\n💡 Earn passive income by sharing referral links and completing simple micro-tasks daily! Over $10,000+ paid to members.',
        '🚀 <b>Sponsor: Telegram Community Hub</b>\n\n💰 Grow your audience and earn rewards by discovering trending Telegram channels and partner apps.',
        '🎁 <b>Sponsor: Daily Rewards Club</b>\n\n🌟 Unlock daily gifts, streak cash bonuses, and instant UPI & PayPal payouts with zero fees!'
      ];
      const adText = adMessages[Math.floor(Math.random() * adMessages.length)];

      const loadingMsg = await ctx.reply(
        `🎬 <b>SPONSORED ADVERTISEMENT</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `${adText}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `⏳ <i>Viewing advertisement (5s)... Please do not close!</i>`,
        { parse_mode: 'HTML' }
      );

      // Simulate 5-second rewarded ad playback
      setTimeout(async () => {
        try {
          const claimResult = db.verifyAndClaimAd(user.id, session.sessionId, session.token);
          const symbol = db.getSetting('currencySymbol');

          if (claimResult.success) {
            await ctx.api.editMessageText(
              ctx.chat.id,
              loadingMsg.message_id,
              `🎉 <b>AD REWARD CLAIMED!</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `💰 <b>Reward:</b> <b>+${symbol}${claimResult.reward}</b>\n` +
              `💵 <b>New Balance:</b> <b>${symbol}${claimResult.balance.toFixed(2)}</b>\n` +
              `🎬 <b>Ads Watched Today:</b> ${claimResult.adsToday} / ${claimResult.dailyLimit}\n\n` +
              `⏰ <i>Next ad available in ${claimResult.cooldownSeconds}s</i>`,
              {
                parse_mode: 'HTML',
                reply_markup: new InlineKeyboard()
                  .text('🎬 Watch Another Ad', 'bot_watch_ad')
                  .webApp('🚀 Open Mini App', config.webAppUrl)
              }
            );
          } else {
            await ctx.api.editMessageText(
              ctx.chat.id,
              loadingMsg.message_id,
              `⚠️ <b>Ad Claim Error:</b> ${claimResult.message}`,
              { parse_mode: 'HTML' }
            );
          }
        } catch (e) {
          console.warn('Error updating bot ad view message:', e.message);
        }
      }, 5000);
    });

    bot.callbackQuery('claim_daily_bonus', async (ctx) => {
      const user = ctx.from;
      const result = db.claimDailyBonus(user.id);
      const symbol = db.getSetting('currencySymbol');
      const currency = db.getSetting('currencyName');

      if (result.success) {
        await ctx.answerCallbackQuery({ text: `🎉 Claimed +${symbol}${result.amount}!` });
        await ctx.reply(
          `🎉 <b>DAILY BONUS CLAIMED!</b>\n━━━━━━━━━━━━━━━━━━━━━\n` +
          `🔥 <b>Streak:</b> Day ${result.streak} / 7\n` +
          `💰 <b>Reward:</b> <b>+${symbol}${result.amount} ${currency}</b>\n` +
          `💳 <b>New Balance:</b> <b>${symbol}${result.balance} ${currency}</b>\n\n` +
          `⏰ <i>Come back tomorrow to continue your streak!</i>`,
          { parse_mode: 'HTML' }
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

    // Task completion callbacks
    bot.callbackQuery(/^task_verify_(.+)$/, async (ctx) => {
      const taskId = ctx.match[1];
      const user = ctx.from;
      const task = db.getTasks().find(t => t.id === taskId);

      if (!task) {
        await ctx.answerCallbackQuery({ text: 'Task not found!' });
        return;
      }

      // If channel_join task, check Telegram membership
      if (task.task_type === 'channel_join' && task.chat_id) {
        try {
          const member = await ctx.api.getChatMember(task.chat_id, user.id);
          const isMember = ['member', 'administrator', 'creator'].includes(member.status);
          if (!isMember) {
            await ctx.answerCallbackQuery({
              text: '❌ You have not joined the channel yet! Please join first.',
              show_alert: true
            });
            return;
          }
        } catch (err) {
          console.warn(`Could not verify channel for task ${taskId}:`, err.message);
        }
      }

      const res = db.completeTask(user.id, taskId);
      if (res.success) {
        const symbol = db.getSetting('currencySymbol');
        await ctx.answerCallbackQuery({ text: `✅ Task completed! +${symbol}${res.reward}` });
        await ctx.reply(
          `🎉 <b>Task Completed: ${res.taskTitle}</b>\n\n` +
          `💰 You earned: <b>+${symbol}${res.reward}</b>\n` +
          `💳 New Balance: <b>${symbol}${res.balance}</b>`,
          { parse_mode: 'HTML' }
        );
      } else {
        await ctx.answerCallbackQuery({ text: res.message, show_alert: true });
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
      if (String(ctx.from.id) !== String(config.adminId)) return;
      const text = ctx.match.trim();
      if (!text) return ctx.reply('Usage: /broadcast <your announcement message>');

      const users = Object.values(db.data.users);
      await ctx.reply(`📢 Broadcasting announcement to ${users.length} users...`);

      let sent = 0;
      let failed = 0;

      for (const u of users) {
        try {
          await bot.api.sendMessage(u.id, `📢 <b>ANNOUNCEMENT</b>\n━━━━━━━━━━━━━━━━━━━━━\n\n${text}`, { parse_mode: 'HTML' });
          sent++;
          await new Promise(r => setTimeout(r, 40));
        } catch {
          failed++;
        }
      }

      await ctx.reply(`✅ Broadcast complete!\nSent: ${sent} | Failed/Blocked: ${failed}`);
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

  const variables = {
    first_name: user.first_name,
    username: user.username ? `@${user.username}` : user.first_name,
    user_id: user.id,
    balance: user.balance.toFixed(2),
    referrals: user.referral_count || 0,
    referral_link: refLink,
    weekly_rank: rank
  };

  // First send welcome text with reply keyboard attached
  await ctx.reply(
    `👋 <b>Welcome, ${user.first_name}!</b>\n\n` +
    `Use the menu below to check your balance, watch ads, invite friends, and request instant withdrawals.`,
    {
      parse_mode: 'HTML',
      reply_markup: buildMainMenuKeyboard()
    }
  );

  // Then send templated start card
  await sendTemplatedMessage(ctx, 'START_MESSAGE', variables);
}

/**
 * Handle My Balance Action
 */
async function handleBalanceAction(ctx) {
  const user = ctx.from;
  const dbUser = db.getUser(user.id) || db.getOrCreateUser(user).user;
  const rank = db.getUserWeeklyRank(user.id);

  const variables = {
    first_name: user.first_name,
    username: user.username || user.first_name,
    user_id: user.id,
    balance: dbUser.balance.toFixed(2),
    referrals: dbUser.referral_count || 0,
    ads_watched: dbUser.ads_watched || 0,
    bonuses_earned: ((dbUser.bonuses_claimed || 0) * db.getSetting('dailyBonus')).toFixed(2),
    weekly_rank: rank
  };

  const keyboard = new InlineKeyboard()
    .text('💸 Withdraw', 'menu_withdraw')
    .text('👥 Invite Friends', 'menu_refer');

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
  const adReward = db.getSetting('adReward');
  const todayEarnings = (adsToday * adReward).toFixed(2);
  const dailyLimit = db.getSetting('dailyAdLimit');

  const webAppAdUrl = `${config.webAppUrl}?action=watch_ad`;

  const variables = {
    first_name: user.first_name,
    ads_today: adsToday,
    daily_ad_limit: dailyLimit,
    today_ad_earnings: todayEarnings
  };

  const keyboard = new InlineKeyboard()
    .text('⚡ Watch Quick Ad (Telegram)', 'bot_watch_ad')
    .row()
    .webApp('🎬 Watch in Mini App (GigaPub)', webAppAdUrl);

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
  const currency = db.getSetting('currencyName');

  const refEarnings = ((dbUser.referral_count || 0) * refReward).toFixed(2);

  const shareText = encodeURIComponent(
    `🎁 Join this bot to earn free cash by watching ads and referring friends! Claim your reward now: ${refLink}`
  );
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${shareText}`;

  const variables = {
    first_name: user.first_name,
    referral_link: refLink,
    referrals: dbUser.referral_count || 0,
    referral_earnings: refEarnings,
    weekly_rank: rank
  };

  const keyboard = new InlineKeyboard()
    .url('📤 Share Referral Link', shareUrl)
    .row()
    .webApp('🚀 Open Mini App', config.webAppUrl);

  await sendTemplatedMessage(ctx, 'REFERRAL_MESSAGE', variables, keyboard);
}

/**
 * Handle Bonus Action
 */
async function handleBonusAction(ctx) {
  const user = ctx.from;
  const dbUser = db.getUser(user.id) || db.getOrCreateUser(user).user;

  const variables = {
    first_name: user.first_name,
    daily_streak: dbUser.daily_streak || 0
  };

  const keyboard = new InlineKeyboard()
    .text('🎁 CLAIM DAILY BONUS', 'claim_daily_bonus');

  await sendTemplatedMessage(ctx, 'BONUS_MESSAGE', variables, keyboard);
}

/**
 * Handle Tasks Action
 */
async function handleTasksAction(ctx) {
  const user = ctx.from;
  const userTasks = db.getUserTasks(user.id);

  if (userTasks.length === 0) {
    await ctx.reply('📋 <b>No tasks currently available.</b> Check back later for new earning tasks!', { parse_mode: 'HTML' });
    return;
  }

  const symbol = db.getSetting('currencySymbol');
  const keyboard = new InlineKeyboard();

  let text = `📋 <b>AVAILABLE TASKS</b>\n━━━━━━━━━━━━━━━━━━━━━\n\nComplete tasks to earn instant rewards:\n\n`;

  userTasks.forEach((t, i) => {
    const statusIcon = t.is_completed ? '✅ [Completed]' : `💰 +${symbol}${t.reward}`;
    text += `${i + 1}️⃣ <b>${t.title}</b>\n${t.description}\nReward: <b>${statusIcon}</b>\n\n`;

    if (!t.is_completed) {
      if (t.target_url) {
        keyboard.url(`🚀 ${t.title}`, t.target_url);
      }
      keyboard.text(`✅ Verify #${i + 1}`, `task_verify_${t.id}`).row();
    }
  });

  keyboard.webApp('🚀 Open Mini App Tasks', config.webAppUrl);

  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
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

export function getBot() {
  return bot;
}

export { bot };

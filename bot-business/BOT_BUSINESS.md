# 🤖 Bot Business Implementation Guide — Telegram Refer & Earn Bot

This document provides the complete, modular Bot Business (BJS) architecture for deploying this Refer & Earn bot on the **Bot Business** (https://bot.business) platform.

---

## 📋 Table of Contents

1. [Bot Architecture Overview](#bot-architecture-overview)
2. [Global Bot Properties](#global-bot-properties)
3. [User Properties Schema](#user-properties-schema)
4. [Command 1: `/start` (Registration & Force Join)](#command-1-start)
5. [Command 2: `verify_channels` (Membership Validation & Rule 44 Reward)](#command-2-verify_channels)
6. [Command 3: `💰 My Balance` / `/balance`](#command-3-balance)
7. [Command 4: `👥 Invite Friends` / `/invite`](#command-4-invite)
8. [Command 5: `🎬 Watch Ads` / `/watchads` (GigaPub Integration)](#command-5-watch-ads)
9. [Command 6: `🎁 Bonus` / `/bonus` (7-Day Streak Ladder)](#command-6-bonus)
10. [Command 7: `📋 Tasks` / `/tasks`](#command-7-tasks)
11. [Command 8: `💸 Withdraw` / `/withdraw` (Multi-Method Wizard)](#command-8-withdraw)
12. [Command 9: `/admin` & Administrative Callbacks](#command-9-admin)

---

## 1. Bot Architecture Overview

In Bot Business, Telegram bots are defined by:
- **Commands**: Triggered by user messages, slash commands, or inline callbacks.
- **Bot Properties (`Bot.getProperty` / `Bot.setProperty`)**: Global settings, channel lists, rates.
- **User Properties (`User.getProperty` / `User.setProperty`)**: User balance, streak, referral links, and anti-abuse flags.
- **Bot Business JavaScript (BJS)**: Native sandbox execution.

### Main Menu Layout (Strict Rule)
Two-column Reply Keyboard:
```
┌───────────────────┬───────────────────┐
│   💰 My Balance   │    💸 Withdraw    │
├───────────────────┼───────────────────┤
│   🎬 Watch Ads    │ 👥 Invite Friends │
├───────────────────┼───────────────────┤
│     🎁 Bonus      │     📋 Tasks      │
└───────────────────┴───────────────────┘
```
*(Notice: Strictly `🎁 Bonus`, never `🎁 Bonus System`, zero gambling/casino features).*

---

## 2. Global Bot Properties

Set these in your Bot Business Dashboard under **Properties**:

| Property Key | Type | Default Value | Description |
|---|---|---|---|
| `currency` | String | `$` | Currency symbol displayed across all messages |
| `referral_reward` | Float | `1.00` | Points/cash rewarded per verified referral |
| `ad_reward` | Float | `0.20` | Points credited per watched GigaPub ad |
| `daily_bonus_base` | Float | `0.05` | Base reward for day 1 streak |
| `min_withdrawal` | Float | `10.00` | Minimum payout threshold |
| `max_withdrawal` | Float | `500.00` | Maximum single payout threshold |
| `ad_cooldown_sec` | Integer | `30` | Minimum seconds between rewarded ad views |
| `daily_ad_limit` | Integer | `25` | Maximum rewarded ads per user per day |
| `gigapub_project_id`| String | `YOUR_GIGAPUB_PROJECT_ID` | GigaPub publisher project ID |
| `admin_id` | String | `YOUR_TELEGRAM_USER_ID` | Telegram User ID of the primary administrator |
| `channels` | JSON | `[{"name":"Official News","url":"https://t.me/yourchannel","chat_id":"@yourchannel"}]` | Required force-join channels |

---

## 3. User Properties Schema

| Property Key | Type | Initial Value | Description |
|---|---|---|---|
| `balance` | Float | `0.00` | Current available spendable balance |
| `total_earned` | Float | `0.00` | Lifetime accrued earnings |
| `total_withdrawn` | Float | `0.00` | Lifetime approved payouts |
| `referral_count` | Integer | `0` | Total verified referrals |
| `referred_by` | String | `null` | Telegram ID of the user who invited this user |
| `referral_rewarded` | Boolean | `false` | Whether the referrer has been credited (Rule 44) |
| `verified_channels`| Boolean | `false` | Force-join completion status |
| `daily_streak` | Integer | `0` | Consecutive days bonus claimed |
| `last_bonus_time` | Integer | `0` | Epoch timestamp of last bonus claim |
| `ads_watched` | Integer | `0` | Total lifetime ads watched |
| `ads_today` | Integer | `0` | Ads completed today |
| `last_ad_time` | Integer | `0` | Epoch timestamp of last ad view |
| `wallet_upi` | String | `""` | Saved UPI address |
| `wallet_paypal` | String | `""` | Saved PayPal email |
| `is_banned` | Boolean | `false` | Account suspension status |

---

## 4. Command 1: `/start`

- **Command**: `/start`
- **Help**: Initializes user account, captures referral parameter, checks force join.

### BJS Code:
```javascript
// Check Account Ban
if (User.getProperty("is_banned")) {
  Bot.sendMessage("🚫 *Your account has been suspended by an administrator.*");
  return;
}

// Extract Referral Parameter
let param = params;
let referrerId = null;

if (param && param.startsWith("ref_")) {
  referrerId = param.replace("ref_", "").trim();
} else if (param && !isNaN(param)) {
  referrerId = param.trim();
}

// User Initialization
let isNew = false;
let userBal = User.getProperty("balance");
if (userBal === undefined || userBal === null) {
  isNew = true;
  User.setProperty("balance", 0.00, "float");
  User.setProperty("total_earned", 0.00, "float");
  User.setProperty("total_withdrawn", 0.00, "float");
  User.setProperty("referral_count", 0, "integer");
  User.setProperty("ads_watched", 0, "integer");
  User.setProperty("verified_channels", false, "boolean");
  User.setProperty("referral_rewarded", false, "boolean");

  // Anti-Self Referral Check
  if (referrerId && String(referrerId) !== String(user.telegramid)) {
    User.setProperty("referred_by", referrerId, "string");
  } else {
    User.setProperty("referred_by", null, "string");
  }
}

// Check Force Join Status
let verified = User.getProperty("verified_channels");
let channels = Bot.getProperty("channels");

if (!verified && channels && channels.length > 0) {
  let buttons = [];
  for (let i = 0; i < channels.length; i++) {
    buttons.push([{ text: "📢 " + channels[i].name, url: channels[i].url }]);
  }
  buttons.push([{ text: "🔐 VERIFY MEMBERSHIP", callback_data: "verify_channels" }]);

  let text = "━━━━━━━━━━━━━━━━━━\n" +
             "🔐 *ACCESS REQUIRED*\n" +
             "━━━━━━━━━━━━━━━━━━\n\n" +
             "To use this bot and withdraw cash, please join our required channels below:\n\n" +
             "👇 *Join every channel, then click verify:*";

  Bot.sendInlineKeyboard(buttons, text);
  return;
}

// Show 2-Column Main Menu
let menuKeyboard = [
  ["💰 My Balance", "💸 Withdraw"],
  ["🎬 Watch Ads", "👥 Invite Friends"],
  ["🎁 Bonus", "📋 Tasks"]
];

let cur = Bot.getProperty("currency", "$");
let refReward = Bot.getProperty("referral_reward", 1.00);
let adReward = Bot.getProperty("ad_reward", 0.20);

let welcomeMsg = "👋 *Welcome, " + user.first_name + "!*\n\n" +
                 "🌟 Welcome to the *Refer & Earn Bot*.\n\n" +
                 "💡 *How to Earn:*\n" +
                 "• 👥 *Refer Friends:* Earn *" + cur + refReward.toFixed(2) + "* per valid invite\n" +
                 "• 🎬 *Watch Ads:* Earn *" + cur + adReward.toFixed(2) + "* per ad via GigaPub\n" +
                 "• 🎁 *Daily Bonus:* Streak rewards up to *" + cur + "0.50*\n" +
                 "• 📋 *Tasks:* Complete simple tasks for fast cash\n\n" +
                 "👇 _Choose an option below to start earning!_";

Bot.sendKeyboard(menuKeyboard, welcomeMsg);
```

---

## 5. Command 2: `verify_channels`

- **Command**: `verify_channels`
- **Help**: Checks user membership in channels and qualifies referral (Rule 44).

### BJS Code:
```javascript
let channels = Bot.getProperty("channels") || [];
let allJoined = true;

// Verify membership in each required channel
for (let i = 0; i < channels.length; i++) {
  let ch = channels[i];
  if (ch.chat_id) {
    let res = Bot.getChatMember({ chat_id: ch.chat_id, user_id: user.telegramid });
    if (res && res.result) {
      let status = res.result.status;
      if (status !== "member" && status !== "administrator" && status !== "creator") {
        allJoined = false;
        break;
      }
    }
  }
}

if (!allJoined) {
  Bot.answerCallbackQuery({
    text: "❌ You have not joined all required channels yet! Please join and retry.",
    show_alert: true
  });
  return;
}

// Mark User as Verified
User.setProperty("verified_channels", true, "boolean");

// RULE 44: Referral Qualification Check
let referrerId = User.getProperty("referred_by");
let alreadyRewarded = User.getProperty("referral_rewarded");

if (referrerId && !alreadyRewarded) {
  User.setProperty("referral_rewarded", true, "boolean");
  let refReward = Bot.getProperty("referral_reward", 1.00);
  let cur = Bot.getProperty("currency", "$");

  // Credit Referrer
  let refBal = Libs.ResourcesLib.anotherUserProperties(referrerId).getProperty("balance") || 0;
  let refCount = Libs.ResourcesLib.anotherUserProperties(referrerId).getProperty("referral_count") || 0;

  Libs.ResourcesLib.anotherUserProperties(referrerId).setProperty("balance", refBal + refReward, "float");
  Libs.ResourcesLib.anotherUserProperties(referrerId).setProperty("referral_count", refCount + 1, "integer");

  // Notify Referrer
  Bot.sendMessageToChatWithId(
    referrerId,
    "🎉 *NEW VERIFIED REFERRAL!*\n━━━━━━━━━━━━━━━━━━\n\n" +
    "👤 *User:* " + user.first_name + " (@" + (user.username || user.telegramid) + ")\n" +
    "💰 *Reward Credited:* +" + cur + refReward.toFixed(2) + "\n" +
    "💵 *New Balance:* " + cur + (refBal + refReward).toFixed(2)
  );
}

Bot.answerCallbackQuery({ text: "✅ Verification Successful!", show_alert: false });

// Display Main Menu
let menuKeyboard = [
  ["💰 My Balance", "💸 Withdraw"],
  ["🎬 Watch Ads", "👥 Invite Friends"],
  ["🎁 Bonus", "📋 Tasks"]
];

Bot.sendKeyboard(
  menuKeyboard,
  "🎉 *Verification successful!*\n\nWelcome to the Refer & Earn Bot. Happy earning! 🚀"
);
```

---

## 6. Command 3: `💰 My Balance` / `/balance`

- **Command**: `💰 My Balance` (also alias `/balance`)

### BJS Code:
```javascript
let cur = Bot.getProperty("currency", "$");
let bal = User.getProperty("balance") || 0.00;
let refs = User.getProperty("referral_count") || 0;
let ads = User.getProperty("ads_watched") || 0;
let streak = User.getProperty("daily_streak") || 0;

let text = "💰 *YOUR WALLET*\n" +
           "━━━━━━━━━━━━━━━━━━\n\n" +
           "💵 *Available Balance:*\n" +
           "*" + cur + bal.toFixed(2) + "*\n\n" +
           "👥 *Total Referrals:*\n" +
           refs + " invites\n\n" +
           "🎬 *Ads Watched:*\n" +
           ads + " completed\n\n" +
           "🎁 *Daily Streak:*\n" +
           "Day " + streak + " / 7\n\n" +
           "━━━━━━━━━━━━━━━━━━\n" +
           "💎 _Keep earning and reach your withdrawal target!_";

let inlineKeys = [
  [{ text: "💸 Withdraw", callback_data: "/withdraw" }],
  [{ text: "👥 Invite Friends", callback_data: "/invite" }]
];

Bot.sendInlineKeyboard(inlineKeys, text);
```

---

## 7. Command 4: `👥 Invite Friends` / `/invite`

- **Command**: `👥 Invite Friends` (also alias `/invite`)

### BJS Code:
```javascript
let cur = Bot.getProperty("currency", "$");
let refReward = Bot.getProperty("referral_reward", 1.00);
let refs = User.getProperty("referral_count") || 0;
let botUser = bot.name;
let refLink = "https://t.me/" + botUser + "?start=ref_" + user.telegramid;
let earnings = refs * refReward;

let text = "🎉 *INVITE & EARN*\n" +
           "━━━━━━━━━━━━━━━━━━\n\n" +
           "💰 Earn *" + cur + refReward.toFixed(2) + "* for every valid referral!\n\n" +
           "🔗 *Your Referral Link:*\n" +
           "`" + refLink + "`\n\n" +
           "📊 *Your Statistics:*\n" +
           "👥 Total Invites: " + refs + "\n" +
           "💰 Referral Earnings: *" + cur + earnings.toFixed(2) + "*\n\n" +
           "━━━━━━━━━━━━━━━━━━\n" +
           "🎁 *WEEKLY LEADERBOARD PRIZES*\n" +
           "🥇 1st — " + cur + "10\n" +
           "🥈 2nd — " + cur + "10\n" +
           "🥉 3rd — " + cur + "10\n" +
           "4️⃣ 4th–10th — " + cur + "5\n" +
           "🔟 11th–20th — " + cur + "3\n\n" +
           "Share your link and start earning 🚀";

let shareUrl = "https://t.me/share/url?url=" + encodeURIComponent(refLink) +
               "&text=" + encodeURIComponent("Join this bot to earn cash watching ads and inviting friends!");

let buttons = [
  [{ text: "📤 Share Referral Link", url: shareUrl }]
];

Bot.sendInlineKeyboard(buttons, text);
```

---

## 8. Command 5: `🎬 Watch Ads` / `/watchads`

- **Command**: `🎬 Watch Ads` (also alias `/watchads`)

### BJS Code:
```javascript
let cur = Bot.getProperty("currency", "$");
let adReward = Bot.getProperty("ad_reward", 0.20);
let dailyLimit = Bot.getProperty("daily_ad_limit", 25);
let cooldownSec = Bot.getProperty("ad_cooldown_sec", 30);
let gigapubId = Bot.getProperty("gigapub_project_id", "demo_project");

let adsToday = User.getProperty("ads_today") || 0;
let lastAdTime = User.getProperty("last_ad_time") || 0;
let now = Date.now();
let elapsedSec = Math.floor((now - lastAdTime) / 1000);

if (adsToday >= dailyLimit) {
  Bot.sendMessage("🛑 *Daily Limit Reached!*\nYou have watched " + dailyLimit + "/" + dailyLimit + " ads today. Resets tomorrow!");
  return;
}

if (elapsedSec < cooldownSec) {
  let remaining = cooldownSec - elapsedSec;
  Bot.sendMessage("⏳ *Cooldown Active!*\nPlease wait *" + remaining + " seconds* before starting another ad.");
  return;
}

let miniAppUrl = "https://your-domain.com/?user_id=" + user.telegramid;

let text = "🎬 *GIGAPUB REWARDED ADS*\n" +
           "━━━━━━━━━━━━━━━━━━\n\n" +
           "💰 *Reward per ad:* " + cur + adReward.toFixed(2) + "\n" +
           "📊 *Today's progress:* " + adsToday + " / " + dailyLimit + " watched\n" +
           "⏱️ *Cooldown:* " + cooldownSec + " seconds\n\n" +
           "Watch a short sponsored video to claim your reward.";

let buttons = [
  [{ text: "▶️ Watch Rewarded Ad", web_app: { url: miniAppUrl } }]
];

Bot.sendInlineKeyboard(buttons, text);
```

---

## 9. Command 6: `🎁 Bonus` / `/bonus`

- **Command**: `🎁 Bonus` (Strictly named `🎁 Bonus`)

### BJS Code:
```javascript
let cur = Bot.getProperty("currency", "$");
let ladder = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.50];
let lastClaim = User.getProperty("last_bonus_time") || 0;
let streak = User.getProperty("daily_streak") || 0;
let now = Date.now();
let cooldownMs = 24 * 60 * 60 * 1000;
let diffMs = now - lastClaim;

if (diffMs < cooldownMs) {
  let waitHours = Math.floor((cooldownMs - diffMs) / (1000 * 60 * 60));
  let waitMins = Math.floor(((cooldownMs - diffMs) % (1000 * 60 * 60)) / (1000 * 60));

  Bot.sendMessage(
    "⏰ *BONUS ALREADY CLAIMED*\n━━━━━━━━━━━━━━━━━━\n\n" +
    "You have already received today's streak reward!\n\n" +
    "🎁 *Next bonus available in:* " + waitHours + "h " + waitMins + "m\n" +
    "🔥 *Current Streak:* Day " + streak + " / 7"
  );
  return;
}

// Calculate Streak
let hoursSince = (now - lastClaim) / (1000 * 60 * 60);
if (lastClaim === 0 || hoursSince > 48) {
  streak = 1;
} else {
  streak = (streak % 7) + 1;
}

let rewardAmount = ladder[streak - 1];
let curBal = User.getProperty("balance") || 0.00;

User.setProperty("daily_streak", streak, "integer");
User.setProperty("last_bonus_time", now, "integer");
User.setProperty("balance", curBal + rewardAmount, "float");

Bot.sendMessage(
  "╔══════════════════╗\n" +
  "🎁 *DAILY BONUS CLAIMED!*\n" +
  "╚══════════════════╝\n\n" +
  "🎉 *Day " + streak + " Reward:* +" + cur + rewardAmount.toFixed(2) + "\n" +
  "💵 *New Balance:* " + cur + (curBal + rewardAmount).toFixed(2) + "\n" +
  "🔥 *Current Streak:* " + streak + " day(s)\n\n" +
  "💡 _Come back in 24 hours to claim Day " + ((streak % 7) + 1) + "!_"
);
```

---

## 10. Command 7: `📋 Tasks` / `/tasks`

- **Command**: `📋 Tasks` (also alias `/tasks`)

### BJS Code:
```javascript
let cur = Bot.getProperty("currency", "$");

let text = "📋 *AVAILABLE TASKS*\n" +
           "━━━━━━━━━━━━━━━━━━\n\n" +
           "Complete quick tasks and earn cash directly to your balance!\n\n" +
           "1️⃣ *Official YouTube Channel*\n" +
           "• Reward: *" + cur + "0.20*\n" +
           "• Action: Subscribe & watch intro guide\n\n" +
           "2️⃣ *Follow on Twitter / X*\n" +
           "• Reward: *" + cur + "0.15*\n" +
           "• Action: Follow & repost announcement\n\n" +
           "👇 *Tap a task below to start:*";

let buttons = [
  [{ text: "📺 YouTube Task (" + cur + "0.20)", url: "https://youtube.com" }],
  [{ text: "🐦 Twitter Task (" + cur + "0.15)", url: "https://x.com" }]
];

Bot.sendInlineKeyboard(buttons, text);
```

---

## 11. Command 8: `💸 Withdraw` / `/withdraw`

- **Command**: `💸 Withdraw` (also alias `/withdraw`)

### BJS Code:
```javascript
let cur = Bot.getProperty("currency", "$");
let minWd = Bot.getProperty("min_withdrawal", 10.00);
let maxWd = Bot.getProperty("max_withdrawal", 500.00);
let bal = User.getProperty("balance") || 0.00;

if (bal < minWd) {
  Bot.sendMessage(
    "⚠️ *INSUFFICIENT BALANCE FOR WITHDRAWAL*\n━━━━━━━━━━━━━━━━━━\n\n" +
    "💵 *Your Balance:* " + cur + bal.toFixed(2) + "\n" +
    "🛑 *Minimum Withdrawal:* " + cur + minWd.toFixed(2) + "\n\n" +
    "💡 _Invite more friends or watch ads to reach your threshold!_"
  );
  return;
}

let text = "💸 *WITHDRAWAL PORTAL*\n" +
           "━━━━━━━━━━━━━━━━━━\n\n" +
           "💵 *Available Balance:* *" + cur + bal.toFixed(2) + "*\n" +
           "🛑 *Minimum Payout:* " + cur + minWd.toFixed(2) + "\n" +
           "⚡ *Processing Time:* Within 24 hours\n\n" +
           "👇 *Select your preferred withdrawal method:*";

let buttons = [
  [{ text: "🇮🇳 UPI (Instant)", callback_data: "/wd_upi" }],
  [{ text: "💳 PayPal (Global)", callback_data: "/wd_paypal" }],
  [{ text: "🏦 Bank Transfer", callback_data: "/wd_bank" }]
];

Bot.sendInlineKeyboard(buttons, text);
```

---

## 12. Command 9: `/admin` & Administrative Callbacks

- **Command**: `/admin`
- **Need Reply**: False

### BJS Code:
```javascript
let adminId = Bot.getProperty("admin_id");
if (String(user.telegramid) !== String(adminId)) {
  Bot.sendMessage("🚫 *Access Denied:* Admin privileges required.");
  return;
}

let cur = Bot.getProperty("currency", "$");
let refReward = Bot.getProperty("referral_reward", 1.00);
let adReward = Bot.getProperty("ad_reward", 0.20);
let minWd = Bot.getProperty("min_withdrawal", 10.00);

let text = "⚙️ *ADMINISTRATION CONSOLE*\n" +
           "━━━━━━━━━━━━━━━━━━\n\n" +
           "💰 *Referral Reward:* " + cur + refReward + "\n" +
           "🎬 *Ad Reward:* " + cur + adReward + "\n" +
           "💸 *Min Withdrawal:* " + cur + minWd + "\n\n" +
           "Quick administrative actions:";

let buttons = [
  [{ text: "📢 Broadcast Message", callback_data: "/admin_broadcast" }],
  [{ text: "📊 Platform Statistics", callback_data: "/admin_stats" }],
  [{ text: "⚙️ Manage Channels", callback_data: "/admin_channels" }]
];

Bot.sendInlineKeyboard(buttons, text);
```

---

## 🚀 Verification & Deployment Checklist

1. **Bot Business Creation**:
   - Create a new bot at [Bot Business](https://bot.business).
   - Enter your `@BotFather` API Token.
2. **Set Global Properties**:
   - Set `currency` to `$`, `referral_reward` to `1.00`, `min_withdrawal` to `10.00`.
   - Set `admin_id` to your numerical Telegram ID.
3. **Register Commands**:
   - Paste each command block from above into the corresponding command in Bot Business.
4. **Test Flows**:
   - Test `/start` with a referral link.
   - Verify force-join checks.
   - Verify that button label is strictly `🎁 Bonus`.
   - Test withdrawal request validation.

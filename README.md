# 🚀 Telegram Refer & Earn Bot + GigaPub Ads + Admin Panel

A complete, production-ready, enterprise-grade Telegram Refer & Earn Bot with **Telegram Bot API**, **GigaPub Ads Integration**, **Multi-Channel Force-Join Membership Verification**, **Social Tasks Engine**, **7-Day Streak Bonus System**, **Multi-Method Withdrawal Processing (UPI, PayPal, Bank Transfer)**, **Dynamic Variable Message & Media Builder**, **Queued Broadcast Studio**, and a responsive **Web Admin Dashboard**.

---

## 📑 Table of Contents

1. [System Architecture & Features](#1-system-architecture--features)
2. [Requirements](#2-requirements)
3. [Installation & Setup](#3-installation--setup)
4. [Database & Transaction Ledger](#4-database--transaction-ledger)
5. [Environment Variables Reference](#5-environment-variables-reference)
6. [Telegram Bot Creation (@BotFather)](#6-telegram-bot-creation-botfather)
7. [Bot Token & Admin Account Setup](#7-bot-token--admin-account-setup)
8. [Required Channels & Force Join System](#8-required-channels--force-join-system)
9. [Setting Channel IDs & Usernames](#9-setting-channel-ids--usernames)
10. [GigaPub Ads Integration](#10-gigapub-ads-integration)
11. [Telegram Mini App / Web App Setup](#11-telegram-mini-app--web-app-setup)
12. [Running the Application](#12-running-the-application)
13. [Using the Web Admin Dashboard](#13-using-the-web-admin-dashboard)
14. [Message Template & Media Attachment Builder](#14-message-template--media-attachment-builder)
15. [Broadcast Studio](#15-broadcast-studio)
16. [Production Deployment (Nginx, PM2, Systemd)](#16-production-deployment-nginx-pm2-systemd)
17. [HTTPS & SSL Setup (Certbot)](#17-https--ssl-setup-certbot)
18. [Webhook vs Long-Polling Configuration](#18-webhook-vs-long-polling-configuration)
19. [Troubleshooting Guide](#19-troubleshooting-guide)

---

## 1. System Architecture & Features

### 🎮 Reference Main Menu UI
The bot features a persistent **2-column Reply Keyboard**:
```
╔═════════════════════╦═════════════════════╗
║   💰 My Balance     ║    💸 Withdraw      ║
╠═════════════════════╬═════════════════════╣
║   🎬 Watch Ads      ║  👥 Invite Friends  ║
╠═════════════════════╬═════════════════════╣
║   🎁 Bonus System   ║     📋 Tasks        ║
╚═════════════════════╩═════════════════════╝
```

- **💰 My Balance**: Shows user wallet card (available balance, total referrals, ads watched, bonuses earned, weekly leaderboard rank) with quick inline action buttons.
- **💸 Withdraw**: Multi-step withdrawal wizard supporting **UPI ID**, **PayPal Email**, and **Bank Transfer** (account holder, account number, IFSC, bank name). Includes minimum/maximum checks, immediate `WITHDRAWAL_HOLD` ledger tracking, and instant admin Telegram alert with `[Approve]` and `[Reject]` buttons.
- **🎬 Watch Ads**: Official GigaPub rewarded video advertising integration with one-time anti-replay session generation, cooldown enforcement, and server-side verified payouts.
- **👥 Invite Friends**: Dynamic referral link generation (`https://t.me/BotUsername?start=ref_12345`), user invite statistics, anti-abuse fraud prevention (blocking self-referral, duplicate accounts), and weekly leaderboard rankings.
- **🎁 Bonus System**: Configurable 7-day login streak ladder (Day 1: $0.05, Day 2: $0.10, ..., Day 7: $0.50). Tracks server-side timestamps and resets upon missed days.
- **📋 Tasks**: Social & partner earning tasks (join channels, follow links, watch videos) with duplicate completion blocking and instant balance credit.
- **🔐 Force-Join Channels**: Multiple required channels verification using Telegram API `getChatMember`. Supports adding, editing, ordering, and disabling channels from the admin dashboard without writing code.
- **🎛 Web Admin Panel**: Responsive dark-themed control center accessible on Desktop, Tablet, and Mobile with real-time Chart.js visual metrics, full user wallet ledger inspector, withdrawal reviews, message template editor, media attachments (photo/video/GIF/doc), broadcast studio, and audit logging.

---

## 2. Requirements

- **Node.js**: `v18.0.0` or higher (tested up to Node v26)
- **Package Manager**: `pnpm` (recommended) or `npm`
- **Operating System**: Linux (Ubuntu, Debian, CentOS), Android (Termux), macOS, or Windows
- **Telegram Account**: To create bot credentials with [@BotFather](https://t.me/BotFather)

---

## 3. Installation & Setup

1. **Clone or Navigate to the Project Directory:**
   ```bash
   cd telegram-mini-app-refer-earn
   ```

2. **Install Dependencies:**
   ```bash
   pnpm install
   # or: npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   ```
   Open `.env` in your editor and fill in your values.

---

## 4. Database & Transaction Ledger

The application uses an **atomic, relational-schema database engine** stored at `data/database.json`. Every balance mutation creates an **immutable ledger transaction** in the `wallet_transactions` table:

```json
{
  "id": "TXN_1729929837000_A9B2C",
  "user_id": "6656939308",
  "amount": 1.00,
  "type": "REFERRAL_REWARD",
  "reference_id": "ref_987654321",
  "balance_before": 2.50,
  "balance_after": 3.50,
  "timestamp": 1729929837000,
  "description": "Referral reward for inviting John (@john_doe)"
}
```

### Supported Transaction Types:
- `REFERRAL_REWARD`: Earned when a referred user joins.
- `AD_REWARD`: Credited upon server-verified GigaPub ad completion.
- `BONUS_REWARD`: Daily streak claims.
- `TASK_REWARD`: Completed partner/social tasks.
- `ADMIN_CREDIT`: Manual balance additions via admin panel or `/addbal`.
- `ADMIN_DEBIT`: Manual balance deductions via admin panel or `/cutbal`.
- `WITHDRAWAL_HOLD`: Placed on hold when user requests a payout.
- `WITHDRAWAL_REFUND`: Refunded back to user if admin rejects the payout.
- `LEADERBOARD_REWARD`: Weekly top referrer prizes.

---

## 5. Environment Variables Reference

| Variable | Description | Default / Example |
|---|---|---|
| `BOT_TOKEN` | Telegram Bot Token from @BotFather | `7651918317:AAH1...` |
| `ADMIN_ID` | Numeric Telegram User ID of the primary admin | `6656939308` |
| `ADMIN_SECRET` | Password / Secret key for web admin dashboard login | `admin123456` |
| `PORT` | Local web server listening port | `3000` |
| `WEBAPP_URL` | Public URL where your bot frontend is hosted | `https://your-domain.com` |
| `BOT_USERNAME` | Telegram Bot username without `@` | `YourReferBot` |
| `SUPPORT_USERNAME` | Telegram handle for support inquiries | `gaurav_tnwr00` |
| `GIGAPUB_PROJECT_ID` | GigaPub Project ID from gigapub.tech | `YOUR_GIGAPUB_PROJECT_ID` |
| `CURRENCY_NAME` | Name of the economy currency | `Points` or `USD` |
| `CURRENCY_SYMBOL` | Currency symbol | `₹` or `$` |
| `REFERRAL_REWARD` | Reward given for every valid referral | `1.00` |
| `DAILY_BONUS` | Base daily bonus amount | `0.50` |
| `AD_REWARD` | Reward credited per verified ad watch | `0.20` |
| `MIN_WITHDRAWAL` | Minimum withdrawal limit | `10.00` |
| `MAX_WITHDRAWAL` | Maximum withdrawal limit | `1000.00` |
| `AD_COOLDOWN_SECONDS`| Cooldown between consecutive ad views | `30` |
| `DAILY_AD_LIMIT` | Maximum ads a user can watch per calendar day | `20` |
| `MAINTENANCE_MODE` | Block non-admins during updates (`true`/`false`) | `false` |

---

## 6. Telegram Bot Creation (@BotFather)

1. Open Telegram and search for [@BotFather](https://t.me/BotFather).
2. Send `/newbot`.
3. Choose a display name (e.g. `Refer & Earn Official Bot`).
4. Choose a username ending in `bot` (e.g. `QuickEarnReferBot`).
5. Copy the generated **HTTP API Token** and paste it into `.env` as `BOT_TOKEN`.
6. To configure the Mini App Menu Button:
   - Send `/setmenubutton` to @BotFather.
   - Select your bot.
   - Enter button title: `🚀 Open Mini App`.
   - Enter your HTTPS URL: `https://your-domain.com`.

---

## 7. Bot Token & Admin Account Setup

1. To find your numeric Telegram ID, start [@userinfobot](https://t.me/userinfobot) or [@raw_data_bot](https://t.me/raw_data_bot).
2. Set your numeric ID in `.env` as `ADMIN_ID`:
   ```env
   ADMIN_ID=6656939308
   ADMIN_SECRET=MySuperSecretKey2026
   ```
3. Admins have access to:
   - `/admin` command inside Telegram.
   - Inline `Approve` / `Reject` buttons for all withdrawal alerts.
   - The Web Admin Dashboard at `http://localhost:3000/admin`.
   - Bypassing Maintenance Mode.

---

## 8. Required Channels & Force Join System

Users cannot access main menu features until they join all configured channels.
1. The bot verifies membership using Telegram's `getChatMember` API.
2. Accepted membership statuses: `member`, `administrator`, `creator`.
3. If not joined, users receive a card listing all missing channels with direct join links and a `[🔐 VERIFY MEMBERSHIP]` button.
4. When verified, the bot displays:
   ```
   ✅ Verification successful! Welcome to the bot 🎉
   ```
   and automatically attaches the 2-column Reply Keyboard without requiring another `/start`.

---

## 9. Setting Channel IDs & Usernames

To enable the bot to check channel membership:
1. **Add the Bot as Administrator** in your Telegram Channel:
   - Channel Settings → Administrators → Add Administrator → Search your bot username → Grant permissions (at least "Invite Users via Link").
2. Open the **Web Admin Dashboard** at `/admin`.
3. Navigate to **Force Join Channels** → Click **➕ Add Channel**.
4. Enter:
   - **Channel Name**: `Official Announcements`
   - **Channel Username**: `@studywithgaurav0` (or `-100xxxxxxxxxx` channel ID for private channels)
   - **Invite URL**: `https://t.me/studywithgaurav0`
   - **Button Label**: `📢 Join Official Channel`
5. Click **Save Channel**. Channels can be edited, enabled/disabled, or deleted at any time!

---

## 10. GigaPub Ads Integration

The project integrates the official **GigaPub Ad Network** SDK:
- **Primary CDN**: `https://ad.gigapub.tech/script?id=PROJECT_ID`
- **Fallback CDN**: `https://ru-ad.gigapub.tech/script?id=PROJECT_ID`
- **Developer Preview**: If running in localhost without a live project ID, the Mini App automatically activates an interactive ad timer simulator for testing.

### Server-Side Anti-Fraud Ad Verification
1. User clicks `[🎬 Watch Ad]`.
2. Mini App calls `POST /api/ads/session` to generate a one-time session token with a 5-minute expiry.
3. User views the rewarded video through GigaPub.
4. When finished, Mini App sends the session token to `POST /api/ads/claim`.
5. Server verifies:
   - Session validity & token signature.
   - Cooldown timer (`AD_COOLDOWN_SECONDS`).
   - Daily watch limits (`DAILY_AD_LIMIT`).
   - Anti-replay flag (session is marked `completed` and cannot be re-used).
6. Reward is credited to the user's wallet via an immutable ledger entry.

---

## 11. Telegram Mini App / Web App Setup

The Mini App is located in the `public/` folder and is served by Express:
- Accessible inside Telegram via WebApp or standalone browser preview.
- Authenticates users via Telegram WebApp `initData` HMAC-SHA256 signature verification (`src/utils/telegramAuth.js`).
- Contains:
  - **Home**: Balance cards, 7-day streak ladder, ad progress bar, channel link.
  - **Earn Ads**: One-tap rewarded ad playback + Social tasks list.
  - **Refer**: Dynamic invite link, copy/share shortcuts, weekly leaderboard prize ladder.
  - **Wallet**: Payout selector (UPI, PayPal, Bank), quick amount buttons, withdrawal history.
  - **Admin Button**: Quick launch into the Web Admin Dashboard for authorized administrators.

---

## 12. Running the Application

### Development Mode (with Auto-Reload)
```bash
pnpm dev
# or: npm run dev
```

### Production Mode
```bash
pnpm start
# or: npm start
```

Once started:
- **Server URL**: `http://localhost:3000`
- **Web Admin Panel**: `http://localhost:3000/admin`
- **Telegram Bot**: Long-polling active and listening for `/start`.

---

## 13. Using the Web Admin Dashboard

Open `http://localhost:3000/admin` in your browser.
- **Login**: Enter the `ADMIN_SECRET` defined in your `.env`. (If opened from Telegram WebApp by the admin, authentication occurs automatically).
- **Navigation Tabs**:
  - **Dashboard**: Real-time stats cards and Chart.js graphs.
  - **User Management**: Search by ID, username or wallet; view full user profiles and transaction ledger; add/debit balance; ban/unban accounts.
  - **Withdrawals**: Review pending payouts; filter by status; click `Approve`, `Reject` (with auto-refund), or `Mark Paid`.
  - **Referrals & Leaderboard**: Inspect suspicious multi-account referrals and trigger weekly prize distributions.
  - **GigaPub Ads**: Toggle ads on/off, adjust rates, test CDN connectivity.
  - **Force Join Channels**: Add unlimited required channels with custom button labels.
  - **Tasks System**: Create social tasks (channel joins, links, videos) with custom rewards.
  - **Bot Messages & Media**: Live template builder.
  - **Broadcast Studio**: Queue mass announcements with rate-limiting.
  - **Bot Settings**: Configure currencies, support handle, and toggle Maintenance Mode.
  - **Audit Logs**: View timestamped actions performed by administrators.

---

## 14. Message Template & Media Attachment Builder

Admins can customize bot text responses without modifying source code.
1. In the Admin Panel, select **Bot Messages & Media**.
2. Pick any template:
   - `START_MESSAGE`, `FORCE_JOIN_MESSAGE`, `VERIFICATION_SUCCESS`, `BALANCE_MESSAGE`, `REFERRAL_MESSAGE`, `WATCH_AD_MESSAGE`, `WITHDRAW_MESSAGE`, `BONUS_MESSAGE`, `TASK_MESSAGE`, `LEADERBOARD_MESSAGE`, etc.
3. Edit the HTML text with dynamic variable placeholders:
   - `{{first_name}}`, `{{username}}`, `{{user_id}}`, `{{balance}}`, `{{referrals}}`, `{{referral_link}}`, `{{ad_reward}}`, `{{ads_today}}`, `{{weekly_rank}}`, `{{minimum_withdrawal}}`, `{{currency_symbol}}`, `{{currency_name}}`.
4. Optionally attach **Photo**, **Video**, **Animation/GIF**, or **Document** by selecting the media type and providing a public image URL or Telegram `file_id`.
5. Click **💾 Save Message Template**. Changes apply instantly.

---

## 15. Broadcast Studio

Send formatted announcements to your users:
1. Open **Broadcast Studio** in the admin panel.
2. Choose **Target Audience**:
   - `All Users`
   - `Active Users`
   - `Users With Balance > 0`
   - `Users Who Watched Ads`
   - `Referrers With 1+ Invites`
3. Enter your HTML-formatted message.
4. Click **Launch Broadcast**.
5. The backend queues messages and sends them with rate-limiting delays (~30 messages/second) to prevent Telegram API rate limit errors.

---

## 16. Production Deployment (Nginx, PM2, Systemd)

### Using PM2 Process Manager
```bash
# 1. Install PM2 globally
npm install -g pm2

# 2. Start application
pm2 start src/server.js --name "telegram-refer-bot"

# 3. Configure PM2 to start on system boot
pm2 startup
pm2 save
```

### Nginx Reverse Proxy Configuration
Create `/etc/nginx/sites-available/refer-bot`:
```nginx
server {
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the configuration:
```bash
sudo ln -s /etc/nginx/sites-available/refer-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 17. HTTPS & SSL Setup (Certbot)

Telegram WebApps **strictly require HTTPS**. Obtain a free SSL certificate with Let's Encrypt:
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```
Certbot will configure SSL automatically and setup auto-renewal.

---

## 18. Webhook vs Long-Polling Configuration

By default, the bot runs on **Long-Polling**, which works out of the box on any machine or VPS without requiring a public IP or open incoming ports.

If you prefer Telegram Webhooks in production:
1. Ensure your domain has valid HTTPS.
2. GrammY provides webhook adapters:
   ```javascript
   import { webhookCallback } from 'grammy';
   app.use('/webhook/telegram', webhookCallback(bot, 'express'));
   ```
3. Set your webhook with Telegram:
   ```bash
   curl -F "url=https://your-domain.com/webhook/telegram" https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
   ```

---

## 19. Troubleshooting Guide

### 1. `BOT_TOKEN is not configured` warning
- Ensure `.env` exists in the project root and contains `BOT_TOKEN=...` without extra quotes or spaces.

### 2. Force Join check fails even though user joined channel
- Make sure the bot is added as an **Administrator** in the required channel with "Invite Users" permissions.
- Ensure the username in Force Join settings starts with `@` (e.g. `@studywithgaurav0`).

### 3. Mini App shows "Signature mismatch"
- In production, Telegram passes `initData` with an HMAC hash calculated from your `BOT_TOKEN`. Ensure the token in `.env` matches the exact bot that opened the WebApp.
- If testing in a regular desktop browser, the app falls back to preview mode.

### 4. Admin panel says "Authentication required"
- Verify that your `ADMIN_SECRET` in `.env` matches the password entered on the login screen.

### 5. GigaPub Ad not showing
- In development/localhost, the app simulates the ad view using an interactive timer.
- In production, ensure your domain is whitelisted in your [GigaPub dashboard](https://gigapub.tech) and the project ID is valid.

---

## 📄 License
MIT License. Created for high-performance Telegram Mini App and Bot deployment.

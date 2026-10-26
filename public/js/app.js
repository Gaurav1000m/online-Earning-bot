/**
 * Telegram Mini App: Refer & Earn + GigaPub Ads Frontend
 */

const tg = window.Telegram?.WebApp;

const state = {
  user: null,
  config: null,
  isAdmin: false,
  initData: '',
  activeTab: 'home',
  bonusTimer: null,
  adTimer: null,
  nextClaimAt: 0,
  adCooldownRemaining: 0,
  selectedWdMethod: 'upi'
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  if (tg) {
    tg.ready();
    tg.expand();
    if (tg.enableClosingConfirmation) tg.enableClosingConfirmation();
  }

  state.initData = tg?.initData || '';

  // Local demo fallback if opened in browser outside Telegram
  if (!state.initData) {
    console.warn('Running outside Telegram. Activating browser preview mode.');
    const demoUser = {
      id: 6656939308,
      first_name: 'Tnwr',
      username: 'gaurav_tnwr00'
    };
    state.initData = `mock_${encodeURIComponent(JSON.stringify(demoUser))}`;
    showDemoBanner();
  }

  setupNavigation();
  setupEventListeners();
  setupWithdrawalTabs();

  await loadAppConfig();
  await syncUserData();

  // Load GigaPub with the configured project ID
  if (state.config?.gigaPubProjectId) {
    window.GigaPub.init(state.config.gigaPubProjectId);
  }

  startTimers();
});

function showDemoBanner() {
  const banner = document.getElementById('demo-mode-banner');
  if (banner) banner.style.display = 'block';
}

// API Fetch Helper
async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-telegram-init-data': state.initData
    }
  };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(endpoint, options);
    return await res.json();
  } catch (err) {
    console.error(`API Error (${endpoint}):`, err);
    return { success: false, message: 'Network connection issue. Please retry.' };
  }
}

async function loadAppConfig() {
  const res = await apiRequest('/api/config');
  if (res.success) {
    state.config = res.config;
    updateConfigUI();
  }
}

async function syncUserData() {
  const startParam = tg?.initDataUnsafe?.start_param || '';
  const res = await apiRequest('/api/user/sync', 'POST', { startParam });

  if (res.success) {
    state.user = res.user;
    state.isAdmin = res.isAdmin;

    if (res.bonus) {
      state.nextClaimAt = res.bonus.nextClaimAt || 0;
      updateStreakLadder(res.bonus.streak, res.bonus.ladder);
    }
    if (res.ads) {
      state.adCooldownRemaining = res.ads.remainingSeconds || 0;
    }

    updateUserUI();

    // Show Admin Quick Button if admin
    const adminBtn = document.getElementById('admin-quick-btn');
    if (adminBtn) adminBtn.style.display = state.isAdmin ? 'inline-flex' : 'none';
  } else {
    showToast(res.error || 'Failed to sync account', 'error');
  }
}

function updateStreakLadder(currentStreak = 0, ladder = []) {
  const countEl = document.getElementById('streak-days-count');
  if (countEl) countEl.textContent = currentStreak;

  document.querySelectorAll('.streak-pill').forEach(pill => {
    const day = parseInt(pill.getAttribute('data-day'), 10);
    if (day <= currentStreak) {
      pill.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      pill.style.color = '#ffffff';
      pill.style.borderColor = '#10b981';
    } else {
      pill.style.background = 'rgba(255,255,255,0.04)';
      pill.style.color = 'var(--text-muted)';
      pill.style.borderColor = 'rgba(255,255,255,0.08)';
    }
  });
}

function updateConfigUI() {
  const c = state.config;
  if (!c) return;

  document.querySelectorAll('.val-currency-symbol').forEach(el => el.textContent = c.currencySymbol);
  document.querySelectorAll('.val-currency-name').forEach(el => el.textContent = c.currencyName);
  document.querySelectorAll('.val-referral-reward').forEach(el => el.textContent = c.referralReward);
  document.querySelectorAll('.val-ad-reward').forEach(el => el.textContent = c.adReward);
  document.querySelectorAll('.val-min-withdrawal').forEach(el => el.textContent = c.minWithdrawal);

  // Channels
  const channelJoinCard = document.getElementById('channel-join-card');
  if (channelJoinCard && c.channels && c.channels.length > 0) {
    const ch = c.channels[0];
    channelJoinCard.style.display = 'block';
    const link = document.getElementById('channel-link-btn');
    if (link) link.href = ch.invite_url || `https://t.me/${ch.username.replace(/^@/, '')}`;
  }
}

function updateUserUI() {
  const u = state.user;
  if (!u) return;

  const nameEl = document.getElementById('user-greeting-name');
  if (nameEl) nameEl.textContent = u.name;

  const idEl = document.getElementById('user-profile-id');
  if (idEl) idEl.textContent = u.id;

  document.querySelectorAll('.user-balance').forEach(el => el.textContent = u.balance.toFixed(2));
  document.querySelectorAll('.user-total-earned').forEach(el => el.textContent = u.totalEarned.toFixed(2));
  document.querySelectorAll('.user-total-withdrawn').forEach(el => el.textContent = u.totalWithdrawn.toFixed(2));

  // Daily Ad progress
  const adsProgressText = document.getElementById('ads-progress-text');
  const adsProgressBar = document.getElementById('ads-progress-bar');
  const maxAds = state.config?.dailyAdLimit || 20;

  if (adsProgressText) adsProgressText.textContent = `${u.adsToday} / ${maxAds} Today`;
  if (adsProgressBar) {
    const pct = Math.min(100, Math.round((u.adsToday / maxAds) * 100));
    adsProgressBar.style.width = `${pct}%`;
  }
}

function startTimers() {
  if (state.bonusTimer) clearInterval(state.bonusTimer);
  if (state.adTimer) clearInterval(state.adTimer);

  // Daily Bonus Countdown
  state.bonusTimer = setInterval(() => {
    const now = Date.now();
    const btn = document.getElementById('claim-bonus-btn');
    const timerText = document.getElementById('bonus-timer-text');
    if (!btn || !timerText) return;

    if (!state.nextClaimAt || now >= state.nextClaimAt) {
      btn.disabled = false;
      timerText.textContent = 'Ready to Claim!';
      timerText.className = 'text-xs text-success font-semibold';
    } else {
      btn.disabled = true;
      const diffSec = Math.floor((state.nextClaimAt - now) / 1000);
      const hours = Math.floor(diffSec / 3600);
      const minutes = Math.floor((diffSec % 3600) / 60);
      const seconds = diffSec % 60;
      timerText.textContent = `Claim in ${hours}h ${minutes}m ${seconds}s`;
      timerText.className = 'text-xs text-muted font-semibold';
    }
  }, 1000);

  // Ad Cooldown Countdown
  state.adTimer = setInterval(() => {
    const btn = document.getElementById('watch-ad-btn');
    const timerText = document.getElementById('ad-cooldown-text');
    if (!btn || !timerText) return;

    if (state.adCooldownRemaining <= 0) {
      btn.disabled = false;
      timerText.textContent = 'Ad Available Now';
      timerText.className = 'text-xs text-success font-semibold';
    } else {
      btn.disabled = true;
      state.adCooldownRemaining--;
      timerText.textContent = `Next ad in ${state.adCooldownRemaining}s`;
      timerText.className = 'text-xs text-warning font-semibold';
    }
  }, 1000);
}

// Navigation & Tab Switching
function setupNavigation() {
  document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
    item.addEventListener('click', () => {
      switchTab(item.getAttribute('data-tab'));
    });
  });

  document.querySelectorAll('[data-switch-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.getAttribute('data-switch-tab'));
    });
  });
}

function switchTab(tabId) {
  if (state.activeTab === tabId) return;
  hapticFeedback('light');

  document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-tab') === tabId);
  });

  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `tab-${tabId}`);
  });

  state.activeTab = tabId;

  if (tabId === 'earn') loadTasks();
  if (tabId === 'refer') loadReferralData();
  if (tabId === 'wallet') loadWithdrawalHistory();
}

function setupWithdrawalTabs() {
  document.querySelectorAll('.wd-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.wd-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const method = btn.getAttribute('data-method');
      state.selectedWdMethod = method;

      document.getElementById('field-upi').style.display = method === 'upi' ? 'block' : 'none';
      document.getElementById('field-paypal').style.display = method === 'paypal' ? 'block' : 'none';
      document.getElementById('field-bank').style.display = method === 'bank' ? 'block' : 'none';
    });
  });
}

function setupEventListeners() {
  document.getElementById('claim-bonus-btn')?.addEventListener('click', handleClaimBonus);
  document.getElementById('watch-ad-btn')?.addEventListener('click', handleWatchAd);
  document.getElementById('copy-ref-btn')?.addEventListener('click', handleCopyRefLink);
  document.getElementById('share-ref-btn')?.addEventListener('click', handleShareRefLink);
  document.getElementById('submit-withdraw-btn')?.addEventListener('click', handleSubmitWithdrawal);

  document.querySelectorAll('.quick-amt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const amt = btn.getAttribute('data-amt');
      const input = document.getElementById('withdraw-amount-input');
      if (!input) return;
      input.value = amt === 'all' ? (state.user?.balance || 0) : amt;
      hapticFeedback('light');
    });
  });
}

// 1. Claim Bonus
async function handleClaimBonus() {
  const btn = document.getElementById('claim-bonus-btn');
  if (!btn || btn.disabled) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spin"></span> Claiming...';
  hapticFeedback('medium');

  const res = await apiRequest('/api/bonus/claim', 'POST');

  if (res.success) {
    state.user.balance = res.balance;
    state.nextClaimAt = res.nextClaimAt;
    updateUserUI();
    updateStreakLadder(res.streak);
    showToast(`🎉 Claimed Day ${res.streak} Bonus (+${state.config.currencySymbol}${res.amount})!`, 'success');
    hapticNotification('success');
    spawnConfetti();
  } else {
    showToast(res.message || 'Could not claim bonus', 'warning');
    hapticNotification('error');
    if (res.nextClaimAt) state.nextClaimAt = res.nextClaimAt;
  }

  btn.innerHTML = '🎁 Claim Daily Bonus';
}

// 2. Watch Rewarded Ad with Anti-Fraud Session Verification
async function handleWatchAd() {
  const btn = document.getElementById('watch-ad-btn');
  if (!btn || btn.disabled) return;

  hapticFeedback('medium');
  btn.disabled = true;
  btn.innerHTML = '⏳ Loading Ad...';

  try {
    // 1. Request ad session from server
    const sessionRes = await apiRequest('/api/ads/session', 'POST');
    if (!sessionRes.success) {
      showToast(sessionRes.message || 'Ad unavailable right now.', 'warning');
      if (sessionRes.remainingSeconds) state.adCooldownRemaining = sessionRes.remainingSeconds;
      btn.innerHTML = '🎬 Watch Ad';
      return;
    }

    // 2. Display official GigaPub ad
    await window.GigaPub.showRewardedAd();

    // 3. Confirm completion with server using session token
    btn.innerHTML = '✨ Verifying Reward...';
    const claimRes = await apiRequest('/api/ads/claim', 'POST', {
      sessionId: sessionRes.sessionId,
      token: sessionRes.token
    });

    if (claimRes.success) {
      state.user.balance = claimRes.balance;
      state.user.adsToday = claimRes.adsToday;
      state.adCooldownRemaining = claimRes.cooldownSeconds || 30;
      updateUserUI();
      showToast(`🎬 Ad Watched! +${state.config.currencySymbol}${claimRes.reward}`, 'success');
      hapticNotification('success');
      spawnConfetti();
    } else {
      showToast(claimRes.message || 'Verification failed.', 'error');
      hapticNotification('error');
    }
  } catch (err) {
    showToast(err.message || 'Ad playback cancelled.', 'warning');
  } finally {
    btn.innerHTML = '🎬 Watch Ad';
  }
}

// 3. Social & Earning Tasks
async function loadTasks() {
  const container = document.getElementById('tasks-container-list');
  if (!container) return;

  const res = await apiRequest('/api/tasks/list');
  if (res.success && res.tasks) {
    if (res.tasks.length === 0) {
      container.innerHTML = '<div class="text-xs text-muted text-center py-4">No tasks available right now.</div>';
      return;
    }

    container.innerHTML = res.tasks.map(t => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-radius:14px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); margin-bottom:10px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:1.6rem;">${t.icon || '🎯'}</span>
          <div>
            <div class="text-sm font-bold">${t.title}</div>
            <div class="text-xs text-muted">+${state.config.currencySymbol}${t.reward} ${state.config.currencyName}</div>
          </div>
        </div>
        <div>
          ${t.is_completed ? `
            <span class="badge badge-approved">Completed</span>
          ` : `
            <button class="btn btn-primary btn-sm" onclick="completeTaskAction('${t.id}', '${t.target_url || ''}')">
              Complete
            </button>
          `}
        </div>
      </div>
    `).join('');
  }
}

window.completeTaskAction = async function(taskId, targetUrl) {
  if (targetUrl) {
    if (tg?.openTelegramLink && targetUrl.includes('t.me')) tg.openTelegramLink(targetUrl);
    else window.open(targetUrl, '_blank');
  }

  showToast('Verifying task completion...', 'info');

  setTimeout(async () => {
    const res = await apiRequest('/api/tasks/complete', 'POST', { taskId });
    if (res.success) {
      state.user.balance = res.balance;
      updateUserUI();
      showToast(`🎉 Task completed! +${state.config.currencySymbol}${res.reward}`, 'success');
      hapticNotification('success');
      spawnConfetti();
      loadTasks();
    } else {
      showToast(res.message || 'Task could not be verified.', 'warning');
    }
  }, 1200);
};

// 4. Referral System
function getReferralLinks() {
  const userId = state.user?.id || '';
  const botUser = window.Telegram?.WebApp?.initDataUnsafe?.user?.username || 'YourBot';
  const botLink = `https://t.me/${botUser}?start=ref_${userId}`;
  return { botLink };
}

async function loadReferralData() {
  const { botLink } = getReferralLinks();
  const linkInput = document.getElementById('ref-link-display');
  if (linkInput) linkInput.value = botLink;

  const res = await apiRequest('/api/referrals/list');
  if (res.success) {
    // Leaderboard
    const leadEl = document.getElementById('leaderboard-list');
    if (leadEl) {
      leadEl.innerHTML = res.leaderboard.map((item, idx) => {
        let rankBadge = `#${idx + 1}`;
        if (idx === 0) rankBadge = '🥇 1st ($10)';
        else if (idx === 1) rankBadge = '🥈 2nd ($10)';
        else if (idx === 2) rankBadge = '🥉 3rd ($10)';

        return `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
            <div>
              <div class="text-sm font-semibold">${item.name}</div>
              <div class="text-xs text-muted">${rankBadge}</div>
            </div>
            <div class="text-sm font-bold">${item.weekly_referrals || item.referral_count} invites</div>
          </div>
        `;
      }).join('');
    }

    // My Referrals
    const listEl = document.getElementById('my-referrals-list');
    if (listEl) {
      if (res.referrals.length === 0) {
        listEl.innerHTML = `<div class="text-xs text-muted text-center py-4">No referrals yet. Share your link above to begin earning!</div>`;
      } else {
        listEl.innerHTML = res.referrals.map(r => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
            <div>
              <div class="text-sm font-semibold">${r.name}</div>
              <div class="text-xs text-muted">${r.username || 'ID: ' + r.id}</div>
            </div>
            <div class="badge badge-approved">+${res.referralReward} ${res.currencyName}</div>
          </div>
        `).join('');
      }
    }
  }
}

function handleCopyRefLink() {
  const { botLink } = getReferralLinks();
  navigator.clipboard.writeText(botLink).then(() => {
    showToast('📋 Referral link copied!', 'success');
    hapticNotification('success');
  });
}

function handleShareRefLink() {
  const { botLink } = getReferralLinks();
  const shareText = encodeURIComponent(
    `🎁 Join this bot to earn cash by watching ads and inviting friends! Join here: ${botLink}`
  );
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(botLink)}&text=${shareText}`;

  if (tg?.openTelegramLink) tg.openTelegramLink(shareUrl);
  else window.open(shareUrl, '_blank');
}

// 5. Withdrawal Submission
async function handleSubmitWithdrawal() {
  const amountInput = document.getElementById('withdraw-amount-input');
  const amount = parseFloat(amountInput.value);
  const method = state.selectedWdMethod;

  let details = '';
  if (method === 'upi') {
    details = document.getElementById('input-upi-id')?.value.trim();
    if (!details || details.length < 3) return showToast('Please enter a valid UPI ID', 'warning');
  } else if (method === 'paypal') {
    details = document.getElementById('input-paypal-email')?.value.trim();
    if (!details || !details.includes('@')) return showToast('Please enter a valid PayPal email', 'warning');
  } else if (method === 'bank') {
    const bankName = document.getElementById('input-bank-name')?.value.trim();
    const accNumber = document.getElementById('input-bank-acc')?.value.trim();
    const ifsc = document.getElementById('input-bank-ifsc')?.value.trim();
    if (!accNumber || !ifsc) return showToast('Please provide Bank Account Number and IFSC', 'warning');
    details = { bank_name: bankName, account_number: accNumber, ifsc };
  }

  const minWith = state.config?.minWithdrawal || 5;
  if (isNaN(amount) || amount < minWith) {
    return showToast(`Minimum withdrawal is ${state.config.currencySymbol}${minWith}`, 'warning');
  }

  if (amount > state.user.balance) {
    return showToast('Insufficient balance', 'error');
  }

  const btn = document.getElementById('submit-withdraw-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  const res = await apiRequest('/api/withdraw/request', 'POST', {
    method,
    amount,
    details
  });

  btn.disabled = false;
  btn.textContent = 'Submit Withdrawal Request';

  if (res.success) {
    state.user.balance = res.remainingBalance;
    updateUserUI();
    amountInput.value = '';
    showToast(`✅ Withdrawal #${res.withdrawal.id} submitted for review!`, 'success');
    hapticNotification('success');
    loadWithdrawalHistory();
  } else {
    showToast(res.message || 'Withdrawal failed', 'error');
    hapticNotification('error');
  }
}

async function loadWithdrawalHistory() {
  const res = await apiRequest('/api/withdraw/history');
  const container = document.getElementById('withdrawal-history-list');
  if (!container) return;

  if (res.success && res.history && res.history.length > 0) {
    container.innerHTML = res.history.map(item => {
      let badgeClass = 'badge-pending';
      if (item.status === 'approved' || item.status === 'paid') badgeClass = 'badge-approved';
      else if (item.status === 'rejected') badgeClass = 'badge-rejected';

      return `
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:14px; padding:12px; margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span class="text-xs font-semibold text-muted">#${item.id}</span>
            <span class="badge ${badgeClass}">${item.status.toUpperCase()}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div class="text-base font-bold">${state.config.currencySymbol}${item.amount}</div>
              <div class="text-xs text-muted">${item.wallet}</div>
            </div>
            <div class="text-xs text-muted">${new Date(item.created_at).toLocaleDateString()}</div>
          </div>
        </div>
      `;
    }).join('');
  } else {
    container.innerHTML = '<div class="text-sm text-muted text-center py-6">No withdrawal history yet.</div>';
  }
}

// Utilities: Toast, Confetti, Haptics
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function hapticFeedback(style = 'light') {
  if (tg?.HapticFeedback?.impactOccurred) tg.HapticFeedback.impactOccurred(style);
}

function hapticNotification(type = 'success') {
  if (tg?.HapticFeedback?.notificationOccurred) tg.HapticFeedback.notificationOccurred(type);
}

function spawnConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = [];
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  for (let i = 0; i < 70; i++) {
    pieces.push({
      x: canvas.width / 2,
      y: canvas.height / 3,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.7) * 14,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10
    });
  }

  let frames = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frames++;

    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35;
      p.rotation += p.vRot;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });

    if (frames < 90) requestAnimationFrame(animate);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  animate();
}

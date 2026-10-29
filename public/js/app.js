/**
 * Telegram Mini App: Refer & Earn + GigaPub Ads Frontend
 */

const tg = window.Telegram?.WebApp;

// Global URL scheme guard to prevent net::ERR_UNKNOWN_URL_SCHEME in Telegram WebView
document.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (link) {
    const href = link.getAttribute('href') || '';
    if (href.startsWith('intent:') || href.startsWith('market:') || href.startsWith('alipays:') || href.startsWith('app:')) {
      e.preventDefault();
      e.stopPropagation();
      console.warn('Blocked unhandled native scheme to protect Telegram WebView:', href);
      return;
    }
    if (href.startsWith('https://t.me/') || href.startsWith('tg://')) {
      if (tg?.openTelegramLink) {
        e.preventDefault();
        tg.openTelegramLink(href);
      }
    } else if (href.startsWith('http://') || href.startsWith('https://')) {
      if (link.target === '_blank' && tg?.openLink && !href.includes(window.location.host)) {
        e.preventDefault();
        tg.openLink(href);
      }
    }
  }
}, true);

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
    try {
      tg.ready();
      tg.expand();
      if (tg.enableClosingConfirmation) tg.enableClosingConfirmation();
    } catch (e) {
      console.warn('Telegram WebApp SDK init warning:', e);
    }
  }

  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const tgUser = tg?.initDataUnsafe?.user;
  const paramUserId = urlParams.get('userId') || hashParams.get('userId') || tgUser?.id;

  // Immediate preview of Telegram user info if available from SDK
  if (tgUser) {
    const nameEl = document.getElementById('user-greeting-name');
    if (nameEl) nameEl.textContent = tgUser.first_name || 'User';
    const idEl = document.getElementById('user-profile-id');
    if (idEl) idEl.textContent = tgUser.id;
  } else if (paramUserId) {
    const idEl = document.getElementById('user-profile-id');
    if (idEl) idEl.textContent = paramUserId;
  }

  state.initData = tg?.initData || '';

  // Local demo fallback if opened in browser outside Telegram
  if (!state.initData) {
    console.warn('Running outside Telegram or initData absent. Activating browser preview mode.');
    const demoUser = {
      id: paramUserId || 6656939308,
      first_name: tgUser?.first_name || 'Tnwr',
      username: tgUser?.username || 'gaurav_tnwr00'
    };
    state.initData = `mock_${encodeURIComponent(JSON.stringify(demoUser))}`;
    if (!paramUserId && !tgUser) showDemoBanner();
  }

  setupNavigation();
  setupEventListeners();
  setupWithdrawalTabs();

  // Load config and user data in parallel
  try {
    await Promise.all([
      loadAppConfig(),
      syncUserData()
    ]);
  } catch (err) {
    console.error('Initial data load error:', err);
  }

  // Load GigaPub with the configured project ID
  if (state.config?.gigaPubProjectId && window.GigaPub) {
    window.GigaPub.init(state.config.gigaPubProjectId).catch(() => {});
  }

  // Register Service Worker for Monetag push notifications (sw.js)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  startTimers();

  // Handle URL deep links from Telegram Bot buttons (query, hash, or tg start_param)
  const tgStart = tg?.initDataUnsafe?.start_param || '';
  const actionParam = urlParams.get('action') || hashParams.get('action') || (tgStart === 'watch_ad' ? 'watch_ad' : '');
  const tabParam = urlParams.get('tab') || hashParams.get('tab') || (['earn', 'refer', 'wallet'].includes(tgStart) ? tgStart : '');

  if (tabParam) {
    switchTab(tabParam);
  }

  if (actionParam === 'watch_ad') {
    switchTab('earn');
    setTimeout(() => {
      handleWatchAd();
    }, 700);
  }
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
    state.withdrawalEligibility = res.withdrawalEligibility;

    if (res.bonus) {
      state.nextClaimAt = res.bonus.nextClaimAt || 0;
      updateStreakLadder(res.bonus.streak, res.bonus.ladder);
    }
    if (res.ads) {
      state.adCooldownRemaining = res.ads.remainingSeconds || 0;
    }

    updateUserUI();
    updateWithdrawalUI();

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

  const effectiveLadder = (ladder && ladder.length > 0) ? ladder : (state.bonusLadder || [5, 10, 15, 20, 25, 30, 35]);

  document.querySelectorAll('.streak-pill').forEach(pill => {
    const day = parseInt(pill.getAttribute('data-day'), 10);
    const amtEl = pill.querySelector('b');
    if (amtEl && effectiveLadder[day - 1] !== undefined) {
      amtEl.textContent = effectiveLadder[day - 1];
    }

    if (day <= currentStreak) {
      pill.classList.add('completed');
      pill.classList.remove('current');
      pill.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      pill.style.color = '#ffffff';
      pill.style.borderColor = '#10b981';
    } else if (day === currentStreak + 1) {
      pill.classList.remove('completed');
      pill.classList.add('current');
      pill.style.background = 'rgba(59, 130, 246, 0.15)';
      pill.style.color = '#60a5fa';
      pill.style.borderColor = 'rgba(59, 130, 246, 0.4)';
    } else {
      pill.classList.remove('completed', 'current');
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

  const symbol = state.config?.currencySymbol || '₹';
  const nameEl = document.getElementById('user-greeting-name');
  if (nameEl) nameEl.textContent = u.name || u.first_name || (u.username ? '@' + u.username : `User ${u.id}`);

  const idEl = document.getElementById('user-profile-id');
  if (idEl) idEl.textContent = u.id || '...';

  const balNum = typeof u.balance === 'number' ? u.balance : parseFloat(u.balance || 0);
  const earnedNum = typeof u.totalEarned === 'number' ? u.totalEarned : parseFloat(u.totalEarned || balNum);
  const withdrawnNum = typeof u.totalWithdrawn === 'number' ? u.totalWithdrawn : parseFloat(u.totalWithdrawn || 0);

  document.querySelectorAll('.user-balance').forEach(el => el.textContent = balNum.toFixed(2));
  document.querySelectorAll('.user-total-earned').forEach(el => el.textContent = earnedNum.toFixed(2));
  document.querySelectorAll('.user-total-withdrawn').forEach(el => el.textContent = withdrawnNum.toFixed(2));

  // Daily Ad progress
  const adsProgressText = document.getElementById('ads-progress-text');
  const adsProgressBar = document.getElementById('ads-progress-bar');
  const maxAds = state.config?.dailyAdLimit || 20;

  if (adsProgressText) adsProgressText.textContent = `${u.adsToday || 0} / ${maxAds} Today`;
  if (adsProgressBar) {
    const pct = Math.min(100, Math.round(((u.adsToday || 0) / maxAds) * 100));
    adsProgressBar.style.width = `${pct}%`;
  }

  // Update Referral Stats Strip with real database numbers
  const refCount = u.referralCount || 0;
  const refReward = state.config?.referralReward || 20.0;
  const countEl = document.getElementById('ref-stat-count');
  const earnedEl = document.getElementById('ref-stat-earned');
  const milestoneText = document.getElementById('ref-milestone-text');
  const milestoneBar = document.getElementById('ref-milestone-bar');

  if (countEl) countEl.textContent = refCount;
  if (earnedEl) earnedEl.textContent = `${symbol}${(refCount * refReward).toFixed(2)}`;
  if (milestoneText) milestoneText.textContent = `${Math.min(10, refCount)} / 10 Referrals`;
  if (milestoneBar) {
    const pct = Math.min(100, Math.round((refCount / 10) * 100));
    milestoneBar.style.width = `${pct}%`;
  }
}

function updateWithdrawalUI() {
  const elig = state.withdrawalEligibility || {
    eligible: false,
    requiredReferrals: 10,
    requiredAds: 30,
    currentReferrals: 0,
    currentAds: 0,
    remainingReferrals: 10,
    remainingAds: 30
  };

  const lockCard = document.getElementById('wd-lock-card');
  const submitBtn = document.getElementById('submit-withdraw-btn');
  const minNotice = document.getElementById('wd-min-notice');
  const unlockBanner = document.getElementById('wd-unlocked-banner');

  if (!elig.eligible) {
    if (lockCard) lockCard.style.display = 'block';
    if (unlockBanner) unlockBanner.style.display = 'none';

    const refProgText = document.getElementById('wd-ref-progress-text');
    const refBar = document.getElementById('wd-ref-progress-bar');
    const adProgText = document.getElementById('wd-ad-progress-text');
    const adBar = document.getElementById('wd-ad-progress-bar');

    if (refProgText) refProgText.textContent = `${elig.currentReferrals} / ${elig.requiredReferrals}`;
    if (refBar) refBar.style.width = `${Math.min(100, Math.round((elig.currentReferrals / elig.requiredReferrals) * 100))}%`;

    if (adProgText) adProgText.textContent = `${elig.currentAds} / ${elig.requiredAds}`;
    if (adBar) adBar.style.width = `${Math.min(100, Math.round((elig.currentAds / elig.requiredAds) * 100))}%`;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '🔒 Complete 10 Referrals & 30 Ads to Unlock';
      submitBtn.className = 'btn btn-secondary';
    }

    if (minNotice) {
      minNotice.innerHTML = `⚠️ Unlock requirement: <b>10 Referrals & 30 Ads</b> &bull; Payout Time: <b>1-12 Hours</b>`;
    }
  } else {
    if (lockCard) lockCard.style.display = 'none';
    if (unlockBanner) unlockBanner.style.display = 'flex';

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '💸 Submit Withdrawal Request';
      submitBtn.className = 'btn btn-primary';
    }

    if (minNotice) {
      minNotice.innerHTML = `🎉 <b>Unlocked:</b> You can withdraw ANY amount! &bull; Payout Time: <b>1-12 Hours</b>`;
    }
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
  const attachHandler = (el, getTab) => {
    let handled = false;
    const trigger = (e) => {
      const tab = getTab();
      if (tab) switchTab(tab);
    };

    el.addEventListener('pointerdown', (e) => {
      handled = true;
      trigger(e);
      setTimeout(() => { handled = false; }, 350);
    });

    el.addEventListener('click', (e) => {
      if (!handled) trigger(e);
    });
  };

  document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
    attachHandler(item, () => item.getAttribute('data-tab'));
  });

  document.querySelectorAll('[data-switch-tab]').forEach(btn => {
    attachHandler(btn, () => btn.getAttribute('data-switch-tab'));
  });
}

function switchTab(tabId) {
  if (!tabId) return;
  hapticFeedback('light');

  document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
    const isTarget = item.getAttribute('data-tab') === tabId;
    item.classList.toggle('active', isTarget);
  });

  document.querySelectorAll('.tab-pane').forEach(pane => {
    const isTarget = pane.id === `tab-${tabId}`;
    pane.classList.toggle('active', isTarget);
    pane.style.display = isTarget ? 'block' : 'none';
  });

  state.activeTab = tabId;

  try {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (_) {}

  if (tabId === 'home') updateUserUI();
  if (tabId === 'earn') loadTasks();
  if (tabId === 'refer') loadReferralData();
  if (tabId === 'wallet') {
    updateWithdrawalUI();
    loadWithdrawalHistory();
  }
}
window.switchTab = switchTab;

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
    showToast(`🎉 Claimed Day ${res.streak} Bonus (+${state.config?.currencySymbol || '₹'}${res.amount})!`, 'success');
    hapticNotification('success');
    spawnConfetti();
  } else {
    showToast(res.message || 'Could not claim bonus', 'warning');
    hapticNotification('error');
    if (res.nextClaimAt) state.nextClaimAt = res.nextClaimAt;
  }

  btn.innerHTML = '🎁 Claim Daily Bonus';
}

// 2. Watch Rewarded Ad with GigaPub Integration (window.showGiga)
async function handleWatchAd() {
  const btns = [
    document.getElementById('watch-ad-btn'),
    document.getElementById('watch-ad-btn-page')
  ].filter(Boolean);

  const isAnyDisabled = btns.some(b => b.disabled);
  if (isAnyDisabled) return;

  hapticFeedback('medium');
  btns.forEach(b => {
    b.disabled = true;
    b.innerHTML = '⏳ Loading Ad...';
  });

  try {
    // 1. Request ad session from server
    const sessionRes = await apiRequest('/api/ads/session', 'POST');
    if (!sessionRes.success) {
      showToast(sessionRes.message || 'Ad unavailable right now.', 'warning');
      if (sessionRes.remainingSeconds) state.adCooldownRemaining = sessionRes.remainingSeconds;
      btns.forEach(b => {
        b.disabled = false;
        b.innerHTML = '🎬 Watch Ad';
      });
      return;
    }

    // 2. Call official GigaPub SDK (ID: 8839)
    const triggerAd = () => {
      if (typeof window.showGiga === 'function') {
        return window.showGiga();
      }
      if (window.GigaPub && typeof window.GigaPub.showRewardedAd === 'function') {
        return window.GigaPub.showRewardedAd();
      }
      // If no SDK is initialized in current view, navigate to ad player
      window.location.href = `/ad.html?userId=${state.user?.id || ''}`;
      return new Promise(() => {});
    };

    await triggerAd()
      .then(async () => {
        // Reward logic here
        btns.forEach(b => b.innerHTML = '✨ Verifying Reward...');
        const claimRes = await apiRequest('/api/ads/claim', 'POST', {
          sessionId: sessionRes.sessionId,
          token: sessionRes.token
        });

        if (claimRes.success) {
          state.user.balance = claimRes.balance;
          state.user.adsToday = claimRes.adsToday;
          state.adCooldownRemaining = claimRes.cooldownSeconds || 30;
          updateUserUI();
          showToast(`🎬 Ad Watched! +${state.config?.currencySymbol || '₹'}${claimRes.reward}`, 'success');
          hapticNotification('success');
          spawnConfetti();
        } else {
          showToast(claimRes.message || 'Verification failed.', 'error');
          hapticNotification('error');
        }
      })
      .catch((e) => {
        // Handle errors here
        console.warn('GigaPub Ad playback error:', e);
        showToast(e?.message || 'Ad playback cancelled or closed.', 'warning');
      });
  } catch (err) {
    showToast(err.message || 'Ad playback error.', 'warning');
  } finally {
    btns.forEach(b => {
      b.innerHTML = '🎬 Watch Ad';
    });
  }
}

// 3. Social & Earning Tasks
async function loadTasks() {
  const container = document.getElementById('tasks-container-list');
  if (!container) return;

  if (!container.children.length || container.innerText.includes('Loading')) {
    container.innerHTML = `
      <div class="skeleton" style="height:86px; margin-bottom:10px;"></div>
      <div class="skeleton" style="height:86px; margin-bottom:10px;"></div>
    `;
  }

  const res = await apiRequest('/api/tasks/list');
  if (res.success && res.tasks) {
    if (res.tasks.length === 0) {
      container.innerHTML = '<div class="text-xs text-muted text-center py-4">No tasks available right now.</div>';
      return;
    }

    const symbol = state.config?.currencySymbol || '₹';
    const currencyName = state.config?.currencyName || 'INR';

    container.innerHTML = res.tasks.map((t, idx) => {
      const taskNum = idx + 1;
      const isCompleted = !!t.is_completed;
      const rewardFormatted = Number(t.reward).toFixed(2);
      const desc = t.description || `Join ${t.title} 📢 and earn extra rewards.`;

      if (isCompleted) {
        return `
          <div style="padding:14px; border-radius:14px; background:#f0fdf4; border:1.5px solid #bbf7d0; margin-bottom:12px; box-shadow:0 2px 8px rgba(15,23,42,0.03); transition:all 0.2s ease;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:1.6rem;">${t.icon || '📌'}</span>
                <div>
                  <div class="text-sm font-bold" style="color:#0f172a;">Task #${taskNum}: ${t.title}</div>
                  <div class="text-xs" style="color:#16a34a; font-weight:800;">💰 Reward: ${symbol}${rewardFormatted} ${currencyName}</div>
                </div>
              </div>
              <span class="badge badge-approved" style="font-size:0.75rem; padding:4px 10px;">
                ✅ Completed
              </span>
            </div>
            
            <div style="background:#dcfce7; border:1px solid #86efac; border-radius:10px; padding:10px 12px; margin-top:8px; font-size:0.8rem; color:#166534; line-height:1.45;">
              <div style="font-weight:800; color:#15803d; margin-bottom:2px;">
                ✅ Status: COMPLETED & REWARDED (+${symbol}${rewardFormatted})
              </div>
              <div>
                🎉 You have completed this task and the reward has been added to your balance!
              </div>
            </div>

            <div style="display:flex; gap:8px; margin-top:10px;">
              ${t.target_url ? `
                <button class="btn btn-secondary btn-sm" style="flex:1; font-size:0.78rem; padding:7px 10px;" onclick="openTaskUrl('${t.target_url}')">
                  ${t.task_type === 'channel_join' ? '📢 View Channel' : '🔗 View Link'}
                </button>
              ` : ''}
              <button class="btn btn-sm" disabled style="flex:1; font-size:0.78rem; padding:7px 10px; background:#dcfce7; color:#15803d; border:1px solid #86efac; cursor:default;">
                ✅ Rewarded
              </button>
            </div>
          </div>
        `;
      }

      return `
        <div style="padding:14px; border-radius:14px; background:#ffffff; border:1.5px solid #e2e8f0; margin-bottom:12px; box-shadow:0 2px 8px rgba(15,23,42,0.04); transition:all 0.2s ease;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:1.6rem;">${t.icon || '📌'}</span>
              <div>
                <div class="text-sm font-bold" style="color:#0f172a;">Task #${taskNum}: ${t.title}</div>
                <div class="text-xs" style="color:#2563eb; font-weight:800;">💰 Reward: ${symbol}${rewardFormatted} ${currencyName}</div>
              </div>
            </div>
            <span class="badge badge-pending" style="font-size:0.75rem; padding:4px 10px;">
              ⏳ Incomplete
            </span>
          </div>

          <div class="text-xs text-muted" style="margin-bottom:8px; line-height:1.45;">
            ${desc}
            <br>
            <span style="color:#475569; font-weight:600;">After that click <b>Joined ☑️</b> button to verify and continue.</span>
          </div>

          <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:8px 10px; margin-bottom:10px; font-size:0.75rem; color:#92400e; line-height:1.35;">
            ⚠️ <b>Important:</b> Task will be checked and reviewed by our team carefully. Only real and verified completions will be rewarded.
          </div>

          <div style="display:flex; gap:8px;">
            ${t.target_url ? `
              <button class="btn btn-secondary btn-sm" style="flex:1; font-size:0.8rem; padding:8px 10px;" onclick="openTaskUrl('${t.target_url}')">
                ${t.task_type === 'channel_join' ? '📌 Join Channel' : '🚀 Open Task'}
              </button>
            ` : ''}
            <button class="btn btn-primary btn-sm" id="btn-task-${t.id}" style="flex:1; font-size:0.8rem; padding:8px 10px;" onclick="completeTaskAction('${t.id}')">
              Joined ☑️
            </button>
          </div>
        </div>
      `;
    }).join('');
  }
}

window.openTaskUrl = function(targetUrl) {
  if (!targetUrl) return;
  if (tg?.openTelegramLink && (targetUrl.includes('t.me') || targetUrl.startsWith('https://t.me/'))) {
    tg.openTelegramLink(targetUrl);
  } else {
    window.open(targetUrl, '_blank');
  }
};

window.completeTaskAction = async function(taskId) {
  const btn = document.getElementById(`btn-task-${taskId}`);
  const originalText = btn ? btn.innerHTML : 'Joined ☑️';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Verifying...';
  }

  showToast('Verifying task completion...', 'info');

  try {
    const res = await apiRequest('/api/tasks/complete', 'POST', { taskId });
    if (res.success) {
      state.user.balance = res.balance;
      updateUserUI();
      const symbol = state.config?.currencySymbol || '₹';
      showToast(`🎉 Task completed! +${symbol}${Number(res.reward).toFixed(2)} credited`, 'success');
      hapticNotification('success');
      spawnConfetti();
      await loadTasks();
    } else {
      showToast(res.message || 'Task could not be verified. Please join first!', 'warning');
      hapticNotification('warning');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  } catch (err) {
    showToast('Failed to verify task. Please try again.', 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
};

// 4. Referral System
function getReferralLinks() {
  const userId = state.user?.id || '';
  const botUser = state.config?.botUsername || 'easyandfastearn_bot';
  const botLink = `https://t.me/${botUser.replace(/^@/, '')}?start=ref_${userId}`;
  return { botLink };
}

async function loadReferralData() {
  const { botLink } = getReferralLinks();
  const linkInput = document.getElementById('ref-link-display');
  if (linkInput) linkInput.value = botLink;

  const leadEl = document.getElementById('leaderboard-list');
  const listEl = document.getElementById('my-referrals-list');
  if (leadEl && (!leadEl.children.length || leadEl.innerText.includes('Loading'))) {
    leadEl.innerHTML = '<div class="skeleton" style="height:48px; margin-bottom:8px;"></div><div class="skeleton" style="height:48px; margin-bottom:8px;"></div>';
  }
  if (listEl && (!listEl.children.length || listEl.innerText.includes('Loading'))) {
    listEl.innerHTML = '<div class="skeleton" style="height:48px; margin-bottom:8px;"></div>';
  }

  const res = await apiRequest('/api/referrals/list');
  if (res.success) {
    // Update live stats strip
    const refCount = res.referrals?.length || state.user?.referralCount || 0;
    const refReward = res.referralReward || 1.0;
    const refEarned = (refCount * refReward).toFixed(2);
    const symbol = res.currencySymbol || state.config?.currencySymbol || '$';

    const countEl = document.getElementById('ref-stat-count');
    const earnedEl = document.getElementById('ref-stat-earned');
    const rankEl = document.getElementById('ref-stat-rank');

    if (countEl) countEl.textContent = refCount;
    if (earnedEl) earnedEl.textContent = `${symbol}${refEarned}`;
    if (rankEl) rankEl.textContent = `#${res.weeklyRank || 1}`;

    // Update Withdrawal Milestone Bar (10 Referrals Required)
    const milestoneText = document.getElementById('ref-milestone-text');
    const milestoneBar = document.getElementById('ref-milestone-bar');
    if (milestoneText) {
      milestoneText.textContent = `${Math.min(10, refCount)} / 10 Referrals`;
    }
    if (milestoneBar) {
      const pct = Math.min(100, Math.round((refCount / 10) * 100));
      milestoneBar.style.width = `${pct}%`;
    }

    // Leaderboard
    const leadEl = document.getElementById('leaderboard-list');
    if (leadEl) {
      if (!res.leaderboard || res.leaderboard.length === 0) {
        leadEl.innerHTML = `<div class="text-xs text-muted text-center py-4">No referrers yet this week. Be the first to invite friends!</div>`;
      } else {
        leadEl.innerHTML = res.leaderboard.map((item, idx) => {
          let rankClass = '';
          let rankBadge = `#${idx + 1}`;
          if (idx === 0) { rankClass = 'top-1'; rankBadge = `🥇 1st (${symbol}50)`; }
          else if (idx === 1) { rankClass = 'top-2'; rankBadge = `🥈 2nd (${symbol}30)`; }
          else if (idx === 2) { rankClass = 'top-3'; rankBadge = `🥉 3rd (${symbol}20)`; }

          return `
            <div class="leaderboard-item ${rankClass}">
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:32px; height:32px; border-radius:50%; background:#f1f5f9; color:#0f172a; display:flex; align-items:center; justify-content:center; font-size:0.9rem; font-weight:bold;">
                  ${idx === 0 ? '👑' : (idx < 3 ? '⭐' : (idx + 1))}
                </div>
                <div>
                  <div class="text-sm font-semibold">${item.name}</div>
                  <div class="text-xs text-muted">${rankBadge}</div>
                </div>
              </div>
              <div class="text-sm font-bold" style="color:#0f172a;">${item.weekly_referrals || item.referral_count} invites</div>
            </div>
          `;
        }).join('');
      }
    }

    // My Referrals List
    const listEl = document.getElementById('my-referrals-list');
    if (listEl) {
      if (!res.referrals || res.referrals.length === 0) {
        listEl.innerHTML = `
          <div style="text-align:center; padding:16px 8px;">
            <div style="font-size:2rem; margin-bottom:6px;">👥</div>
            <div class="text-sm font-semibold">No referrals yet</div>
            <div class="text-xs text-muted" style="margin-top:2px;">Share your link above to start earning +${symbol}${refReward} per friend!</div>
          </div>
        `;
      } else {
        listEl.innerHTML = res.referrals.map(r => `
          <div class="leaderboard-item">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="width:32px; height:32px; border-radius:50%; background:rgba(59,130,246,0.15); color:#60a5fa; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.9rem;">
                👤
              </div>
              <div>
                <div class="text-sm font-semibold">${r.name}</div>
                <div class="text-xs text-muted">${r.username || 'ID: ' + r.id} &bull; ${new Date(r.created_at).toLocaleDateString()}</div>
              </div>
            </div>
            <div class="badge badge-approved">+${symbol}${refReward}</div>
          </div>
        `).join('');
      }
    }
  }
}

function handleCopyRefLink() {
  const { botLink } = getReferralLinks();
  const currentBalance = (state.user && state.user.balance > 0)
    ? state.user.balance
    : ((state.user && state.user.total_earned > 0)
      ? state.user.total_earned
      : ((state.user && state.user.lifetime_earnings > 0)
        ? state.user.lifetime_earnings
        : 20));
  const senderAmount = Number(currentBalance) % 1 === 0 ? Number(currentBalance).toFixed(0) : Number(currentBalance).toFixed(2);
  const textToCopy = `${botLink}\nMaine iss bot se ₹${senderAmount} kamaye. Aap bhi try karein aur daily free rewards paayein! 🎁🚀`;

  navigator.clipboard.writeText(textToCopy).then(() => {
    showToast('📋 Referral link & message copied!', 'success');
    hapticNotification('success');
  });
}

function handleShareRefLink() {
  const { botLink } = getReferralLinks();
  const currentBalance = (state.user && state.user.balance > 0)
    ? state.user.balance
    : ((state.user && state.user.total_earned > 0)
      ? state.user.total_earned
      : ((state.user && state.user.lifetime_earnings > 0)
        ? state.user.lifetime_earnings
        : 20));
  const senderAmount = Number(currentBalance) % 1 === 0 ? Number(currentBalance).toFixed(0) : Number(currentBalance).toFixed(2);
  const shareText = encodeURIComponent(
    `Maine iss bot se ₹${senderAmount} kamaye. Aap bhi try karein aur daily free rewards paayein! 🎁🚀`
  );
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(botLink)}&text=${shareText}`;

  if (tg?.openTelegramLink) tg.openTelegramLink(shareUrl);
  else window.open(shareUrl, '_blank');
}

// 5. Withdrawal Submission
async function handleSubmitWithdrawal() {
  const elig = state.withdrawalEligibility || {};
  if (!elig.eligible) {
    return showToast(`🔒 Locked: Complete 10 referrals and 30 ads before requesting a withdrawal!`, 'warning');
  }

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

  if (isNaN(amount) || amount <= 0) {
    return showToast('Please enter a valid amount to withdraw', 'warning');
  }

  if (amount > state.user.balance) {
    return showToast(`Insufficient balance! Available: ${state.config?.currencySymbol || '₹'}${state.user.balance.toFixed(2)}`, 'error');
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
    if (res.eligibility) state.withdrawalEligibility = res.eligibility;
    updateUserUI();
    updateWithdrawalUI();
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
  const container = document.getElementById('withdrawal-history-list');
  if (!container) return;

  if (!container.children.length || container.innerText.includes('Loading')) {
    container.innerHTML = `
      <div class="skeleton" style="height:60px; margin-bottom:8px;"></div>
      <div class="skeleton" style="height:60px; margin-bottom:8px;"></div>
    `;
  }

  const res = await apiRequest('/api/withdraw/history');

  if (res.success && res.history && res.history.length > 0) {
    container.innerHTML = res.history.map(item => {
      let badgeClass = 'badge-pending';
      if (item.status === 'approved' || item.status === 'paid') badgeClass = 'badge-approved';
      else if (item.status === 'rejected') badgeClass = 'badge-rejected';

      return `
        <div style="background:#ffffff; border:1.5px solid #e2e8f0; border-radius:14px; padding:12px 14px; margin-bottom:10px; box-shadow:0 2px 6px rgba(15,23,42,0.03);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span class="text-xs font-semibold text-muted">#${item.id}</span>
            <span class="badge ${badgeClass}">${item.status.toUpperCase()}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div class="text-base font-bold" style="color:#0f172a;">${state.config?.currencySymbol || '₹'}${item.amount}</div>
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

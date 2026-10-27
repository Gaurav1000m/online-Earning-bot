/**
 * Admin Dashboard Controller
 */

const tg = window.Telegram?.WebApp;

const adminState = {
  token: localStorage.getItem('bot_admin_token') || '',
  activeSection: 'dashboard',
  currentTemplateKey: 'START_MESSAGE',
  templates: {},
  settings: {},
  activeUserId: null,
  userPage: 1,
  chartGrowth: null,
  chartActivity: null
};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
  if (tg) {
    tg.ready();
    tg.expand();
  }

  setupAdminNav();
  setupSidebarToggle();

  // Try auto-login via Telegram WebApp initData if token is missing
  if (!adminState.token && tg?.initData) {
    await autoLoginWithTelegram();
  }

  if (!adminState.token) {
    showLoginModal();
  } else {
    await loadInitialData();
  }
});

function showLoginModal() {
  document.getElementById('login-modal').classList.add('open');
}

async function autoLoginWithTelegram() {
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: tg.initData })
    });
    const data = await res.json();
    if (data.success && data.token) {
      adminState.token = data.token;
      localStorage.setItem('bot_admin_token', data.token);
    }
  } catch (err) {}
}

async function handleAdminLogin() {
  const pwd = document.getElementById('login-password').value.trim();
  if (!pwd) return showToast('Please enter admin password', 'error');

  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pwd, initData: tg?.initData || '' })
  });

  const data = await res.json();
  if (data.success && data.token) {
    adminState.token = data.token;
    localStorage.setItem('bot_admin_token', data.token);
    document.getElementById('login-modal').classList.remove('open');
    showToast('Authenticated successfully!', 'success');
    await loadInitialData();
  } else {
    showToast(data.message || 'Invalid credentials', 'error');
  }
}

// Admin API Fetcher
async function adminFetch(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': adminState.token,
      'x-telegram-init-data': tg?.initData || ''
    }
  };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(endpoint, options);
    if (res.status === 401 || res.status === 403) {
      showLoginModal();
      return { success: false, message: 'Authentication required' };
    }
    return await res.json();
  } catch (err) {
    console.error('Admin API error:', err);
    return { success: false, message: 'Network error' };
  }
}

async function loadInitialData() {
  await loadOverview();
}

// Navigation & Section Switching
function setupAdminNav() {
  document.querySelectorAll('.admin-sidebar .nav-link').forEach(link => {
    link.addEventListener('click', () => {
      const section = link.getAttribute('data-section');
      switchSection(section);
      if (window.innerWidth <= 900) {
        document.getElementById('sidebar').classList.remove('open');
      }
    });
  });
}

function setupSidebarToggle() {
  const btn = document.getElementById('hamburger-btn');
  const sidebar = document.getElementById('sidebar');
  if (btn && sidebar) {
    btn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
}

window.switchSection = function(sectionId) {
  adminState.activeSection = sectionId;

  document.querySelectorAll('.admin-sidebar .nav-link').forEach(l => {
    if (l.getAttribute('data-section') === sectionId) l.classList.add('active');
    else l.classList.remove('active');
  });

  document.querySelectorAll('.admin-section').forEach(sec => {
    if (sec.id === `sec-${sectionId}`) sec.style.display = 'block';
    else sec.style.display = 'none';
  });

  const titles = {
    dashboard: 'Dashboard Overview',
    users: 'User Management & Ledger',
    withdrawals: 'Withdrawal Processing',
    referrals: 'Referral Management & Leaderboard',
    gigapub: 'GigaPub Rewarded Advertising',
    channels: 'Force-Join Telegram Channels',
    tasks: 'Social & Earning Tasks',
    templates: 'Message Templates & Media Builder',
    broadcast: 'Announcement Broadcast Studio',
    settings: 'Global Bot & Economy Settings',
    audit: 'System Audit & Financial Trail'
  };

  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = titles[sectionId] || 'Admin Panel';

  // Hook per section
  if (sectionId === 'dashboard') loadOverview();
  else if (sectionId === 'users') loadUsers();
  else if (sectionId === 'withdrawals') loadWithdrawals('pending');
  else if (sectionId === 'referrals') loadReferralsData();
  else if (sectionId === 'gigapub') loadGigaPubSettings();
  else if (sectionId === 'channels') loadChannels();
  else if (sectionId === 'tasks') loadTasks();
  else if (sectionId === 'templates') loadTemplates();
  else if (sectionId === 'broadcast') loadBroadcastHistory();
  else if (sectionId === 'settings') loadSettings();
  else if (sectionId === 'audit') loadAuditLogs();
};

// =======================================================
// 1. DASHBOARD & CHARTS
// =======================================================

async function loadOverview() {
  const res = await adminFetch('/api/admin/overview');
  if (!res.success) return;

  const { stats, settings, charts, pendingWithdrawals } = res;
  adminState.settings = settings;

  // Render Stats Cards
  document.getElementById('stat-total-users').textContent = stats.totalUsers;
  document.getElementById('stat-new-today').textContent = stats.newUsersToday;
  document.getElementById('stat-active-users').textContent = stats.activeUsers;
  document.getElementById('stat-total-referrals').textContent = stats.totalReferrals;
  document.getElementById('stat-total-ads').textContent = stats.totalAdsWatched;
  document.getElementById('stat-total-balance').textContent = `${settings.currencySymbol}${stats.totalBalance}`;
  document.getElementById('stat-total-paid').textContent = `${settings.currencySymbol}${stats.totalWithdrawn}`;
  document.getElementById('stat-pending-withdrawals').textContent = stats.pendingWithdrawalsCount;
  document.getElementById('stat-tasks-completed').textContent = stats.totalTasksCompleted;

  // Maintenance indicator
  const badge = document.getElementById('maintenance-badge');
  if (badge) badge.style.display = stats.maintenanceMode ? 'inline-flex' : 'none';

  // Render Quick Pending Table
  const pendingTbody = document.getElementById('quick-pending-tbody');
  if (pendingTbody) {
    if (pendingWithdrawals.length === 0) {
      pendingTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text-muted);">No pending withdrawals 🎉</td></tr>`;
    } else {
      pendingTbody.innerHTML = pendingWithdrawals.slice(0, 5).map(w => `
        <tr>
          <td><code>${w.id}</code></td>
          <td><b>${w.name}</b> (${w.username || w.user_id})</td>
          <td><b style="color:#34d399;">${settings.currencySymbol}${w.amount}</b></td>
          <td><span class="badge badge-active">${w.method.toUpperCase()}</span></td>
          <td><code>${w.wallet}</code></td>
          <td>${new Date(w.created_at).toLocaleTimeString()}</td>
          <td>
            <button class="btn btn-success btn-sm" onclick="reviewWithdrawalAction('${w.id}', 'approved')">Approve</button>
            <button class="btn btn-danger btn-sm" onclick="reviewWithdrawalAction('${w.id}', 'rejected')">Reject</button>
          </td>
        </tr>
      `).join('');
    }
  }

  // Render Analytics Cards (Rule 49)
  const anaRes = await adminFetch('/api/admin/analytics');
  if (anaRes.success && anaRes.analytics) {
    const a = anaRes.analytics;
    const dauEl = document.getElementById('ana-dau');
    if (dauEl) dauEl.textContent = a.dau;
    const wauEl = document.getElementById('ana-wau');
    if (wauEl) wauEl.textContent = a.wau;
    const mauEl = document.getElementById('ana-mau');
    if (mauEl) mauEl.textContent = a.mau;
    const retEl = document.getElementById('ana-retention');
    if (retEl) retEl.textContent = `${a.retentionRate}%`;
    const convEl = document.getElementById('ana-conversion');
    if (convEl) convEl.textContent = `${a.referralConversion}%`;
    const compEl = document.getElementById('ana-ad-completion');
    if (compEl) compEl.textContent = `${a.adCompletionRate}%`;
  }

  // Render Charts
  renderCharts(charts);
}

function renderCharts(charts) {
  if (!charts) return;

  const ctxGrowth = document.getElementById('chart-growth');
  const ctxActivity = document.getElementById('chart-activity');

  if (ctxGrowth && window.Chart) {
    if (adminState.chartGrowth) adminState.chartGrowth.destroy();
    adminState.chartGrowth = new Chart(ctxGrowth, {
      type: 'line',
      data: {
        labels: charts.days,
        datasets: [{
          label: 'New Registrations',
          data: charts.registrations,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.35
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#94a3b8' } } },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
        }
      }
    });
  }

  if (ctxActivity && window.Chart) {
    if (adminState.chartActivity) adminState.chartActivity.destroy();
    adminState.chartActivity = new Chart(ctxActivity, {
      type: 'bar',
      data: {
        labels: charts.days,
        datasets: [
          {
            label: 'Ads Watched',
            data: charts.adCounts,
            backgroundColor: '#06b6d4'
          },
          {
            label: 'Payouts (₹)',
            data: charts.withdrawalAmounts,
            backgroundColor: '#10b981'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#94a3b8' } } },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
        }
      }
    });
  }
}

// =======================================================
// 2. USER MANAGEMENT & LEDGER
// =======================================================

async function loadUsers(search = '', filter = '') {
  const filterVal = filter || document.getElementById('user-filter-select')?.value || 'all';
  const query = search ? `&search=${encodeURIComponent(search)}` : '';
  const filterQuery = filterVal && filterVal !== 'all' ? `&filter=${encodeURIComponent(filterVal)}` : '';
  const res = await adminFetch(`/api/admin/users?page=${adminState.userPage}&limit=30${query}${filterQuery}`);
  if (!res.success) return;

  const tbody = document.getElementById('users-table-tbody');
  const symbol = adminState.settings.currencySymbol || '₹';

  if (!tbody) return;

  if (res.users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px;">No users found matching query</td></tr>`;
    return;
  }

  tbody.innerHTML = res.users.map(u => `
    <tr>
      <td><code>${u.id}</code></td>
      <td><b>${u.first_name} ${u.last_name || ''}</b><br/><span style="color:var(--text-muted); font-size:0.75rem;">${u.username ? '@' + u.username : 'No username'}</span></td>
      <td><b style="color:#34d399;">${symbol}${u.balance}</b></td>
      <td>${u.referral_count || 0}</td>
      <td>${u.ads_watched || 0}</td>
      <td>${new Date(u.created_at).toLocaleDateString()}</td>
      <td>${u.is_banned ? '<span class="badge badge-rejected">BANNED</span>' : '<span class="badge badge-approved">ACTIVE</span>'}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="openUserProfile('${u.id}')">View & Ledger</button>
      </td>
    </tr>
  `).join('');

  document.getElementById('user-page-info').textContent = `Page ${res.page} of ${res.totalPages || 1} (${res.total} users)`;
}

window.handleUserFilterChange = function() {
  adminState.userPage = 1;
  const searchVal = document.getElementById('user-search-input')?.value || '';
  const filterVal = document.getElementById('user-filter-select')?.value || 'all';
  loadUsers(searchVal, filterVal);
};

document.getElementById('user-search-input')?.addEventListener('input', (e) => {
  adminState.userPage = 1;
  const filterVal = document.getElementById('user-filter-select')?.value || 'all';
  loadUsers(e.target.value, filterVal);
});

window.changeUserPage = function(delta) {
  adminState.userPage = Math.max(1, adminState.userPage + delta);
  const searchVal = document.getElementById('user-search-input')?.value || '';
  const filterVal = document.getElementById('user-filter-select')?.value || 'all';
  loadUsers(searchVal, filterVal);
};

window.openUserProfile = async function(userId) {
  adminState.activeUserId = userId;
  const res = await adminFetch(`/api/admin/user/${userId}`);
  if (!res.success) return showToast('Could not load user profile', 'error');

  const { user, transactions } = res;
  adminState.activeUserObj = user;
  const symbol = adminState.settings.currencySymbol || '₹';

  document.getElementById('modal-user-name').textContent = `${user.first_name} ${user.last_name || ''}`;
  document.getElementById('modal-user-id').textContent = `ID: ${user.id} • Username: ${user.username ? '@' + user.username : 'None'}`;
  document.getElementById('modal-user-balance').textContent = `${symbol}${user.balance}`;
  document.getElementById('modal-user-referrals').textContent = `${user.referral_count || 0} invites`;

  const statusEl = document.getElementById('modal-user-status');
  if (statusEl) {
    statusEl.className = `badge ${user.is_banned ? 'badge-rejected' : 'badge-approved'}`;
    statusEl.textContent = user.is_banned ? 'BANNED' : 'ACTIVE';
  }

  const banBtn = document.getElementById('modal-btn-ban');
  if (banBtn) {
    banBtn.className = `btn btn-sm ${user.is_banned ? 'btn-success' : 'btn-danger'}`;
    banBtn.textContent = user.is_banned ? '✅ Unban User' : '🚫 Ban User';
  }

  const walletEl = document.getElementById('modal-user-wallet');
  if (walletEl) {
    walletEl.textContent = user.wallet || user.wallet_upi || user.wallet_paypal || 'Not linked';
  }

  const txnsBox = document.getElementById('modal-user-txns');
  if (transactions.length === 0) {
    txnsBox.innerHTML = '<div style="color:var(--text-muted);">No ledger entries recorded yet.</div>';
  } else {
    txnsBox.innerHTML = transactions.map(t => `
      <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
        <div>
          <span class="badge ${t.amount >= 0 ? 'badge-approved' : 'badge-rejected'}" style="font-size:0.7rem;">${t.type}</span>
          <span style="margin-left:6px;">${t.description || ''}</span>
        </div>
        <div style="text-align:right;">
          <b style="color:${t.amount >= 0 ? '#34d399' : '#f87171'};">${t.amount >= 0 ? '+' : ''}${t.amount}</b>
          <div style="font-size:0.7rem; color:var(--text-muted);">Bal: ${t.balance_after}</div>
        </div>
      </div>
    `).join('');
  }

  document.getElementById('user-profile-modal').classList.add('open');
};

window.toggleBanUser = async function() {
  const user = adminState.activeUserObj;
  if (!user) return;
  const willBan = !user.is_banned;
  if (!confirm(`Are you sure you want to ${willBan ? 'BAN' : 'UNBAN'} user #${user.id} (${user.first_name})?`)) return;

  const res = await adminFetch('/api/admin/user/ban', 'POST', { userId: user.id, isBanned: willBan });
  if (res.success) {
    showToast(res.message || `User ${willBan ? 'banned' : 'unbanned'} successfully!`, 'success');
    await openUserProfile(user.id);
    loadUsers();
  } else {
    showToast(res.message || 'Action failed', 'error');
  }
};

window.resetUserReferral = async function() {
  const user = adminState.activeUserObj;
  if (!user) return;
  if (!confirm(`Reset referral binding for user #${user.id}? This will detach them from any inviter.`)) return;

  const res = await adminFetch('/api/admin/user/reset-referral', 'POST', { userId: user.id });
  if (res.success) {
    showToast('Referral link reset successfully!', 'success');
    await openUserProfile(user.id);
    loadUsers();
  } else {
    showToast(res.message || 'Action failed', 'error');
  }
};

window.submitBalanceAdjustment = async function() {
  const userId = adminState.activeUserId;
  const amount = parseFloat(document.getElementById('modal-adj-amount').value);
  const action = document.getElementById('modal-adj-action').value;
  const reason = document.getElementById('modal-adj-reason').value.trim();

  if (isNaN(amount) || amount <= 0) return showToast('Please enter a valid amount', 'warning');

  const res = await adminFetch('/api/admin/user/balance', 'POST', { userId, amount, action, reason });
  if (res.success) {
    showToast(`Balance updated successfully! New balance: ₹${res.user.balance}`, 'success');
    openUserProfile(userId);
    loadUsers();
  } else {
    showToast(res.message || 'Balance adjustment failed', 'error');
  }
};

// =======================================================
// 3. WITHDRAWAL MANAGEMENT
// =======================================================

function setupWithdrawalFilter() {
  document.querySelectorAll('.wd-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.wd-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadWithdrawals(btn.getAttribute('data-status'));
    });
  });
}
setupWithdrawalFilter();

async function loadWithdrawals(status = 'pending') {
  const res = await adminFetch(`/api/admin/withdrawals?status=${status}`);
  if (!res.success) return;

  const tbody = document.getElementById('withdrawals-table-tbody');
  const symbol = adminState.settings.currencySymbol || '₹';

  if (!tbody) return;

  if (res.withdrawals.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-muted);">No withdrawals in status: ${status}</td></tr>`;
    return;
  }

  tbody.innerHTML = res.withdrawals.map(w => {
    let badgeClass = 'badge-pending';
    if (w.status === 'approved') badgeClass = 'badge-approved';
    else if (w.status === 'paid') badgeClass = 'badge-paid';
    else if (w.status === 'rejected') badgeClass = 'badge-rejected';

    return `
      <tr>
        <td><code>${w.id}</code></td>
        <td><b>${w.name}</b><br/><span style="font-size:0.75rem; color:var(--text-muted);">${w.username || w.user_id}</span></td>
        <td><b style="color:#34d399;">${symbol}${w.amount}</b></td>
        <td><span class="badge badge-active">${(w.method || 'upi').toUpperCase()}</span></td>
        <td><code>${w.wallet}</code></td>
        <td>${new Date(w.created_at).toLocaleString()}</td>
        <td><span class="badge ${badgeClass}">${w.status.toUpperCase()}</span></td>
        <td>
          ${w.status === 'pending' ? `
            <button class="btn btn-success btn-sm" onclick="reviewWithdrawalAction('${w.id}', 'approved')">Approve</button>
            <button class="btn btn-danger btn-sm" onclick="reviewWithdrawalAction('${w.id}', 'rejected')">Reject</button>
          ` : w.status === 'approved' ? `
            <button class="btn btn-primary btn-sm" onclick="reviewWithdrawalAction('${w.id}', 'paid')">Mark Paid</button>
          ` : `<span style="color:var(--text-muted); font-size:0.8rem;">Reviewed</span>`}
        </td>
      </tr>
    `;
  }).join('');
}

window.reviewWithdrawalAction = async function(withdrawalId, status) {
  const confirmMsg = status === 'approved'
    ? `Approve withdrawal #${withdrawalId}?`
    : status === 'paid'
    ? `Mark withdrawal #${withdrawalId} as Paid?`
    : `Reject withdrawal #${withdrawalId}? (Funds will be refunded to user wallet)`;

  if (!confirm(confirmMsg)) return;

  const note = prompt('Add optional note / transaction reference:', '');
  const res = await adminFetch('/api/admin/withdrawal/review', 'POST', { withdrawalId, status, note: note || '' });

  if (res.success) {
    showToast(`Withdrawal #${withdrawalId} marked as ${status}!`, 'success');
    loadOverview();
    const activeFilter = document.querySelector('.wd-filter-btn.active')?.getAttribute('data-status') || 'pending';
    loadWithdrawals(activeFilter);
  } else {
    showToast(res.message || 'Action failed', 'error');
  }
};

// =======================================================
// 4. REFERRALS & WEEKLY LEADERBOARD
// =======================================================

async function loadReferralsData() {
  const res = await adminFetch('/api/referrals/list');
  const suspRes = await adminFetch('/api/admin/suspicious');

  if (res.success) {
    const tbody = document.getElementById('weekly-leaderboard-tbody');
    const symbol = adminState.settings.currencySymbol || '₹';

    if (tbody) {
      tbody.innerHTML = res.leaderboard.map((item, idx) => `
        <tr>
          <td><b style="color:#60a5fa;">#${idx + 1}</b></td>
          <td><b>${item.name}</b> (${item.username || item.id})</td>
          <td><b>${item.weekly_referrals || item.referral_count}</b></td>
          <td>${item.referral_count}</td>
          <td>${symbol}${item.balance}</td>
        </tr>
      `).join('');
    }
  }

  if (suspRes.success) {
    const suspBox = document.getElementById('suspicious-referrals-list');
    if (suspBox) {
      if (suspRes.suspicious.length === 0) {
        suspBox.innerHTML = '<div style="color:#34d399; font-size:0.85rem;">✅ No suspicious referral activity detected.</div>';
      } else {
        suspBox.innerHTML = suspRes.suspicious.map(s => `
          <div style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); padding:10px; border-radius:10px; margin-bottom:8px;">
            <div style="font-weight:700; color:#f87171;">${s.name} (${s.username || s.id})</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${s.flags.join(' • ')}</div>
          </div>
        `).join('');
      }
    }
  }
}

window.distributeWeeklyRewards = async function() {
  if (!confirm('Are you sure you want to trigger weekly leaderboard prize distribution? Winners will be credited immediately.')) return;

  const res = await adminFetch('/api/admin/leaderboard/distribute', 'POST');
  if (res.success) {
    showToast(`🎉 Distributed prizes to ${res.winners.length} leaderboard winners!`, 'success');
    loadReferralsData();
    loadOverview();
  } else {
    showToast('Failed to distribute rewards', 'error');
  }
};

// =======================================================
// 5. GIGAPUB ADS SETTINGS
// =======================================================

async function loadGigaPubSettings() {
  const s = adminState.settings;
  document.getElementById('gp-enabled').value = s.gigaPubEnabled !== false ? 'true' : 'false';
  document.getElementById('gp-project-id').value = s.gigaPubProjectId || '';
  document.getElementById('gp-ad-reward').value = s.adReward || 5.0;
  document.getElementById('gp-daily-limit').value = s.dailyAdLimit || 20;
  document.getElementById('gp-cooldown').value = s.adCooldownSeconds || 30;
  document.getElementById('gp-max-daily-earnings').value = s.maxDailyAdEarnings || 100.0;
  document.getElementById('gp-monetag-zone').value = s.monetagZoneId || '12128125';
  document.getElementById('gp-adsterra-enabled').value = s.adsterraEnabled !== false ? 'true' : 'false';
  document.getElementById('gp-adsterra-smartlink').value = s.adsterraSmartlink || 'https://arwf.org/4/ef8f2a6df3e5243a89a484add434af25';
}

window.saveGigaPubSettings = async function() {
  const gigaPubEnabled = document.getElementById('gp-enabled').value === 'true';
  const gigaPubProjectId = document.getElementById('gp-project-id').value.trim();
  const adReward = parseFloat(document.getElementById('gp-ad-reward').value);
  const dailyAdLimit = parseInt(document.getElementById('gp-daily-limit').value, 10);
  const adCooldownSeconds = parseInt(document.getElementById('gp-cooldown').value, 10);
  const maxDailyAdEarnings = parseFloat(document.getElementById('gp-max-daily-earnings').value);
  const monetagZoneId = document.getElementById('gp-monetag-zone').value.trim();
  const adsterraEnabled = document.getElementById('gp-adsterra-enabled').value === 'true';
  const adsterraSmartlink = document.getElementById('gp-adsterra-smartlink').value.trim();

  const payload = {
    gigaPubEnabled,
    gigaPubProjectId,
    adReward,
    dailyAdLimit,
    adCooldownSeconds,
    maxDailyAdEarnings,
    monetagZoneId,
    adsterraEnabled,
    adsterraSmartlink
  };

  const res = await adminFetch('/api/admin/settings', 'POST', { settings: payload });
  if (res.success) {
    showToast('✅ All Ad Network settings saved!', 'success');
    adminState.settings = { ...adminState.settings, ...payload };
  } else {
    showToast('Failed to save Ad Network settings', 'error');
  }
};

window.testGigaPubIntegration = async function() {
  const statusEl = document.getElementById('gp-test-status');
  statusEl.innerHTML = '<span style="color:var(--text-muted);">Testing connection to GigaPub CDNs...</span>';

  const res = await adminFetch('/api/admin/gigapub/test', 'POST', {
    projectId: document.getElementById('gp-project-id').value.trim()
  });

  statusEl.innerHTML = `<span style="color:${res.success ? '#34d399' : '#f87171'}; font-weight:700;">${res.message}</span>`;
};

// =======================================================
// 6. FORCE JOIN CHANNELS
// =======================================================

async function loadChannels() {
  const res = await adminFetch('/api/admin/channels');
  if (!res.success) return;

  const tbody = document.getElementById('channels-table-tbody');
  if (!tbody) return;

  if (res.channels.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No channels configured.</td></tr>';
    return;
  }

  tbody.innerHTML = res.channels.map(c => `
    <tr>
      <td><b>${c.name}</b></td>
      <td><code>${c.username || c.channel_id}</code></td>
      <td><a href="${c.invite_url}" target="_blank" style="color:#60a5fa; text-decoration:none;">${c.invite_url || 'Link'}</a></td>
      <td>${c.button_label}</td>
      <td>${c.is_enabled ? '<span class="badge badge-approved">ENABLED</span>' : '<span class="badge badge-rejected">DISABLED</span>'}</td>
      <td>
        <button class="btn ${c.is_enabled ? 'btn-danger' : 'btn-success'} btn-sm" onclick="toggleChannel('${c.id}', ${c.is_enabled})">${c.is_enabled ? 'Disable' : 'Enable'}</button>
        <button class="btn btn-secondary btn-sm" onclick="editChannel('${c.id}', '${encodeURIComponent(JSON.stringify(c))}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteChannel('${c.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

window.toggleChannel = async function(id, currentStatus) {
  const res = await adminFetch(`/api/admin/channels/${id}`, 'PUT', { is_enabled: !currentStatus });
  if (res.success) {
    showToast(`Channel ${!currentStatus ? 'enabled' : 'disabled'} successfully!`, 'success');
    loadChannels();
  } else {
    showToast('Failed to toggle channel status', 'error');
  }
};

window.openChannelModal = function() {
  document.getElementById('chan-edit-id').value = '';
  document.getElementById('chan-name').value = '';
  document.getElementById('chan-username').value = '';
  document.getElementById('chan-url').value = '';
  document.getElementById('chan-btn-label').value = '';
  document.getElementById('channel-modal-title').textContent = 'Add Force-Join Channel';
  document.getElementById('channel-modal').classList.add('open');
};

window.editChannel = function(id, rawJson) {
  const c = JSON.parse(decodeURIComponent(rawJson));
  document.getElementById('chan-edit-id').value = id;
  document.getElementById('chan-name').value = c.name;
  document.getElementById('chan-username').value = c.username;
  document.getElementById('chan-url').value = c.invite_url;
  document.getElementById('chan-btn-label').value = c.button_label;
  document.getElementById('channel-modal-title').textContent = 'Edit Force-Join Channel';
  document.getElementById('channel-modal').classList.add('open');
};

window.submitChannelSave = async function() {
  const id = document.getElementById('chan-edit-id').value;
  const name = document.getElementById('chan-name').value.trim();
  const username = document.getElementById('chan-username').value.trim();
  const invite_url = document.getElementById('chan-url').value.trim();
  const button_label = document.getElementById('chan-btn-label').value.trim();

  if (!name || (!username && !invite_url)) {
    return showToast('Please enter channel name and username/URL', 'warning');
  }

  const payload = { name, username, invite_url, button_label };
  let res;
  if (id) {
    res = await adminFetch(`/api/admin/channels/${id}`, 'PUT', payload);
  } else {
    res = await adminFetch('/api/admin/channels', 'POST', payload);
  }

  if (res.success) {
    showToast('Channel saved!', 'success');
    closeModal('channel-modal');
    loadChannels();
  } else {
    showToast('Failed to save channel', 'error');
  }
};

window.deleteChannel = async function(id) {
  if (!confirm('Delete this required channel?')) return;
  const res = await adminFetch(`/api/admin/channels/${id}`, 'DELETE');
  if (res.success) {
    showToast('Channel deleted', 'success');
    loadChannels();
  }
};

// =======================================================
// 7. TASKS SYSTEM
// =======================================================

async function loadTasks() {
  const res = await adminFetch('/api/admin/tasks');
  if (!res.success) return;

  const tbody = document.getElementById('tasks-table-tbody');
  const symbol = adminState.settings.currencySymbol || '₹';

  if (!tbody) return;

  if (res.tasks.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">No tasks created.</td></tr>';
    return;
  }

  tbody.innerHTML = res.tasks.map(t => `
    <tr>
      <td style="font-size:1.4rem;">${t.icon || '🎯'}</td>
      <td><b>${t.title}</b><br/><span style="font-size:0.75rem; color:var(--text-muted);">${t.description}</span></td>
      <td><span class="badge badge-active">${t.task_type}</span></td>
      <td><b style="color:#34d399;">+${symbol}${t.reward}</b></td>
      <td>${t.completions_count || 0} completions</td>
      <td>${t.is_active ? '<span class="badge badge-approved">ACTIVE</span>' : '<span class="badge badge-rejected">INACTIVE</span>'}</td>
      <td>
        <button class="btn ${t.is_active ? 'btn-danger' : 'btn-success'} btn-sm" onclick="toggleTask('${t.id}', ${t.is_active})">${t.is_active ? 'Deactivate' : 'Activate'}</button>
        <button class="btn btn-secondary btn-sm" onclick="editTask('${t.id}', '${encodeURIComponent(JSON.stringify(t))}')">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteTask('${t.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

window.toggleTask = async function(id, currentStatus) {
  const res = await adminFetch(`/api/admin/tasks/${id}`, 'PUT', { is_active: !currentStatus });
  if (res.success) {
    showToast(`Task ${!currentStatus ? 'activated' : 'deactivated'} successfully!`, 'success');
    loadTasks();
  } else {
    showToast('Failed to toggle task status', 'error');
  }
};

window.editTask = function(id, rawJson) {
  const t = JSON.parse(decodeURIComponent(rawJson));
  document.getElementById('task-edit-id').value = id;
  document.getElementById('task-title').value = t.title || '';
  document.getElementById('task-desc').value = t.description || '';
  document.getElementById('task-reward').value = t.reward || '5.00';
  document.getElementById('task-type').value = t.task_type || 'url_visit';
  document.getElementById('task-url').value = t.target_url || '';
  const chatEl = document.getElementById('task-chat-id');
  if (chatEl) chatEl.value = t.chat_id || '';
  document.getElementById('task-modal-title').textContent = 'Edit Social Task';
  document.getElementById('task-modal').classList.add('open');
};

window.openTaskModal = function() {
  document.getElementById('task-edit-id').value = '';
  document.getElementById('task-title').value = '';
  document.getElementById('task-desc').value = '';
  document.getElementById('task-reward').value = '5.00';
  document.getElementById('task-url').value = '';
  const chatEl = document.getElementById('task-chat-id');
  if (chatEl) chatEl.value = '';
  document.getElementById('task-modal-title').textContent = 'Create Social Task';
  document.getElementById('task-modal').classList.add('open');
};

window.submitTaskSave = async function() {
  const id = document.getElementById('task-edit-id').value;
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-desc').value.trim();
  const reward = parseFloat(document.getElementById('task-reward').value);
  const task_type = document.getElementById('task-type').value;
  const target_url = document.getElementById('task-url').value.trim();
  const chat_id = document.getElementById('task-chat-id')?.value.trim() || '';

  if (!title || isNaN(reward)) return showToast('Please enter title and reward', 'warning');

  const payload = { title, description, reward, task_type, target_url, chat_id };
  let res;
  if (id) {
    res = await adminFetch(`/api/admin/tasks/${id}`, 'PUT', payload);
  } else {
    res = await adminFetch('/api/admin/tasks', 'POST', payload);
  }

  if (res.success) {
    showToast(id ? 'Task updated successfully!' : 'Task created successfully!', 'success');
    closeModal('task-modal');
    loadTasks();
  } else {
    showToast(res.message || 'Failed to save task', 'error');
  }
};

window.deleteTask = async function(id) {
  if (!confirm('Delete this task?')) return;
  const res = await adminFetch(`/api/admin/tasks/${id}`, 'DELETE');
  if (res.success) {
    showToast('Task deleted', 'success');
    loadTasks();
  }
};

// =======================================================
// 8. MESSAGE TEMPLATES & MEDIA BUILDER
// =======================================================

async function loadTemplates() {
  const res = await adminFetch('/api/admin/templates');
  if (res.success) {
    adminState.templates = res.templates;
    loadSelectedTemplate();
  }
}

window.loadSelectedTemplate = function() {
  const key = document.getElementById('tpl-selector').value;
  adminState.currentTemplateKey = key;
  const tpl = adminState.templates[key] || { text: '', media_type: 'none', media_url: '' };

  document.getElementById('tpl-text').value = tpl.text || '';
  document.getElementById('tpl-media-type').value = tpl.media_type || 'none';
  document.getElementById('tpl-media-url').value = tpl.media_url || '';
};

window.copyPlaceholder = function(str) {
  navigator.clipboard.writeText(str);
  showToast(`Copied ${str}`, 'info');
};

window.saveCurrentTemplate = async function() {
  const key = adminState.currentTemplateKey;
  const text = document.getElementById('tpl-text').value;
  const media_type = document.getElementById('tpl-media-type').value;
  const media_url = document.getElementById('tpl-media-url').value.trim();

  const res = await adminFetch(`/api/admin/templates/${key}`, 'POST', {
    text, media_type, media_url
  });

  if (res.success) {
    adminState.templates[key] = res.template;
    showToast(`Template ${key} saved!`, 'success');
  } else {
    showToast('Failed to save template', 'error');
  }
};

// =======================================================
// 9. BROADCAST STUDIO
// =======================================================

window.sendBroadcast = async function() {
  const title = document.getElementById('bc-title').value.trim();
  const target = document.getElementById('bc-target').value;
  const text = document.getElementById('bc-text').value.trim();

  if (!text) return showToast('Please enter broadcast message text', 'warning');
  if (!confirm(`Are you ready to broadcast this announcement to audience: ${target}?`)) return;

  const box = document.getElementById('bc-progress-box');
  const progressText = document.getElementById('bc-progress-text');
  box.style.display = 'block';
  progressText.textContent = '🚀 Broadcast launched! Delivering in background...';

  const res = await adminFetch('/api/admin/broadcast', 'POST', { title, target, text });
  if (res.success) {
    showToast('Broadcast queue initiated!', 'success');
    progressText.textContent = `Delivering to ${res.broadcast.total_recipients || 'target'} users...`;
    setTimeout(loadBroadcastHistory, 1500);
  } else {
    showToast(res.message || 'Broadcast failed', 'error');
  }
};

window.loadBroadcastHistory = async function() {
  const res = await adminFetch('/api/admin/broadcasts');
  const tbody = document.getElementById('broadcast-history-tbody');
  if (!tbody) return;

  if (!res.success || !res.broadcasts || res.broadcasts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted);">No broadcasts recorded yet.</td></tr>';
    return;
  }

  tbody.innerHTML = res.broadcasts.map(b => `
    <tr>
      <td><b>${b.title || 'Announcement'}</b><br/><span style="font-size:0.75rem; color:var(--text-muted);">${(b.text || '').slice(0, 50)}...</span></td>
      <td><span class="badge badge-active">${(b.target || 'all').toUpperCase()}</span></td>
      <td><b>${b.sent_count || 0}</b> / ${b.total_recipients || b.target_count || 0}</td>
      <td><span class="badge ${b.status === 'completed' ? 'badge-approved' : 'badge-pending'}">${(b.status || 'queued').toUpperCase()}</span></td>
      <td>${new Date(b.created_at || b.timestamp).toLocaleString()}</td>
    </tr>
  `).join('');
};

// =======================================================
// 10. GLOBAL BOT SETTINGS
// =======================================================

async function loadSettings() {
  if (!adminState.settings || !adminState.settings.currencySymbol) {
    const ov = await adminFetch('/api/admin/overview');
    if (ov.success && ov.settings) {
      adminState.settings = ov.settings;
    }
  }
  const s = adminState.settings || {};
  document.getElementById('set-maintenance').value = s.maintenanceMode ? 'true' : 'false';
  document.getElementById('set-currency-symbol').value = s.currencySymbol || '₹';
  document.getElementById('set-currency-name').value = s.currencyName || 'INR';
  document.getElementById('set-referral-reward').value = s.referralReward !== undefined ? s.referralReward : 20.0;
  document.getElementById('set-daily-bonus').value = s.dailyBonus !== undefined ? s.dailyBonus : 5.0;
  document.getElementById('set-min-withdrawal').value = s.minWithdrawal !== undefined ? s.minWithdrawal : 500.0;
  document.getElementById('set-max-withdrawal').value = s.maxWithdrawal !== undefined ? s.maxWithdrawal : 10000.0;
  document.getElementById('set-support-user').value = s.supportUsername || '';

  document.getElementById('btn-label-bal').value = s.btn_balance || '💰 My Balance';
  document.getElementById('btn-label-wd').value = s.btn_withdraw || '💸 Withdraw';
  document.getElementById('btn-label-ads').value = s.btn_ads || '🎬 Watch Ads';
  document.getElementById('btn-label-ref').value = s.btn_refer || '👥 Invite Friends';
  document.getElementById('btn-label-bon').value = s.btn_bonus || '🎁 Bonus';
  document.getElementById('btn-label-tsk').value = s.btn_tasks || '📋 Tasks';
}

window.saveGlobalSettings = async function() {
  const payload = {
    maintenanceMode: document.getElementById('set-maintenance').value === 'true',
    currencySymbol: document.getElementById('set-currency-symbol').value.trim(),
    currencyName: document.getElementById('set-currency-name').value.trim(),
    referralReward: parseFloat(document.getElementById('set-referral-reward').value),
    dailyBonus: parseFloat(document.getElementById('set-daily-bonus').value),
    minWithdrawal: parseFloat(document.getElementById('set-min-withdrawal').value),
    maxWithdrawal: parseFloat(document.getElementById('set-max-withdrawal').value),
    supportUsername: document.getElementById('set-support-user').value.trim(),
    btn_balance: document.getElementById('btn-label-bal').value.trim(),
    btn_withdraw: document.getElementById('btn-label-wd').value.trim(),
    btn_ads: document.getElementById('btn-label-ads').value.trim(),
    btn_refer: document.getElementById('btn-label-ref').value.trim(),
    btn_bonus: document.getElementById('btn-label-bon').value.trim(),
    btn_tasks: document.getElementById('btn-label-tsk').value.trim()
  };

  const res = await adminFetch('/api/admin/settings', 'POST', { settings: payload });
  if (res.success) {
    adminState.settings = { ...adminState.settings, ...payload };
    showToast('Global settings saved!', 'success');
    loadOverview();
  } else {
    showToast('Failed to save settings', 'error');
  }
};

// =======================================================
// 11. AUDIT LOGS
// =======================================================

async function loadAuditLogs() {
  const res = await adminFetch('/api/admin/audit-logs');
  if (!res.success) return;

  const tbody = document.getElementById('audit-table-tbody');
  if (!tbody) return;

  if (res.logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">No audit records.</td></tr>';
    return;
  }

  tbody.innerHTML = res.logs.map(l => `
    <tr>
      <td>${new Date(l.timestamp).toLocaleString()}</td>
      <td><code>${l.admin_id}</code></td>
      <td><span class="badge badge-active">${l.action}</span></td>
      <td><code>${l.target_id || '-'}</code></td>
      <td style="font-size:0.75rem; color:var(--text-muted);">${JSON.stringify(l.details)}</td>
    </tr>
  `).join('');
}

// Utility Toast & Modal Helpers
function showToast(msg, type = 'info') {
  const toast = document.getElementById('admin-toast');
  if (!toast) return;

  let bg = '#1e293b';
  if (type === 'success') bg = '#065f46';
  else if (type === 'error') bg = '#991b1b';
  else if (type === 'warning') bg = '#92400e';

  toast.style.background = bg;
  toast.textContent = msg;
  toast.style.display = 'block';

  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

window.closeModal = function(modalId) {
  document.getElementById(modalId)?.classList.remove('open');
};

window.openBalanceModalQuick = function(action = 'add') {
  const userId = prompt('Enter Telegram User ID to adjust balance:');
  if (!userId) return;
  openUserProfile(userId.trim()).then(() => {
    const sel = document.getElementById('modal-adj-action');
    if (sel) sel.value = action;
  });
};

window.downloadExport = async function(type) {
  const token = adminState.token;
  try {
    const response = await fetch(`/api/admin/export/${type}`, {
      headers: {
        'x-admin-token': token,
        'Authorization': `Bearer ${token}`,
        'x-telegram-init-data': tg?.initData || ''
      }
    });
    if (!response.ok) {
      const err = await response.json();
      return showToast(err.message || 'Export failed', 'error');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_export_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast(`Exported ${type} successfully!`, 'success');
  } catch (err) {
    showToast('Export failed: ' + err.message, 'error');
  }
};

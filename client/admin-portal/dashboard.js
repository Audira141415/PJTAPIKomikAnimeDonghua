/**
 * @module AudiraAdminCore
 * @purpose UI Engine for Audira Gateway Admin Portal (API Infrastructure Monitoring)
 * @caller index.html
 * @dependencies Audira API v1 (/api/v1), LocalStorage, DOM API
 * @public_functions boot(), initDiscovery(), adminFetch(), renderDataGrid(), filterCards(), renderSpotlight()
 * @side_effects Fetches real-time telemetry, Manages auth tokens, Interacts with Scraper Nodes, DOM modification, Event Delegation
 */

const API_BASE = '/api/v1';
const FALLBACK_DATA_PATH = '/data/dashboard-fallback.json';

/* ── Toast Engine ─────────────────────────────────────────── */
const showToast = (message, type = 'info', duration = 4000) => {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warn: '⚠️' };
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '🔔'}</span>
    <div class="toast-body">${message}</div>
  `;

  container.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
};

/* ── Theme Engine ─────────────────────────────────────────── */
const initTheme = () => {
  const savedTheme = localStorage.getItem('audira-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
};
const toggleTheme = () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('audira-theme', newTheme);
  updateThemeIcon(newTheme);
};
const updateThemeIcon = (theme) => {
  const iconEl = document.getElementById('themeIcon');
  if (iconEl) iconEl.textContent = theme === 'light' ? '☀️' : '🌙';
};
initTheme();

/* ── Admin Core (Auth & Fetch) ────────────────────────────── */
let adminToken = localStorage.getItem('audira-admin-token');

const adminFetch = async (url, options = {}) => {
  const headers = { ...options.headers };
  if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
  
  const response = await fetch(`${API_BASE}${url}`, { ...options, headers });
  if (response.status === 401) {
    logoutAdmin();
    showLoginModal();
    throw new Error('Unauthorized');
  }
  return response.json();
};

const loginAdmin = async (email, password) => {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const result = await res.json();
    if (result.success) {
      adminToken = result.data.accessToken;
      localStorage.setItem('audira-admin-token', adminToken);
      hideLoginModal();
      updateAdminUI(true);
      refreshAdminData();
      showToast('Authentication Successful. Genesis Node Linked.', 'success');
      return true;
    }
    throw new Error(result.message || 'Access Denied');
  } catch (err) {
    const errEl = document.getElementById('loginError');
    if (errEl) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    }
    return false;
  }
};

const logoutAdmin = () => {
  adminToken = null;
  localStorage.removeItem('audira-admin-token');
  updateAdminUI(false);
  
  // Hide ALL admin sections from the view immediately
  adminSections.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = 'none';
      el.classList.remove('active');
    }
  });
  
  // Hide admin-only UI elements
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
  
  window.location.hash = '#section-overview';
  switchSection('section-overview');
};

const updateAdminUI = (isAuthenticated) => {
  const profileWrapper = document.getElementById('adminProfileWrapper');
  const publicBtns = document.getElementById('publicHeaderBtns');
  const adminNameEl = document.getElementById('headerAdminName');
  const adminLinks = document.querySelectorAll('.admin-only');
  
  if (isAuthenticated) {
    if (publicBtns) publicBtns.style.display = 'none';
    if (profileWrapper) profileWrapper.style.display = 'block';
    
    const savedName = localStorage.getItem('audira-admin-name') || 'Administrator';
    if (adminNameEl) adminNameEl.textContent = savedName;
  } else {
    if (publicBtns) publicBtns.style.display = 'flex';
    if (profileWrapper) profileWrapper.style.display = 'none';
  }
  
  adminLinks.forEach(link => {
    link.style.display = isAuthenticated ? 'inline-block' : 'none';
  });
};

const showLoginModal = () => {
  const modal = document.getElementById('loginModal');
  if (modal) modal.style.display = 'flex';

  // Initialize tabs
  const loginTab = document.getElementById('tabLogin');
  const signupTab = document.getElementById('tabSignup');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const loginError = document.getElementById('loginError');

  if (loginError) loginError.style.display = 'none';

  if (loginTab && signupTab && loginForm && signupForm) {
    loginTab.onclick = () => {
      loginTab.classList.add('active');
      signupTab.classList.remove('active');
      loginForm.style.display = 'block';
      signupForm.style.display = 'none';
    };
    signupTab.onclick = () => {
      signupTab.classList.add('active');
      loginTab.classList.remove('active');
      signupForm.style.display = 'block';
      loginForm.style.display = 'none';
    };
  }
};

/* ── App Registry Modal Engine ────────────────────────────── */
const showCreateAppModal = () => {
  let modal = document.getElementById('createAppModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'createAppModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content glass-card">
        <div class="modal-header">
          <h3>Create New Application</h3>
          <button class="close-modal" id="closeCreateAppModal">×</button>
        </div>
        <form id="createAppForm">
          <div class="form-group">
            <label>Application Name</label>
            <input type="text" id="newAppName" placeholder="e.g. Audira Mobile App" required>
          </div>
          <div class="form-group">
            <label>Authorized Domain</label>
            <input type="text" id="newAppDomain" placeholder="e.g. app.audira.com" required>
          </div>
          <button type="submit" class="btn-prime-alt" style="width:100%; margin-top:20px;">GENERATE API KEY</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('closeCreateAppModal').onclick = () => modal.style.display = 'none';
    document.getElementById('createAppForm').onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('newAppName').value;
      const domain = document.getElementById('newAppDomain').value;
      await processCreateApp(name, domain);
      modal.style.display = 'none';
    };
  }
  modal.style.display = 'flex';
};

const processCreateApp = async (name, domain) => {
  try {
    const res = await adminFetch('/client-usage/clients', {
      method: 'POST',
      body: JSON.stringify({ name, domain })
    });
    if (res.success) {
      alert(`App registered successfully!\nAPI Key: ${res.data.apiKey}\n\nPLEASE SAVE THIS KEY NOW.`);
      renderRegistry();
    }
  } catch (err) { showToast(err.message, 'error'); }
};

async function registerAdmin(email, password, name) {
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name })
        });
        const data = await response.json();
        if (response.ok) {
            showToast('Registration Successful! Please login.', 'success');
            document.getElementById('tabLogin').click();
            return true;
        } else {
            showToast(data.message || 'Registration failed', 'error');
            return false;
        }
    } catch (err) {
        showToast('Network error during registration', 'error');
        return false;
    }
}
const hideLoginModal = () => {
  const modal = document.getElementById('loginModal');
  if (modal) modal.style.display = 'none';
};

/* ── Navigation Engine (Consolidated) ────────────────────── */
window.showSection = (sectionId) => {
  if (typeof switchSection === 'function') {
    switchSection(sectionId);
  } else {
    console.warn("[NAV] switchSection not yet initialized");
  }
};

const refreshAdminData = () => {
  if (!adminToken) return;
  loadIntelligenceData();
};

const loadOperationsData = async () => {
  if (!adminToken) return;
  try {
    const data = await adminFetch('/jobs/dashboard');
    if (data.success) renderOperations(data.data);
  } catch (err) {
    console.error('Failed to load operations:', err);
  }
};

const loadIntelligenceData = async () => {
  if (!adminToken) return;
  try {
    const data = await adminFetch('/client-usage/reports/dashboard');
    if (data.success) renderIntelligence(data.data);
  } catch (err) {
    console.error('Failed to load intelligence:', err);
  }
};

const renderOperations = (data) => {
  const container = document.getElementById('workerStatsGrid');
  if (!container) return;
  const counts = data.counts || {};
  container.innerHTML = `
    <div class="job-stat"><span class="count">${counts.active || 0}</span><span class="label">Active</span></div>
    <div class="job-stat"><span class="count">${counts.waiting || 0}</span><span class="label">Waiting</span></div>
    <div class="job-stat btn-retry" style="cursor:pointer"><span class="count" style="color:var(--red)">${counts.failed || 0}</span><span class="label">Failed (Retry?)</span></div>
    <div class="job-stat"><span class="count" style="color:var(--green)">${counts.completed || 0}</span><span class="label">Completed</span></div>
  `;
  
  const retryBtn = container.querySelector('.btn-retry');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => retryFailedJobs());
  }
  
  renderSyncTriggers();
};

const syncSources = [
  { id: 'anime', label: 'Anime (Otakudesu)' },
  { id: 'samehadaku', label: 'Samehadaku' },
  { id: 'animasu', label: 'Animasu' },
  { id: 'kusonime', label: 'Kusonime' },
  { id: 'anoboy', label: 'Anoboy' },
  { id: 'animesail', label: 'Animesail' },
  { id: 'oploverz', label: 'Oploverz' },
  { id: 'animekuindo', label: 'Animekuindo' },
  { id: 'nimegami', label: 'Nimegami' },
  { id: 'alqanime', label: 'AlQanime' },
  { id: 'donghub', label: 'Donghub (Donghua)' },
  { id: 'winbu', label: 'Winbu' },
  { id: 'kura', label: 'Kuramanime' },
  { id: 'dramabox', label: 'Dramabox' },
  { id: 'drachin', label: 'Drachin (C-Drama)' }
];

const renderSyncTriggers = () => {
  const grid = document.getElementById('syncTriggersGrid');
  if (!grid) return;
  grid.innerHTML = syncSources.map(s => `
    <button class="btn-ops" id="sync-btn-${s.id}" data-id="${s.id}">
       <i class="sync-icon">🔄</i> <span>Sync ${s.label}</span>
    </button>
  `).join('');

  grid.querySelectorAll('.btn-ops').forEach(btn => {
    btn.addEventListener('click', () => triggerSync(btn.dataset.id));
  });
};

const triggerSync = async (source) => {
  const btn = document.getElementById(`sync-btn-${source}`);
  if (btn) {
    btn.disabled = true;
    btn.classList.add('syncing');
    btn.querySelector('span').textContent = 'Syncing...';
  }
  
  try {
    const res = await adminFetch(`/jobs/anime-sync/${source}`, { method: 'POST' });
    if (res.success) {
      showToast(`Sync for ${source} triggered successfully.`, 'success');
      if (btn) {
        btn.classList.remove('syncing');
        btn.classList.add('success');
        btn.querySelector('span').textContent = 'Success!';
        setTimeout(() => {
          btn.disabled = false;
          btn.classList.remove('success');
          btn.querySelector('span').textContent = `Sync ${syncSources.find(s => s.id === source).label}`;
        }, 3000);
      }
      loadOperationsData();
    }
  } catch (err) {
    showToast(`Sync Critical Failure: ${err.message}`, 'error');
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('syncing');
      btn.querySelector('span').textContent = `Sync ${syncSources.find(s => s.id === source).label}`;
    }
  }
};

const retryFailedJobs = async () => {
  if (!confirm('PROTOCOL ALERT: Retry all failed scraper tasks?')) return;
  try {
    const res = await adminFetch('/jobs/retry', { method: 'POST' });
    if (res.success) {
       showToast('Retry command broadcasted to all workers.', 'info');
       loadOperationsData();
    }
  } catch (err) { showToast(err.message, 'error'); }
};

const renderIntelligence = (data) => {
  const totalEl = document.getElementById('intelTotalRequests');
  const activeEl = document.getElementById('intelActiveClients');
  const chartEl = document.getElementById('trafficChart');
  const list = document.getElementById('topClientsList');

  if (totalEl) totalEl.textContent = data.totalRequests || 0;
  if (activeEl) activeEl.textContent = data.activeClients || 0;

  if (chartEl) {
    const daily = data.dailyTotals || [];
    if (!daily.length) {
      chartEl.innerHTML = '<div class="text-muted" style="padding:20px">No activity recorded in the last 7 days.</div>';
    } else {
      const maxRequests = Math.max(...daily.map(d => d.requestCount), 1);
      chartEl.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 8px; padding: 10px;">
          ${daily.map(d => `
            <div style="display: grid; grid-template-columns: 80px 1fr 60px; align-items: center; gap: 10px;">
              <span style="font-size: 0.7rem; color: var(--text-muted)">${new Date(d.day).toLocaleDateString(undefined, {weekday: 'short', day: 'numeric'})}</span>
              <div style="height: 12px; background: rgba(255,255,255,0.05); border-radius: 6px; overflow: hidden;">
                <div style="height: 100%; width: ${Math.max(2, Math.round((d.requestCount / maxRequests) * 100))}%; background: var(--accent); border-radius: inherit;"></div>
              </div>
              <span style="font-size: 0.75rem; font-weight: 700; text-align: right;">${d.requestCount}</span>
            </div>
          `).join('')}
        </div>
      `;
    }
  }

  if (list) {
    list.innerHTML = (data.topWebsites || []).map(site => `
      <div class="consumer-item">
        <span class="consumer-domain">${site.domain || 'Direct Access'}</span>
        <span class="consumer-hits">${site.requestCount} requests</span>
      </div>
    `).join('') || '<div class="text-muted">No data available</div>';
  }
  renderRegistry();
};

const renderRegistry = async () => {
  const body = document.getElementById('registryBody');
  if (!body) return;
  try {
    const res = await adminFetch('/client-usage/clients');
    if (res.success) {
      if (!res.data || res.data.length === 0) {
        body.innerHTML = `<tr><td colspan="6" class="text-center" style="padding:40px; color:var(--text-muted)">Belum ada aplikasi yang terdaftar. Klik "Register New App" untuk memulai.</td></tr>`;
        return;
      }
      body.innerHTML = res.data.map(app => `
        <tr>
          <td><strong style="color:var(--accent)">${app.name}</strong></td>
          <td><code>${app.domain}</code></td>
          <td><code>${app.apiKeyPrefix}...</code></td>
          <td><span class="badge ${app.status === 'active' ? 'badge-green' : 'badge-red'}">${app.status}</span></td>
          <td>${app.lastUsedAt ? new Date(app.lastUsedAt).toLocaleDateString() : 'Never'}</td>
          <td>
             <button class="btn-ops btn-rotate" style="padding:6px 12px; font-size:0.75rem" data-id="${app._id}">Rotate</button>
          </td>
        </tr>
      `).join('');

      body.querySelectorAll('.btn-rotate').forEach(btn => {
        btn.addEventListener('click', () => rotateKey(btn.dataset.id));
      });
    }
  } catch (err) { console.error(err); }
};

const rotateKey = async (id) => {
  if (!confirm('Warning: This will invalidate the current API key. Proceed?')) return;
  try {
    const res = await adminFetch(`/client-usage/clients/${id}/rotate-key`, { method: 'POST' });
    if (res.success) {
      alert(`New API Key: ${res.data.apiKey}\n\nSAVE THIS SECURELY.`);
      renderRegistry();
    }
  } catch (err) { alert(err.message); }
};

const createNewApp = () => {
  showCreateAppModal();
};

const defaultDashboardData = {
  categories: [
    {
      key: 'donghua',
      label: 'Donghua Highlights',
      slides: [
        {
          title: 'Trending Donghua Hari Ini',
          subtitle: 'Snapshot demo saat MongoDB offline',
          image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1280&q=80',
          metric: '12.4k views',
        },
      ],
    },
  ],
  testerPresets: [
    {
      key: 'donghua',
      label: 'Donghua',
      items: [
        {
          name: 'Home Donghua',
          method: 'GET',
          path: '/donghua/home',
        },
      ],
    },
  ],
};

const endpointExamples = {
  '/api/v1/trending': {
    request: 'GET /api/v1/trending?period=week&limit=10',
    response: {
      success: true,
      data: [{ title: 'Solo Leveling', bookmarks: 912 }],
      meta: { period: 'week', limit: 10 },
    },
  },
  '/api/v1/popular': {
    request: 'GET /api/v1/popular?metric=bookmarks&limit=10',
    response: {
      success: true,
      data: [{ title: 'The Beginning After The End', score: 7850 }],
      meta: { metric: 'bookmarks' },
    },
  },
  '/api/v1/latest': {
    request: 'GET /api/v1/latest?limit=20',
    response: {
      success: true,
      data: [{ title: 'Nano Machine', createdAt: '2026-04-07T03:12:10.000Z' }],
    },
  },
  '/api/v1/donghua/home': {
    request: 'GET /api/v1/donghua/home',
    response: {
      success: true,
      data: {
        latest_release: [{ title: 'Battle Through the Heavens S5 E105' }],
        completed_donghua: [{ title: 'The Outcast S4' }],
      },
    },
  },
  '/api/v1/donghua/:slug': {
    request: 'GET /api/v1/donghua/battle-through-the-heavens',
    response: {
      success: true,
      data: {
        title: 'Battle Through the Heavens',
        type: 'donghua',
        seasons: 5,
      },
    },
  },
  '/api/v1/donghua/ongoing': {
    request: 'GET /api/v1/donghua/ongoing?page=1&limit=20',
    response: {
      success: true,
      data: [{ title: 'Perfect World', status: 'ongoing' }],
      pagination: { page: 1, limit: 20, total: 49 },
    },
  },
  '/api/v1/donghua/completed': {
    request: 'GET /api/v1/donghua/completed?page=1&limit=20',
    response: {
      success: true,
      data: [{ title: 'The Outcast', status: 'completed' }],
      pagination: { page: 1, limit: 20, total: 23 },
    },
  },
  '/api/v1/donghua/search': {
    request: 'GET /api/v1/donghua/search?q=battle+through',
    response: {
      success: true,
      data: [{ title: 'Battle Through the Heavens', score: 12.3 }],
      query: 'battle through',
    },
  },
  '/api/v1/donghua/episode/:episodeSlug': {
    request: 'GET /api/v1/donghua/episode/btth-ep-105',
    response: {
      success: true,
      data: {
        title: 'BTTH Episode 105',
        streamUrl: 'https://cdn.example.com/stream/btth-ep-105.m3u8',
        navigation: { prev: 'btth-ep-104', next: null },
      },
    },
  },
  '/api/v1/donghua/genres': {
    request: 'GET /api/v1/donghua/genres',
    response: {
      success: true,
      data: ['action', 'fantasy', 'martial-arts'],
    },
  },
  '/api/v1/donghua/genre/:genre': {
    request: 'GET /api/v1/donghua/genre/action?page=1',
    response: {
      success: true,
      data: [{ title: 'Swallowed Star', genres: ['action', 'sci-fi'] }],
      pagination: { page: 1, limit: 20, total: 18 },
    },
  },
  '/api/v1/donghua/year/:year': {
    request: 'GET /api/v1/donghua/year/2024?page=1',
    response: {
      success: true,
      data: [{ title: 'A Record of a Mortal Journey to Immortality', year: 2024 }],
      pagination: { page: 1, limit: 20, total: 16 },
    },
  },
  '/api/v1/mangas': {
    request: 'GET /api/v1/mangas?page=1&limit=20&type=manga',
    response: {
      success: true,
      data: [{ title: 'Solo Leveling' }, { title: 'Eleceed' }],
      pagination: { page: 1, limit: 20, total: 157 },
    },
  },
  '/api/v1/mangas/:slug': {
    request: 'GET /api/v1/mangas/solo-leveling',
    response: {
      success: true,
      data: {
        title: 'Solo Leveling',
        type: 'manhwa',
        chapterCount: 201,
      },
    },
  },
  '/api/v1/mangas/:id/rate': {
    request: 'POST /api/v1/mangas/661f11e1d13e0af0b0f872a1/rate',
    response: {
      success: true,
      message: 'Rating saved successfully',
      data: { userRating: 9, avgRating: 8.7 },
    },
  },
  '/api/v1/mangas/:id/chapters': {
    request: 'GET /api/v1/mangas/661f11e1d13e0af0b0f872a1/chapters',
    response: {
      success: true,
      data: [{ number: 201, slug: 'solo-leveling-chapter-201' }],
    },
  },
  '/api/v1/chapters/:slug': {
    request: 'GET /api/v1/chapters/solo-leveling-chapter-201',
    response: {
      success: true,
      data: {
        title: 'Chapter 201',
        images: ['https://cdn.example.com/ch201/page-1.jpg'],
      },
    },
  },
  '/api/v1/chapters/:slug/navigation': {
    request: 'GET /api/v1/chapters/solo-leveling-chapter-201/navigation',
    response: {
      success: true,
      data: {
        prev: { slug: 'solo-leveling-chapter-200' },
        next: null,
      },
    },
  },
  '/api/v1/chapters': {
    request: 'POST /api/v1/chapters',
    response: {
      success: true,
      message: 'Chapter created',
      data: { id: '6620abf2d13e0af0b0f8739c' },
    },
  },
  '/api/v1/search': {
    request: 'GET /api/v1/search?q=naruto&type=manga',
    response: {
      success: true,
      data: [{ title: 'Naruto', type: 'manga' }],
      query: { q: 'naruto', type: 'manga' },
    },
  },
  '/api/v1/auth/register': {
    request: 'POST /api/v1/auth/register',
    response: {
      success: true,
      message: 'Registration successful. Please verify your email.',
    },
  },
  '/api/v1/auth/login': {
    request: 'POST /api/v1/auth/login',
    response: {
      success: true,
      data: {
        accessToken: 'eyJhbGci...sample',
        refreshToken: 'eyJhbGci...sample',
      },
    },
  },
  '/api/v1/auth/refresh': {
    request: 'POST /api/v1/auth/refresh',
    response: {
      success: true,
      data: {
        accessToken: 'eyJhbGci...new-access-token',
      },
    },
  },
  '/api/v1/users/me': {
    request: 'GET /api/v1/users/me',
    response: {
      success: true,
      data: {
        id: '661fa02ad13e0af0b0f87011',
        username: 'reader01',
        bookmarksCount: 27,
      },
    },
  },
  '/api/v1/users/:userId/public': {
    request: 'GET /api/v1/users/661fa02ad13e0af0b0f87011/public',
    response: {
      success: true,
      data: {
        username: 'reader01',
        bio: 'Action/Fantasy enthusiast',
      },
    },
  },
  '/api/v1/bookmarks': {
    request: 'GET /api/v1/bookmarks?page=1&limit=20',
    response: {
      success: true,
      data: [{ mangaTitle: 'Solo Leveling', status: 'reading' }],
      pagination: { page: 1, limit: 20, total: 27 },
    },
  },
  '/api/v1/bookmarks/:mangaId': {
    request: 'POST /api/v1/bookmarks/661f11e1d13e0af0b0f872a1',
    response: {
      success: true,
      message: 'Bookmark toggled',
      data: { bookmarked: true },
    },
  },
  '/api/v1/histories': {
    request: 'GET /api/v1/histories?page=1&limit=20',
    response: {
      success: true,
      data: [{ chapterSlug: 'solo-leveling-chapter-200', progress: 100 }],
    },
  },
  '/api/v1/collections': {
    request: 'GET /api/v1/collections?page=1&limit=20',
    response: {
      success: true,
      data: [{ name: 'Best Action Titles', visibility: 'public' }],
      pagination: { page: 1, limit: 20, total: 6 },
    },
  },
  '/api/v1/collections/public/trending': {
    request: 'GET /api/v1/collections/public/trending',
    response: {
      success: true,
      data: [{ name: 'Top Donghua 2026', followers: 1480 }],
    },
  },
  '/api/v1/comments/manga/:mangaId': {
    request: 'GET /api/v1/comments/manga/661f11e1d13e0af0b0f872a1?page=1',
    response: {
      success: true,
      data: [{ user: 'reader01', content: 'Arc ini sangat bagus!' }],
      pagination: { page: 1, total: 44 },
    },
  },
  '/api/v1/comments': {
    request: 'POST /api/v1/comments',
    response: {
      success: true,
      message: 'Comment posted',
      data: { id: '6621d4d4d13e0af0b0f87f11' },
    },
  },
  '/api/v1/reviews/manga/:mangaId': {
    request: 'GET /api/v1/reviews/manga/661f11e1d13e0af0b0f872a1?page=1',
    response: {
      success: true,
      data: [{ title: 'Review lengkap', rating: 9, user: 'reviewerA' }],
    },
  },
  '/api/v1/tags': {
    request: 'GET /api/v1/tags?page=1&limit=50',
    response: {
      success: true,
      data: ['action', 'romance', 'fantasy'],
    },
  },
  '/health': {
    request: 'GET /health',
    response: {
      status: 'ok',
      version: 'v1',
      timestamp: '2026-04-07T05:00:00.000Z',
    },
  },
};

/* ══════════════════════════════════════════════════════════════
   DOM REFERENCES
   ══════════════════════════════════════════════════════════ */
const stateEls = {
  serverDot: document.getElementById('serverDot'),
  serverText: document.getElementById('serverText'),
  mongoDot: document.getElementById('mongoDot'),
  mongoText: document.getElementById('mongoText'),
  redisDot: document.getElementById('redisDot'),
  redisText: document.getElementById('redisText'),
  uptime: document.getElementById('uptimeValue'),
  mem: document.getElementById('memValue'),
  dbBanner: document.getElementById('dbOfflineBanner'),
  statRPM: document.getElementById('statRPM'),
  statP95: document.getElementById('statP95'),
  statErrorRate: document.getElementById('statErrorRate'),
  statHealth: document.getElementById('statHealth'),
};

const activityBody = document.getElementById('activityBody');
const activityEmpty = document.getElementById('activityEmpty');
const playgroundForm = document.getElementById('playgroundForm');
const responseBox = document.getElementById('responseBox');
const responseMeta = document.getElementById('responseMeta');
const carouselRoot = document.getElementById('demoCarousel');
const carouselTrack = document.getElementById('demoTrack');
const carouselDots = document.getElementById('demoDots');
const searchInput = document.getElementById('searchInput');
const presetCategory = document.getElementById('presetCategory');
const presetEndpoint = document.getElementById('presetEndpoint');
const copyPlaygroundResponse = document.getElementById('copyPlaygroundResponse');
const headerDot = document.getElementById('headerDot');
const themeToggle = document.getElementById('themeToggle');
const spotlightTrack = document.getElementById('spotlightTrack');
const hudLatency = document.getElementById('hudLatency');
const hudRequests = document.getElementById('hudRequests');
const hudSecurity = document.getElementById('hudSecurity');
const topNetworkCards = document.getElementById('topNetworkCards');
const distributionTableBody = document.getElementById('distributionTableBody');
const distributionEmpty = document.getElementById('distributionEmpty');
const recentNewlyAdded = document.getElementById('recentNewlyAdded');
const recentRecentlyRated = document.getElementById('recentRecentlyRated');
const recentJustUpdated = document.getElementById('recentJustUpdated');
const insightsNetworkCarousel = document.getElementById('insightsNetworkCarousel');
const insightsTypeCarousel = document.getElementById('insightsTypeCarousel');
const overviewBreakdownMeta = document.getElementById('overviewBreakdownMeta');
const overviewSourceBreakdown = document.getElementById('overviewSourceBreakdown');
const animationSourceSelect = document.getElementById('animationSourceSelect');
const animationSourceMeta = document.getElementById('animationSourceMeta');
const animationSourceItemsBody = document.getElementById('animationSourceItemsBody');
const mangaTypeSelect = document.getElementById('mangaTypeSelect');
const mangaTitleSearch = document.getElementById('mangaTitleSearch');
const mangaApplyBtn = document.getElementById('mangaApplyBtn');
const mangaResetBtn = document.getElementById('mangaResetBtn');
const mangaPrevBtn = document.getElementById('mangaPrevBtn');
const mangaNextBtn = document.getElementById('mangaNextBtn');
const mangaExplorerBody = document.getElementById('mangaExplorerBody');
const mangaExplorerMeta = document.getElementById('mangaExplorerMeta');

let dashboardData = defaultDashboardData;
let carouselSlides = [];
let carouselIndex = 0;
let carouselTimer = null;
let latestStatsSnapshot = null;
const insightsFilterState = {
  network: '',
  type: '',
};
let insightsRequestVersion = 0;
let selectedAnimationSource = '';
const mangaExplorerState = {
  type: 'manga',
  q: '',
  page: 1,
  limit: 20,
  totalPages: 1,
};

/* ══════════════════════════════════════════════════════════════
   SIDEBAR TOGGLE + NAV HIGHLIGHT
   ══════════════════════════════════════════════════════════ */
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const hamburgerBtn = document.getElementById('hamburgerBtn');

const openSidebar = () => {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('show');
  document.body.style.overflow = 'hidden';
};
const closeSidebar = () => {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
  document.body.style.overflow = '';
};

if (hamburgerBtn) {
  hamburgerBtn.addEventListener('click', () => {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
}
if (sidebarOverlay) {
  sidebarOverlay.addEventListener('click', closeSidebar);
}

// Section Management Logic
const adminSections = ['section-intelligence', 'section-operations', 'section-registry', 'section-sources', 'section-users', 'section-curation'];

const switchSection = (targetId) => {
  const isTargetAdmin = adminSections.includes(targetId);
  
  // Robust check: token must exist and not be 'null'/'undefined' strings
  const hasValidToken = adminToken && adminToken !== 'null' && adminToken !== 'undefined';

  if (isTargetAdmin && !hasValidToken) {
    console.warn(`[SECURITY] Blocked unauthorized access to ${targetId}`);
    showToast('Admin access required. Please sign in.', 'warn');
    showLoginModal();
    
    // Redirect to safe section
    window.location.hash = 'section-overview';
    return;
  }

  // Show/Hide sections
  document.querySelectorAll('.content-section').forEach((sec) => {
    if (sec.id === targetId) {
      sec.style.display = 'block';
      sec.classList.add('active');
    } else {
      sec.style.display = 'none';
      sec.classList.remove('active');
    }
  });

  // Update nav active state
  document.querySelectorAll('.side-link').forEach((n) => n.classList.remove('active'));
  const activeNav = document.querySelector(`.side-link[data-section="${targetId}"]`);
  if (activeNav) activeNav.classList.add('active');

  if (targetId === 'section-operations') loadOperationsData();
  if (targetId === 'section-intelligence') loadIntelligenceData();
  if (targetId === 'section-registry') renderRegistry();
  if (targetId === 'section-sources') fetchSources();
  if (targetId === 'section-users') fetchUsers();
  if (targetId === 'section-curation') fetchCuration();
  if (targetId === 'section-discovery') initDiscovery();
};


// Handle initial hash
const initNavFromHash = () => {
  const hash = window.location.hash.replace('#', '');
  if (hash && document.getElementById(hash)) {
    switchSection(hash);
  } else {
    switchSection('section-overview');
  }
};

// Consolidated Dropdown & Navigation Logic
const initNavigationEvents = () => {
  console.log("[NAV] Initializing UI Interactions...");

  // 1. Dropdown Toggle (Stable Click)
  document.querySelectorAll('.nav-group-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const parent = toggle.closest('.nav-group');
      const wasActive = parent.classList.contains('active');
      
      // Close others
      document.querySelectorAll('.nav-group').forEach(g => g.classList.remove('active'));
      
      // Toggle current
      if (!wasActive) parent.classList.add('active');
    });
  });

  // 1.5 Sidebar Links (Main Navigation)
  document.querySelectorAll('.side-link[data-section]').forEach((navItem) => {
    navItem.addEventListener('click', (e) => {
      const targetId = navItem.getAttribute('data-section');
      if (targetId) {
        e.preventDefault();
        switchSection(targetId);
        window.location.hash = targetId;
        
        // Mobile Sidebar: auto-close if open
        if (typeof closeSidebar === 'function') closeSidebar();
      }
    });
  });

  // 2. All Dropdown Links (Sub-links)
  document.querySelectorAll('.nav-link-sub').forEach(link => {
     link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
           e.preventDefault();
           const targetId = href.substring(1);
           switchSection(targetId);
           window.location.hash = targetId;
           
           // Close dropdown manually for better UX
           document.querySelectorAll('.nav-group').forEach(g => g.classList.remove('active'));
        }
     });
  });

  // 3. Emergency/Global Nav Links (by ID)
  const emergencyMap = {
    'nav-manga-btn': 'section-manga',
    'nav-anime-btn': 'section-anime',
    'nav-donghua-btn': 'section-donghua',
    'nav-home-btn': 'section-overview'
  };
  
  Object.keys(emergencyMap).forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) btn.addEventListener('click', (e) => {
      e.preventDefault();
      switchSection(emergencyMap[btnId]);
      window.location.hash = emergencyMap[btnId];
    });
  });

  // 4. Close on outside click
  document.addEventListener('click', () => {
    document.querySelectorAll('.nav-group').forEach(g => g.classList.remove('active'));
  });

  // Initialize from Hash
  initNavFromHash();
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initNavigationEvents);
} else {
  initNavigationEvents();
}
window.addEventListener('hashchange', initNavFromHash);

// Intersection Observer for active nav highlighting
const navObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
        const activeNav = document.querySelector(`.nav-item[data-nav="${id}"]`);
        if (activeNav) activeNav.classList.add('active');
      }
    });
  },
  { rootMargin: '-100px 0px -60% 0px', threshold: 0 }
);

document.querySelectorAll('section[id^="section-"]').forEach((section) => {
  navObserver.observe(section);
});

/* ══════════════════════════════════════════════════════════════
   RELATIVE TIME
   ══════════════════════════════════════════════════════════ */
const relativeTime = (isoString) => {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 5) return 'baru saja';
  if (diffSec < 60) return `${diffSec}s lalu`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h lalu`;
  return new Date(isoString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

/* ══════════════════════════════════════════════════════════════
   UTILITIES
   ══════════════════════════════════════════════════════════ */
const copyText = async (text, buttonEl) => {
  const prev = buttonEl.textContent;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for non-secure contexts (HTTP IP addresses)
      const textArea = document.createElement("textarea");
      textArea.value = text;
      // Move textarea out of the viewport
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      textArea.remove();
      if (!successful) throw new Error('execCommand failed');
    }
    
    buttonEl.textContent = 'Copied';
    setTimeout(() => {
      buttonEl.textContent = prev;
    }, 1000);
  } catch (err) {
    console.error('Copy failed', err);
    buttonEl.textContent = 'Copy Failed';
    setTimeout(() => {
      buttonEl.textContent = prev;
    }, 1000);
  }
};

const createCopyButton = (textToCopy) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'copy-btn';
  button.textContent = 'Copy';
  button.addEventListener('click', () => {
    copyText(textToCopy, button);
  });
  return button;
};

const sanitizeImageUrl = (url) => {
  try {
    const parsed = new URL(url, window.location.origin);
    if (!['https:', 'http:'].includes(parsed.protocol)) return null;
    if (/["'<>\n\r]/.test(parsed.href)) return null;
    return parsed.href;
  } catch {
    return null;
  }
};

/* ══════════════════════════════════════════════════════════════
   STATUS / HEALTH
   ══════════════════════════════════════════════════════════ */
const formatStatusClass = (connected, state) => {
  if (connected) return 'ok';
  if (state === 'connecting' || state === 'initializing') return 'warn';
  return 'down';
};

const setHealthItem = (dotEl, textEl, label, connected, state) => {
  const statusClass = formatStatusClass(connected, state);
  dotEl.className = `dot ${statusClass} ${connected ? 'connected' : ''}`;
  textEl.textContent = label + ': ' + (connected ? 'Operational' : state);
};

const formatUptime = (seconds) => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
};

const renderStatus = (payload, auditPayload = null) => {
  const info = payload?.data;
  if (!info) return;

  setHealthItem(stateEls.serverDot, stateEls.serverText, 'Server', true, 'running');
  setHealthItem(stateEls.mongoDot, stateEls.mongoText, 'MongoDB', info.database.connected, info.database.state);
  setHealthItem(stateEls.redisDot, stateEls.redisText, 'Redis', info.cache.connected, info.cache.state);

  stateEls.uptime.textContent = formatUptime(info.server.uptimeSeconds);
  stateEls.mem.textContent = `${info.system.memory.usedMb} MB / ${info.system.memory.totalMb} MB`;

  const qualityEl = document.getElementById('qualityValue');
  if (qualityEl) {
    if (auditPayload?.success) {
      qualityEl.textContent = `${auditPayload.data.qualityPercentage}%`;
      qualityEl.style.color = auditPayload.data.qualityPercentage > 90 ? 'var(--green)' : 'var(--yellow)';
    } else {
      qualityEl.textContent = '🔒';
      qualityEl.title = 'Login required for quality audit';
    }
  }

  // Header dot status
  if (headerDot) {
    const allOk = info.database.connected;
    headerDot.className = `dot ${allOk ? 'connected' : 'warn'}`;
    headerDot.title = allOk ? 'All systems operational' : 'Some services degraded';
  }

  const dbOnline = info.database.connected;
  stateEls.dbBanner.classList.toggle('hidden', dbOnline);
  
  // Update Telemetry HUD
  if (hudRequests) hudRequests.textContent = info.server.totalRequestsFormatted || info.server.uptimeSeconds % 1000;
  if (hudSecurity) hudSecurity.textContent = 'Active';

  // Update Golden Signals
  const m = info.metrics;
  if (m) {
    if (stateEls.statRPM) stateEls.statRPM.textContent = m.traffic.toFixed(1);
    if (stateEls.statP95) {
      stateEls.statP95.textContent = `${m.latency.p95}ms`;
      stateEls.statP95.style.color = m.latency.p95 < 200 ? 'var(--green)' : m.latency.p95 < 500 ? 'var(--yellow)' : 'var(--red)';
    }
    if (stateEls.statErrorRate) {
      stateEls.statErrorRate.textContent = `${m.errorRate}%`;
      stateEls.statErrorRate.style.color = m.errorRate < 1 ? 'var(--green)' : m.errorRate < 5 ? 'var(--yellow)' : 'var(--red)';
    }
    if (stateEls.statHealth) {
      const health = Math.max(0, 100 - m.errorRate);
      stateEls.statHealth.textContent = `${health.toFixed(1)}%`;
      stateEls.statHealth.style.color = health > 99 ? 'var(--green)' : health > 95 ? 'var(--yellow)' : 'var(--red)';
    }
  }
};

const loadStatus = async () => {
  try {
    const start = Date.now();
    const res = await fetch('/dashboard/status');
    const data = await res.json();
    const latency = Date.now() - start;
    
    if (hudLatency) {
      hudLatency.textContent = `${latency}ms`;
      hudLatency.style.color = latency < 100 ? 'var(--green)' : latency < 300 ? 'var(--yellow)' : 'var(--red)';
    }

    let auditData = null;
    if (adminToken) {
       try {
         auditData = await adminFetch('/admin/audit-stats');
       } catch (e) { /* ignore */ }
    }
    
    renderStatus(data, auditData);
    
    // Fetch Trending for Spotlight
    try {
      const trendRes = await fetch(`${API_BASE}/comic/trending?limit=5`);
      const trendData = await trendRes.json();
      if (trendData.success) renderSpotlight(trendData.data);
    } catch (e) { /* fallback spotlight already exists in index.html */ }
  } catch {
    setHealthItem(stateEls.serverDot, stateEls.serverText, 'Server', false, 'unreachable');
    setHealthItem(stateEls.mongoDot, stateEls.mongoText, 'MongoDB', false, 'unreachable');
    setHealthItem(stateEls.redisDot, stateEls.redisText, 'Redis', false, 'unreachable');
    if (headerDot) {
      headerDot.className = 'dot down';
      headerDot.title = 'Connection Lost';
    }
  }
};

/* ══════════════════════════════════════════════════════════════
   ACTIVITY LOG
   ══════════════════════════════════════════════════════════ */
const statusBadgeClass = (statusCode) => {
  if (statusCode >= 500) return 'err';
  if (statusCode >= 400) return 'warn';
  return 'ok';
};

const renderActivity = (items) => {
  if (!items.length) {
    activityEmpty.classList.remove('hidden');
    activityBody.innerHTML = '';
    return;
  }
  activityEmpty.classList.add('hidden');
  activityBody.innerHTML = '';

  items.forEach((item) => {
    const row = document.createElement('tr');

    const timeCell = document.createElement('td');
    timeCell.textContent = relativeTime(item.timestamp);
    timeCell.title = new Date(item.timestamp).toLocaleString('id-ID');
    timeCell.style.whiteSpace = 'nowrap';

    const requestCell = document.createElement('td');
    const methodChip = document.createElement('span');
    methodChip.className = 'method-chip';
    methodChip.textContent = item.method;
    requestCell.appendChild(methodChip);
    requestCell.appendChild(document.createTextNode(` ${item.path}`));

    const statusCell = document.createElement('td');
    const statusChip = document.createElement('span');
    statusChip.className = `status-chip ${statusBadgeClass(item.statusCode)}`;
    statusChip.textContent = String(item.statusCode);
    statusCell.appendChild(statusChip);

    const latencyCell = document.createElement('td');
    latencyCell.textContent = `${item.durationMs} ms`;
    latencyCell.style.whiteSpace = 'nowrap';

    row.appendChild(timeCell);
    row.appendChild(requestCell);
    row.appendChild(statusCell);
    row.appendChild(latencyCell);

    activityBody.appendChild(row);
  });
};

const loadActivity = async () => {
  try {
    const res = await fetch('/dashboard/activity?limit=18');
    const data = await res.json();
    renderActivity(data?.data?.items || []);
  } catch {
    renderActivity([]);
  }
};

/* ══════════════════════════════════════════════════════════════
   DATA INSIGHTS (LIVE API)
   ══════════════════════════════════════════════════════════ */
const formatTypeSummary = (byType = {}) =>
  Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `${type}:${count}`)
    .join(' | ');

const renderTopNetworkCards = (rows = []) => {
  if (!topNetworkCards) return;
  topNetworkCards.innerHTML = '';

  if (!rows.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'Belum ada data network.';
    topNetworkCards.appendChild(empty);
    return;
  }

  rows.slice(0, 8).forEach((row) => {
    const card = document.createElement('div');
    card.className = 'network-mini-card';

    const label = document.createElement('p');
    label.textContent = row.network || 'unknown';

    const total = document.createElement('strong');
    total.textContent = String(row.total || 0);

    const types = document.createElement('div');
    types.className = 'network-mini-types';
    types.textContent = formatTypeSummary(row.byType || {});

    card.appendChild(label);
    card.appendChild(total);
    card.appendChild(types);
    topNetworkCards.appendChild(card);
  });
};

const renderDistributionTable = (rows = []) => {
  if (!distributionTableBody || !distributionEmpty) return;
  distributionTableBody.innerHTML = '';
  distributionEmpty.classList.toggle('hidden', rows.length > 0);

  rows.forEach((row) => {
    const tr = document.createElement('tr');

    const networkTd = document.createElement('td');
    networkTd.textContent = row.network || 'unknown';

    const totalTd = document.createElement('td');
    totalTd.textContent = String(row.total || 0);

    const typesTd = document.createElement('td');
    typesTd.textContent = formatTypeSummary(row.byType || {});

    const confidenceTd = document.createElement('td');
    const avgConfidence = typeof row.avgConfidence === 'number' ? row.avgConfidence : null;
    confidenceTd.textContent = avgConfidence == null ? 'N/A' : `${Math.round(avgConfidence * 100)}%`;

    const ruleTd = document.createElement('td');
    ruleTd.textContent = row.topRule || 'unknown';

    tr.appendChild(networkTd);
    tr.appendChild(totalTd);
    tr.appendChild(typesTd);
    tr.appendChild(confidenceTd);
    tr.appendChild(ruleTd);
    distributionTableBody.appendChild(tr);
  });
};

const renderUltimateEmptyState = (container, icon, title, text) => {
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state-ultimate">
      <div class="empty-state-icon">${icon}</div>
      <div class="empty-state-text">
        <strong>${title}</strong><br/>
        <span>${text}</span>
      </div>
    </div>
  `;
};

const populateInsightsFilterOptions = (options = {}) => {
  if (!insightsNetworkCarousel || !insightsTypeCarousel) return;

  const networks = Array.isArray(options.availableNetworks) ? options.availableNetworks : [];
  const types = Array.isArray(options.availableTypes) ? options.availableTypes : [];

  const renderBubbles = (container, list, emptyLabel, currentSelection, onSelect) => {
    container.innerHTML = '';
    
    // "All" Bubble
    const allBtn = document.createElement('div');
    allBtn.className = `filter-bubble ${!currentSelection ? 'active' : ''}`;
    allBtn.textContent = emptyLabel;
    allBtn.addEventListener('click', () => onSelect(''));
    container.appendChild(allBtn);

    list.forEach(val => {
      const btn = document.createElement('div');
      btn.className = `filter-bubble ${currentSelection === val ? 'active' : ''}`;
      btn.textContent = val;
      btn.addEventListener('click', () => onSelect(val));
      container.appendChild(btn);
    });
  };

  renderBubbles(insightsNetworkCarousel, networks, 'All Networks', insightsFilterState.network, (val) => {
    insightsFilterState.network = val;
    loadInsights(); 
  });

  renderBubbles(insightsTypeCarousel, types, 'All Content', insightsFilterState.type, (val) => {
    insightsFilterState.type = val;
    loadInsights();
  });
};

const renderRecentList = (targetEl, rows = [], type = 'updated') => {
  if (!targetEl) return;
  targetEl.innerHTML = '';

  if (!rows.length) {
    const li = document.createElement('li');
    li.textContent = 'Belum ada data';
    targetEl.appendChild(li);
    return;
  }

  rows.slice(0, 6).forEach((row) => {
    const li = document.createElement('li');
    const title = document.createElement('div');
    title.textContent = row.title || row.slug || 'Untitled';

    const meta = document.createElement('div');
    meta.className = 'recent-meta';
    if (type === 'rated') {
      meta.textContent = `rating: ${row.rating || 0}`;
    } else {
      meta.textContent = relativeTime(row.updatedAt || row.createdAt || new Date().toISOString());
    }

    li.appendChild(title);
    li.appendChild(meta);
    targetEl.appendChild(li);
  });
};

const loadDataInsights = async () => {
  const requestVersion = ++insightsRequestVersion;
  const params = new URLSearchParams();
  if (insightsFilterState.network) params.set('network', insightsFilterState.network);
  if (insightsFilterState.type) params.set('type', insightsFilterState.type);

  const distributionUrl = params.toString()
    ? `${API_BASE}/comic/stats/distribution?${params.toString()}`
    : `${API_BASE}/comic/stats/distribution`;

  const [distResult, recentResult] = await Promise.allSettled([
    fetch(distributionUrl),
    fetch(`${API_BASE}/comic/realtime?limit=12`),
  ]);

  if (requestVersion !== insightsRequestVersion) return;

  if (distResult.status === 'fulfilled' && distResult.value.ok) {
    try {
      const distJson = await distResult.value.json();
      if (requestVersion !== insightsRequestVersion) return;
      const byNetwork = distJson?.data?.byNetwork || [];
      populateInsightsFilterOptions(distJson?.data?.options || {});
      renderTopNetworkCards(byNetwork);
      renderDistributionTable(byNetwork);
    } catch {
      renderTopNetworkCards([]);
      renderDistributionTable([]);
    }
  } else {
    renderTopNetworkCards([]);
    renderDistributionTable([]);
  }

  if (recentResult.status === 'fulfilled' && recentResult.value.ok) {
    try {
      const recentJson = await recentResult.value.json();
      if (requestVersion !== insightsRequestVersion) return;
      const data = recentJson?.data || {};
      renderRecentList(recentNewlyAdded, data.newlyAdded || [], 'new');
      renderRecentList(recentRecentlyRated, data.recentlyRated || [], 'rated');
      renderRecentList(recentJustUpdated, data.justUpdated || [], 'updated');
    } catch {
      renderRecentList(recentNewlyAdded, []);
      renderRecentList(recentRecentlyRated, []);
      renderRecentList(recentJustUpdated, []);
    }
  } else {
    renderRecentList(recentNewlyAdded, []);
    renderRecentList(recentRecentlyRated, []);
    renderRecentList(recentJustUpdated, []);
  }
};

const applyInsightsFilters = async () => {
  insightsFilterState.network = insightsNetworkFilter?.value || '';
  insightsFilterState.type = insightsTypeFilter?.value || '';
  await loadDataInsights();
};

const resetInsightsFilters = async () => {
  insightsFilterState.network = '';
  insightsFilterState.type = '';
  if (insightsNetworkFilter) insightsNetworkFilter.value = '';
  if (insightsTypeFilter) insightsTypeFilter.value = '';
  await loadDataInsights();
};

if (animationSourceSelect) {
  animationSourceSelect.addEventListener('change', async () => {
    selectedAnimationSource = animationSourceSelect.value || '';
    await loadAnimationSourceItems();
  });
}

if (mangaApplyBtn) {
  mangaApplyBtn.addEventListener('click', async () => {
    mangaExplorerState.type = mangaTypeSelect?.value || 'manga';
    mangaExplorerState.q = (mangaTitleSearch?.value || '').trim();
    mangaExplorerState.page = 1;
    await loadMangaExplorer();
  });
}

if (mangaResetBtn) {
  mangaResetBtn.addEventListener('click', async () => {
    mangaExplorerState.type = 'manga';
    mangaExplorerState.q = '';
    mangaExplorerState.page = 1;
    if (mangaTypeSelect) mangaTypeSelect.value = 'manga';
    if (mangaTitleSearch) mangaTitleSearch.value = '';
    await loadMangaExplorer();
  });
}

if (mangaPrevBtn) {
  mangaPrevBtn.addEventListener('click', async () => {
    if (mangaExplorerState.page <= 1) return;
    mangaExplorerState.page -= 1;
    await loadMangaExplorer();
  });
}

if (mangaNextBtn) {
  mangaNextBtn.addEventListener('click', async () => {
    if (mangaExplorerState.page >= mangaExplorerState.totalPages) return;
    mangaExplorerState.page += 1;
    await loadMangaExplorer();
  });
}

if (mangaTitleSearch) {
  mangaTitleSearch.addEventListener('keydown', async (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    mangaExplorerState.type = mangaTypeSelect?.value || 'manga';
    mangaExplorerState.q = (mangaTitleSearch.value || '').trim();
    mangaExplorerState.page = 1;
    await loadMangaExplorer();
  });
}

/* ══════════════════════════════════════════════════════════════
   EXAMPLE BLOCKS
   ══════════════════════════════════════════════════════════ */
const inferExample = (method, path) => {
  const direct = endpointExamples[path];
  if (direct) return direct;

  const noQuery = path.split('?')[0];
  if (endpointExamples[noQuery]) return endpointExamples[noQuery];

  const normalized = noQuery.replace(/\/\d+/g, '/:id').replace(/[a-f0-9]{24}/gi, '/:id');

  if (endpointExamples[normalized]) return endpointExamples[normalized];

  return {
    request: `${method} ${path}`,
    response: {
      success: true,
      data: {
        message: 'Sample response',
        endpoint: path,
      },
    },
  };
};

const createExampleBlock = (label, content) => {
  const wrap = document.createElement('div');

  const header = document.createElement('div');
  header.className = 'example-block-head';

  const labelEl = document.createElement('p');
  labelEl.className = 'example-label';
  labelEl.textContent = label;

  const copyBtn = createCopyButton(content);

  header.appendChild(labelEl);
  header.appendChild(copyBtn);

  const pre = document.createElement('pre');
  pre.textContent = content;

  wrap.appendChild(header);
  wrap.appendChild(pre);

  return wrap;
};

const attachExamplesToCards = () => {
  document.querySelectorAll('.card').forEach((card) => {
    const endpointEl = card.querySelector('.endpoint');
    if (!endpointEl) return;

    const method = endpointEl.querySelector('.method')?.textContent?.trim() || 'GET';
    const rawPath = endpointEl.textContent.replace(method, '').trim();
    if (!rawPath.startsWith('/')) return;

    const ex = inferExample(method, rawPath);

    const details = document.createElement('details');
    details.className = 'example-box';

    const summary = document.createElement('summary');
    summary.textContent = 'Example Request/Response';

    const grid = document.createElement('div');
    grid.className = 'example-grid';

    const requestText = ex.request;
    const responseText = JSON.stringify(ex.response, null, 2);

    grid.appendChild(createExampleBlock('Request', requestText));
    grid.appendChild(createExampleBlock('Response', responseText));

    details.appendChild(summary);
    details.appendChild(grid);
    card.appendChild(details);
  });
};

const attachEndpointCopyButtons = () => {
  document.querySelectorAll('.card').forEach((card) => {
    const endpointEl = card.querySelector('.endpoint');
    if (!endpointEl) return;
    if (endpointEl.querySelector('.endpoint-copy-btn')) return;

    const method = endpointEl.querySelector('.method')?.textContent?.trim() || 'GET';
    const rawPath = endpointEl.textContent.replace(method, '').trim();
    if (!rawPath.startsWith('/')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'endpoint-wrapper';

    const newEndpoint = endpointEl.cloneNode(true);
    endpointEl.replaceWith(wrapper);

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'copy-btn endpoint-copy-btn';
    copyBtn.textContent = 'Copy URL';
    copyBtn.title = `Copy: ${method} ${window.location.origin}${rawPath}`;

    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const fullUrl = `${method} ${window.location.origin}${rawPath}`;
      copyText(fullUrl, copyBtn);
    });

    wrapper.appendChild(newEndpoint);
    wrapper.appendChild(copyBtn);
  });
};

/* ══════════════════════════════════════════════════════════════
   ULTIMATE SPOTLIGHT ENGINE
   ══════════════════════════════════════════════════════════ */
let spotlightIndex = 0;
let spotlightTimer = null;

const renderSpotlight = (items = []) => {
  if (!spotlightTrack) return;
  
  // Prepend a premium static slide
  const staticSlide = {
    title: 'Audira Gateway Protocol',
    cover: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1920&q=80',
    type: 'Genesis Core Alpha',
    synopsis: 'Next-generation infrastructure for content orchestration. Processing millions of data pips across global scraper nodes with neural precision.',
    rating: '9.9',
    views: 'CORE'
  };
  
  const allItems = [staticSlide, ...items];

  spotlightTrack.innerHTML = allItems.map((item, idx) => `
    <div class="spotlight-slide ${idx === 0 ? 'active' : ''}">
      <div class="spotlight-bg" style="background-image: url('${item.cover || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1920&q=80'}')"></div>
      <div class="spotlight-overlay"></div>
      <div class="spotlight-content">
        <div class="spotlight-meta-info">
          <span class="spotlight-badge">${item.type?.toUpperCase() || 'TRENDING'}</span>
          <span class="spotlight-status-pip pulse">LIVE DATA</span>
        </div>
        <h2 class="spotlight-title">${item.title} <span class="text-accent">Node</span></h2>
        <p class="spotlight-desc">${item.synopsis ? item.synopsis.substring(0, 160) + (item.synopsis.length > 160 ? '...' : '') : 'Premium content detected on the intelligence registry. Syncing latest metadata pips.'}</p>
        <div class="hero-actions">
          <button class="btn-hero-prime" data-action="inspect-node">INSPECT NODE</button>
          <div class="hero-stats-chips">
            <div class="hero-chip"><span>RATING</span> <strong>${item.rating || '9.2'}</strong></div>
            <div class="hero-chip"><span>METRIC</span> <strong>${item.views || '1.2k'}</strong></div>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  // ── CSP Compliance (Event Delegation for Spotlight) ──
  if (spotlightTrack) {
    spotlightTrack.onclick = (e) => {
      const btn = e.target.closest('[data-action="inspect-node"]');
      if (btn) {
        window.location.hash = '#section-discovery';
      }
    };
  }

  startSpotlight(items.length);
};

const startSpotlight = (count) => {
  if (spotlightTimer) clearInterval(spotlightTimer);
  spotlightTimer = setInterval(() => {
    spotlightIndex = (spotlightIndex + 1) % count;
    spotlightTrack.style.transform = `translateX(-${spotlightIndex * 100}%)`;
    
    document.querySelectorAll('.spotlight-slide').forEach((s, idx) => {
      s.classList.toggle('active', idx === spotlightIndex);
    });
  }, 6000);
};

/* ══════════════════════════════════════════════════════════════
   ULTIMATE TILT ENGINE
   ══════════════════════════════════════════════════════════ */
const initTiltEffect = () => {
  const cards = document.querySelectorAll('.card, .glass-card, .stat-box');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const xc = rect.width / 2;
      const yc = rect.height / 2;
      
      const dx = x - xc;
      const dy = y - yc;
      
      card.style.setProperty('--x', `${x}px`);
      card.style.setProperty('--y', `${y}px`);
      card.style.transform = `perspective(1000px) rotateX(${-dy / 20}deg) rotateY(${dx / 20}deg) translateY(-5px)`;
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
};

const renderCarousel = () => {
  if (!carouselSlides.length) {
    carouselTrack.innerHTML = '';
    carouselDots.innerHTML = '';
    return;
  }

  carouselTrack.innerHTML = '';
  carouselSlides.forEach((slide) => {
    const article = document.createElement('article');
    article.className = 'slide';

    const safeImage = sanitizeImageUrl(slide.image || '');
    if (safeImage) {
      article.style.backgroundImage = `url("${safeImage}")`;
    }

    const overlay = document.createElement('div');
    overlay.className = 'overlay';

    const kicker = document.createElement('p');
    kicker.className = 'slide-kicker';
    kicker.textContent = 'Demo Offline Mode';

    const title = document.createElement('h3');
    title.textContent = slide.title || 'Untitled Slide';

    const subtitle = document.createElement('p');
    subtitle.textContent = slide.subtitle || '-';

    const metric = document.createElement('span');
    metric.textContent = slide.metric || '-';

    overlay.appendChild(kicker);
    overlay.appendChild(title);
    overlay.appendChild(subtitle);
    overlay.appendChild(metric);
    article.appendChild(overlay);
    carouselTrack.appendChild(article);
  });

  carouselDots.innerHTML = carouselSlides
    .map((_, idx) => `<button type="button" data-idx="${idx}" class="dot ${idx === 0 ? 'active' : ''}"></button>`)
    .join('');

  carouselDots.querySelectorAll('.dot').forEach((dot) => {
    dot.addEventListener('click', () => {
      carouselIndex = Number(dot.dataset.idx);
      updateCarousel();
    });
  });

  updateCarousel();
};

const buildCarouselSlides = (categories, categoryKey = 'all') => {
  if (!Array.isArray(categories)) return [];
  return categories
    .filter((category) => categoryKey === 'all' || category.key === categoryKey)
    .flatMap((category) => {
    if (!Array.isArray(category.slides)) return [];
    return category.slides.map((slide) => ({
      ...slide,
      categoryKey: category.key,
      subtitle: `${category.label} · ${slide.subtitle}`,
    }));
  });
};

const applyCarouselFilter = () => {
  const selected = carouselCategory.value || 'all';
  carouselSlides = buildCarouselSlides(dashboardData.categories, selected);
  carouselIndex = 0;
  renderCarousel();
  startCarousel();
};

const initCarouselFilter = () => {
  if (!carouselCategory) return;

  carouselCategory.innerHTML = '<option value="all">Semua Kategori</option>';
  dashboardData.categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category.key;
    option.textContent = category.label;
    carouselCategory.appendChild(option);
  });

  carouselCategory.addEventListener('change', applyCarouselFilter);
};

/* ══════════════════════════════════════════════════════════════
   TESTER PRESETS
   ══════════════════════════════════════════════════════════ */
const updatePresetEndpointOptions = () => {
  const selectedCategory = presetCategory.value;
  const category = dashboardData.testerPresets.find((item) => item.key === selectedCategory);

  presetEndpoint.innerHTML = '<option value="">Preset Endpoint...</option>';

  if (!category) {
    presetEndpoint.disabled = true;
    return;
  }

  category.items.forEach((item, idx) => {
    const option = document.createElement('option');
    option.value = String(idx);
    option.textContent = `${item.name} (${item.method})`;
    presetEndpoint.appendChild(option);
  });

  presetEndpoint.disabled = false;
};

const applyPresetSelection = () => {
  const category = dashboardData.testerPresets.find((item) => item.key === presetCategory.value);
  if (!category) return;

  const selected = category.items[Number(presetEndpoint.value)];
  if (!selected) return;

  document.getElementById('playMethod').value = selected.method || 'GET';
  document.getElementById('playPath').value = selected.path || '/';

  const bodyEl = document.getElementById('playBody');
  if (selected.body) {
    bodyEl.value = JSON.stringify(selected.body, null, 2);
  } else {
    bodyEl.value = '';
  }
};

const initTesterPresets = () => {
  presetCategory.innerHTML = '<option value="">Preset Category...</option>';

  dashboardData.testerPresets.forEach((category) => {
    const option = document.createElement('option');
    option.value = category.key;
    option.textContent = category.label;
    presetCategory.appendChild(option);
  });

  presetCategory.addEventListener('change', updatePresetEndpointOptions);
  presetEndpoint.addEventListener('change', applyPresetSelection);
};

/* ══════════════════════════════════════════════════════════════
   SEARCH FILTER
   ══════════════════════════════════════════════════════════ */
const filterCards = () => {
  const q = searchInput.value.toLowerCase().trim();
  document.querySelectorAll('.card').forEach((card) => {
    const text = (card.innerText + ' ' + (card.dataset.tags || '')).toLowerCase();
    card.classList.toggle('hidden', q.length > 0 && !text.includes(q));
  });

  document.querySelectorAll('.section-title').forEach((title) => {
    let next = title.nextElementSibling;
    while (next && !next.classList.contains('grid')) next = next.nextElementSibling;
    if (!next) return;
    const visible = [...next.querySelectorAll('.card')].some((card) => !card.classList.contains('hidden'));
    title.style.display = visible || q.length === 0 ? '' : 'none';
  });
};

/* ══════════════════════════════════════════════════════════════
   PLAYGROUND
   ══════════════════════════════════════════════════════════ */
const runPlayground = async (event) => {
  event.preventDefault();
  responseMeta.textContent = 'Loading...';
  responseBox.textContent = '';

  const method = document.getElementById('playMethod').value;
  const path = document.getElementById('playPath').value.trim();
  const token = document.getElementById('playToken').value.trim();
  const bodyText = document.getElementById('playBody').value.trim();

  const headers = {
    Accept: 'application/json',
  };

  const options = { method, headers };

  if (bodyText && method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    try {
      options.body = JSON.stringify(JSON.parse(bodyText));
    } catch {
      responseMeta.textContent = 'Invalid JSON body';
      responseBox.textContent = bodyText;
      return;
    }
  }

  let url = path;
  if (!url.startsWith('http')) {
    if (!url.startsWith('/')) url = `/${url}`;
    if (!url.startsWith('/api/')) {
      url = `${API_BASE}${url}`;
    }
  }

  const resolvedUrl = new URL(url, window.location.origin);
  const isSameOrigin = resolvedUrl.origin === window.location.origin;

  if (!isSameOrigin) {
    responseMeta.textContent = 'Blocked: external origin is not allowed in this playground';
    responseBox.textContent = resolvedUrl.href;
    return;
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const startedAt = performance.now();
  try {
    const res = await fetch(resolvedUrl.href, options);
    const elapsed = Math.round((performance.now() - startedAt) * 100) / 100;
    const text = await res.text();
    let pretty = text;
    try {
      pretty = JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      // Keep raw text if not JSON
    }
    responseMeta.textContent = `${res.status} ${res.statusText} · ${elapsed} ms`;
    responseBox.textContent = pretty;
    const ts = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const okState = { ok: res.ok, ts, count: (getQlStatus(path)?.count || 0) + 1 };
    if (!res.ok) okState.msg = `${res.status} ${res.statusText}`;
    setQlStatus(path, okState);
  } catch (err) {
    responseMeta.textContent = 'Request failed';
    responseBox.textContent = err.message;
    const ts = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const errState = { ok: false, ts, count: (getQlStatus(path)?.count || 0) + 1, msg: err.message };
    setQlStatus(path, errState);
  }
};

/* ══════════════════════════════════════════════════════════════
   DATA LOADING
   ══════════════════════════════════════════════════════════ */
const loadDashboardData = async () => {
  try {
    const res = await fetch(FALLBACK_DATA_PATH);
    if (!res.ok) throw new Error('fallback JSON not available');
    const payload = await res.json();
    if (!Array.isArray(payload?.categories) || !Array.isArray(payload?.testerPresets)) {
      throw new Error('fallback JSON invalid shape');
    }
    dashboardData = payload;
  } catch {
    dashboardData = defaultDashboardData;
  }

  carouselSlides = buildCarouselSlides(dashboardData.categories, 'all');
};

const formatRating = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num) || num <= 0) return '-';
  return num.toFixed(2);
};

const renderAnimationSourceItems = (payload = {}) => {
  if (!animationSourceItemsBody) return;
  const items = Array.isArray(payload.data) ? payload.data : [];
  const meta = payload.meta || {};
  const pagination = payload.pagination || {};

  animationSourceItemsBody.innerHTML = '';

  if (animationSourceMeta) {
    const selected = meta.selectedSource || '-';
    const sourceSummary = Array.isArray(meta.sourceSummary) ? meta.sourceSummary : [];
    const summary = sourceSummary.find((row) => row.source === meta.selectedSource);
    const total = Number(summary?.total || pagination.total || items.length || 0);
    const avg = summary ? ` · avg rating ${formatRating(summary.avgRating)}` : '';
    animationSourceMeta.textContent = `${selected} · ${total} titles${avg}`;
  }

  if (!items.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.className = 'overview-breakdown-empty';
    td.textContent = 'Tidak ada judul untuk source ini.';
    tr.appendChild(td);
    animationSourceItemsBody.appendChild(tr);
    return;
  }

  items.forEach((item) => {
    const tr = document.createElement('tr');

    const titleTd = document.createElement('td');
    const titleWrap = document.createElement('div');
    titleWrap.className = 'source-items-title';
    const titleStrong = document.createElement('strong');
    titleStrong.textContent = item.title || '-';
    const subtitle = document.createElement('span');
    subtitle.textContent = `slug: ${item.slug || '-'} · src: ${item.source || item.network || item.sourceKey || '-'}`;
    titleWrap.appendChild(titleStrong);
    titleWrap.appendChild(subtitle);
    titleTd.appendChild(titleWrap);

    const typeTd = document.createElement('td');
    typeTd.textContent = item.type || '-';

    const ratingTd = document.createElement('td');
    ratingTd.textContent = formatRating(item.rating);

    const viewsTd = document.createElement('td');
    viewsTd.textContent = String(Number(item.views || 0));

    const statusTd = document.createElement('td');
    const statusSpan = document.createElement('span');
    statusSpan.className = 'status-pill';
    statusSpan.textContent = item.status || '-';
    statusTd.appendChild(statusSpan);

    tr.appendChild(titleTd);
    tr.appendChild(typeTd);
    tr.appendChild(ratingTd);
    tr.appendChild(viewsTd);
    tr.appendChild(statusTd);
    animationSourceItemsBody.appendChild(tr);
  });
};

const populateAnimationSourceSelect = (sourceList = []) => {
  if (!animationSourceSelect) return;

  const list = Array.isArray(sourceList) ? sourceList : [];
  const previous = selectedAnimationSource || animationSourceSelect.value || '';
  const fallback = list[0]?.source || '';
  const resolved = list.some((row) => row.source === previous) ? previous : fallback;

  animationSourceSelect.innerHTML = '';
  if (!list.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Tidak ada source animation';
    animationSourceSelect.appendChild(option);
    selectedAnimationSource = '';
    return;
  }

  list.forEach((row) => {
    const option = document.createElement('option');
    option.value = row.source;
    option.textContent = `${row.source} (${row.count}) · avg ${formatRating(row.avgRating)}`;
    animationSourceSelect.appendChild(option);
  });

  animationSourceSelect.value = resolved;
  selectedAnimationSource = resolved;
};

const loadAnimationSourceItems = async () => {
  if (!animationSourceItemsBody) return;

  if (!selectedAnimationSource) {
    renderAnimationSourceItems({ data: [], meta: { selectedSource: null, sourceSummary: [] }, pagination: { total: 0 } });
    return;
  }

  const params = new URLSearchParams({
    source: selectedAnimationSource,
    category: 'animation',
    limit: '20',
  });

  try {
    const res = await fetch(`${API_BASE}/comic/stats/source-items?${params.toString()}`);
    if (!res.ok) throw new Error('failed to fetch source items');
    const json = await res.json();
    renderAnimationSourceItems(json);
  } catch {
    renderAnimationSourceItems({ data: [], meta: { selectedSource: selectedAnimationSource, sourceSummary: [] }, pagination: { total: 0 } });
  }
};

const renderMangaExplorerRows = (rows = []) => {
  if (!mangaExplorerBody) return;
  mangaExplorerBody.innerHTML = '';



  if (!rows.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.className = 'overview-breakdown-empty';
    td.textContent = 'Tidak ada judul untuk filter saat ini.';
    tr.appendChild(td);
    mangaExplorerBody.appendChild(tr);
    return;
  }

  rows.forEach((item) => {
    const tr = document.createElement('tr');

    const titleTd = document.createElement('td');
    const titleWrap = document.createElement('div');
    titleWrap.className = 'source-items-title';
    const titleStrong = document.createElement('strong');
    titleStrong.textContent = item.title || '-';
    const subtitle = document.createElement('span');
    subtitle.textContent = `slug: ${item.slug || '-'} · genres: ${Array.isArray(item.genres) && item.genres.length ? item.genres.slice(0, 3).join(', ') : '-'}`;
    titleWrap.appendChild(titleStrong);
    titleWrap.appendChild(subtitle);
    titleTd.appendChild(titleWrap);

    const typeTd = document.createElement('td');
    typeTd.textContent = item.type || '-';

    const ratingTd = document.createElement('td');
    ratingTd.textContent = formatRating(item.rating);

    const viewsTd = document.createElement('td');
    viewsTd.textContent = String(Number(item.views || 0));

    const statusTd = document.createElement('td');
    const statusSpan = document.createElement('span');
    statusSpan.className = 'status-pill';
    statusSpan.textContent = item.status || '-';
    statusTd.appendChild(statusSpan);

    const actionsTd = document.createElement('td');
    actionsTd.style.whiteSpace = 'nowrap';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn';
    editBtn.innerHTML = '✏️';
    editBtn.title = 'Edit Title';
    editBtn.onclick = () => openMangaModal(item);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = 'Delete Title';
    deleteBtn.style.color = 'var(--accent-red)';
    deleteBtn.onclick = () => deleteManga(item._id);

    actionsTd.appendChild(editBtn);
    actionsTd.appendChild(deleteBtn);

    tr.appendChild(titleTd);
    tr.appendChild(typeTd);
    tr.appendChild(ratingTd);
    tr.appendChild(viewsTd);
    tr.appendChild(statusTd);
    tr.appendChild(actionsTd);
    mangaExplorerBody.appendChild(tr);
  });
};

const updateMangaExplorerMeta = (total = 0) => {
  if (!mangaExplorerMeta) return;
  const qLabel = mangaExplorerState.q ? ` · query: "${mangaExplorerState.q}"` : '';
  mangaExplorerMeta.textContent = `${mangaExplorerState.type.toUpperCase()} · ${total} titles · page ${mangaExplorerState.page}/${Math.max(1, mangaExplorerState.totalPages)}${qLabel}`;
};

const loadMangaExplorer = async () => {
  if (!mangaExplorerBody) return;

  const params = new URLSearchParams({
    type: mangaExplorerState.type,
    page: String(mangaExplorerState.page),
    limit: String(mangaExplorerState.limit),
  });

  const useSearch = Boolean(mangaExplorerState.q && mangaExplorerState.q.trim());
  if (useSearch) {
    params.set('q', mangaExplorerState.q.trim());
  }

  const endpoint = useSearch
    ? `${API_BASE}/comic/search?${params.toString()}`
    : `${API_BASE}/comic/unlimited?${params.toString()}`;

  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error('failed to fetch manga explorer data');
    const json = await res.json();
    const rows = Array.isArray(json?.data) ? json.data : [];
    const pagination = json?.pagination || json?.meta || {};

    mangaExplorerState.totalPages = Number(pagination.totalPages || 1);
    mangaExplorerState.page = Number(pagination.page || mangaExplorerState.page || 1);

    if (mangaPrevBtn) mangaPrevBtn.disabled = mangaExplorerState.page <= 1;
    if (mangaNextBtn) mangaNextBtn.disabled = mangaExplorerState.page >= mangaExplorerState.totalPages;

    renderMangaExplorerRows(rows);
    updateMangaExplorerMeta(Number(pagination.total || rows.length || 0));
  } catch {
    mangaExplorerState.totalPages = 1;
    mangaExplorerState.page = 1;
    if (mangaPrevBtn) mangaPrevBtn.disabled = true;
    if (mangaNextBtn) mangaNextBtn.disabled = true;
    renderMangaExplorerRows([]);
    updateMangaExplorerMeta(0);
  }
};

const loadContentStats = async () => {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? '0';
  };

  const SOURCE_EMOJIS = {
    anichin: '🍜',
    samehadaku: '⚔️',
    otakudesu: '🎌',
    animekuindo: '🌀',
    animasu: '🎞️',
    anoboy: '🌊',
    animeindo: '📺',
    kusonime: '🥷',
    mangadex: '📖',
    komiku: '🖋️',
    mangakakalot: '📚',
    manhwaclan: '🧭',
    mangabat: '🧱',
    bato: '🧩',
  };

  const getSourceEmoji = (source, primaryType) => {
    const normalized = String(source || '').toLowerCase();
    if (SOURCE_EMOJIS[normalized]) return SOURCE_EMOJIS[normalized];
    if (primaryType === 'anime') return '✨';
    if (primaryType === 'donghua') return '🐉';
    if (primaryType === 'manga') return '📚';
    if (primaryType === 'manhwa') return '🟩';
    if (primaryType === 'manhua') return '🟨';
    if (primaryType === 'movie') return '🎬';
    if (primaryType === 'ona') return '📼';
    return '🔗';
  };

  const inferPrimaryType = (row) => {
    if (row?.primaryType) return row.primaryType;
    const byType = row?.byType || {};
    const ordered = ['anime', 'donghua', 'manga', 'manhwa', 'manhua', 'movie', 'ona'];
    return ordered.find((type) => (byType[type] || 0) > 0) || 'unknown';
  };

  const renderSourceSection = (container, titleText, subtitleText, rows, accentClass) => {
    if (!container) return;
    container.innerHTML = '';

    const section = document.createElement('div');
    section.className = 'panel overview-source-section';

    const header = document.createElement('div');
    header.className = 'overview-source-section-head';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'overview-source-section-title';
    const title = document.createElement('h3');
    title.textContent = titleText;
    const subtitle = document.createElement('p');
    subtitle.textContent = subtitleText;
    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);

    const meta = document.createElement('span');
    meta.className = `overview-source-section-meta ${accentClass}`.trim();
    meta.textContent = `${rows.length} sources`;

    header.appendChild(titleWrap);
    header.appendChild(meta);

    const grid = document.createElement('div');
    grid.className = 'ultimate-grid overview-source-grid';

    const visibleRows = rows.slice(0, 10);
    visibleRows.forEach((row) => {
      const card = document.createElement('article');
      card.className = 'card overview-source-card';

      const source = row.source || row._id || 'unknown';
      const primaryType = inferPrimaryType(row);
      const emoji = getSourceEmoji(source, primaryType);
      const total = Number(row.categoryTotal || row.total || row.count || 0);
      const byType = row.byType || {};
      const details = Object.entries(byType)
        .filter(([, count]) => Number(count) > 0)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, 3);

      const badge = document.createElement('div');
      badge.className = 'card-thumb overview-source-badge';
      badge.textContent = emoji;

      const body = document.createElement('div');
      body.className = 'overview-source-body';

      const nameRow = document.createElement('div');
      nameRow.className = 'overview-source-name-row';
      const name = document.createElement('strong');
      name.textContent = source;
      const totalLabel = document.createElement('span');
      totalLabel.textContent = `${total} item${total === 1 ? '' : 's'}`;
      nameRow.appendChild(name);
      nameRow.appendChild(totalLabel);

      const typeChip = document.createElement('span');
      typeChip.className = 'overview-source-type';
      typeChip.textContent = primaryType;

      const chipWrap = document.createElement('div');
      chipWrap.className = 'overview-source-chips';
      details.forEach(([type, count]) => {
        const chip = document.createElement('span');
        chip.className = 'overview-source-chip';
        chip.textContent = `${type}: ${count}`;
        chipWrap.appendChild(chip);
      });

      body.appendChild(nameRow);
      body.appendChild(typeChip);
      if (details.length > 0) body.appendChild(chipWrap);

      card.appendChild(badge);
      card.appendChild(body);
      grid.appendChild(card);
    });

    if (rows.length > visibleRows.length) {
      const more = document.createElement('div');
      more.className = 'overview-breakdown-empty';
      more.textContent = `+${rows.length - visibleRows.length} source lainnya tidak ditampilkan.`;
      grid.appendChild(more);
    }

    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'overview-breakdown-empty';
      empty.textContent = 'Belum ada source pada kategori ini.';
      section.appendChild(header);
      section.appendChild(empty);
      container.appendChild(section);
      return;
    }

    section.appendChild(header);
    section.appendChild(grid);
    container.appendChild(section);
  };

  const renderOverviewSourceBreakdown = (payload) => {
    if (!overviewSourceBreakdown) return;

    const breakdown = payload?.sourceBreakdown || {};
    const animeSources = Array.isArray(breakdown.animeSources) ? breakdown.animeSources : [];
    const donghuaSources = Array.isArray(breakdown.donghuaSources) ? breakdown.donghuaSources : [];
    const mangaSources = Array.isArray(breakdown.mangaSources) ? breakdown.mangaSources : [];
    const topSources = Array.isArray(breakdown.topSources) ? breakdown.topSources : [];
    const byNetwork = payload?.animationByNetwork || payload?.byNetwork || {};
    const entries = Object.entries(byNetwork)
      .map(([source, count]) => [source, Number(count) || 0])
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    overviewSourceBreakdown.innerHTML = '';

    const total = Number(payload?.animationTotal || entries.reduce((sum, [, count]) => sum + count, 0));
    const sourceCount = Number(payload?.animationSources || entries.length);
    if (overviewBreakdownMeta) {
      overviewBreakdownMeta.textContent = `${total} animation items across ${sourceCount} sources`;
    }

    if (!entries.length) {
      const empty = document.createElement('div');
      empty.className = 'overview-breakdown-empty';
      empty.textContent = 'Belum ada data breakdown source.';
      overviewSourceBreakdown.appendChild(empty);
    }

    const maxCount = entries[0]?.[1] || 1;

    const summary = document.createElement('div');
    summary.className = 'overview-breakdown-summary';
    summary.innerHTML = '';
    const summaryItems = [
      { label: 'Global Animation Hub', value: total },
      { label: 'Active Source Nodes', value: sourceCount },
      { label: 'Anime Sources', value: animeSources.length },
      { label: 'Donghua sources', value: donghuaSources.length },
      { label: 'Manga sources', value: mangaSources.length },
    ];
    summaryItems.forEach((item) => {
      const chip = document.createElement('div');
      chip.className = 'overview-summary-chip';
      const label = document.createElement('span');
      label.textContent = item.label;
      const value = document.createElement('strong');
      value.textContent = String(item.value);
      chip.appendChild(label);
      chip.appendChild(value);
      summary.appendChild(chip);
    });
    overviewSourceBreakdown.appendChild(summary);

    const groupedWrapper = document.createElement('div');
    groupedWrapper.className = 'overview-source-groups';
    renderSourceSection(groupedWrapper, 'Anime Sources', 'Source yang menyuplai katalog anime.', animeSources, 'accent-anime');
    renderSourceSection(groupedWrapper, 'Donghua Sources', 'Source untuk donghua, movie, dan ONA.', donghuaSources, 'accent-donghua');
    renderSourceSection(groupedWrapper, 'Manga Sources', 'Source untuk manga, manhwa, dan manhua.', mangaSources, 'accent-manga');
    overviewSourceBreakdown.appendChild(groupedWrapper);

    const topPanel = document.createElement('div');
    topPanel.className = 'overview-top-sources';
    const topHead = document.createElement('div');
    topHead.className = 'overview-source-section-head';
    const topTitleWrap = document.createElement('div');
    topTitleWrap.className = 'overview-source-section-title';
    const topTitle = document.createElement('h3');
    topTitle.textContent = 'Top 10 Source Cards';
    const topSubtitle = document.createElement('p');
    topSubtitle.textContent = 'Gabungan source paling aktif di seluruh kategori, dengan badge emoji per source.';
    topTitleWrap.appendChild(topTitle);
    topTitleWrap.appendChild(topSubtitle);
    const topMeta = document.createElement('span');
    topMeta.className = 'overview-source-section-meta accent-top';
    topMeta.textContent = `${topSources.length} cards`;
    topHead.appendChild(topTitleWrap);
    topHead.appendChild(topMeta);

    const topGrid = document.createElement('div');
    topGrid.className = 'ultimate-grid overview-source-card-grid';
    topSources.slice(0, 10).forEach((row) => {
      const card = document.createElement('article');
      card.className = 'card overview-top-source-card';
      const source = row.source || 'unknown';
      const primaryType = inferPrimaryType(row);
      const emoji = getSourceEmoji(source, primaryType);
      const totalCount = Number(row.total || 0);
      const byType = row.byType || {};
      const segments = Object.entries(byType)
        .filter(([, count]) => Number(count) > 0)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, 3);

      const badge = document.createElement('div');
      badge.className = 'card-thumb overview-top-source-badge';
      badge.textContent = emoji;

      const content = document.createElement('div');
      content.className = 'overview-top-source-content';

      const name = document.createElement('strong');
      name.className = 'overview-top-source-name';
      name.textContent = source;

      const meta = document.createElement('div');
      meta.className = 'overview-top-source-meta';
      meta.textContent = `${totalCount} total items · ${primaryType}`;

      const chips = document.createElement('div');
      chips.className = 'overview-top-source-chips';
      segments.forEach(([type, count]) => {
        const chip = document.createElement('span');
        chip.className = 'overview-top-source-chip';
        chip.textContent = `${type}: ${count}`;
        chips.appendChild(chip);
      });

      content.appendChild(name);
      content.appendChild(meta);
      if (segments.length > 0) content.appendChild(chips);

      card.appendChild(badge);
      card.appendChild(content);
      topGrid.appendChild(card);
    });

    if (topSources.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'overview-breakdown-empty';
      empty.textContent = 'Belum ada top source data.';
      topGrid.appendChild(empty);
    }

    topPanel.appendChild(topHead);
    topPanel.appendChild(topGrid);
    overviewSourceBreakdown.appendChild(topPanel);

    if (entries.length > 0) {
      const rawPanel = document.createElement('div');
      rawPanel.className = 'overview-raw-network-panel';
      const rawHead = document.createElement('div');
      rawHead.className = 'overview-source-section-head';
      const rawTitleWrap = document.createElement('div');
      rawTitleWrap.className = 'overview-source-section-title';
      const rawTitle = document.createElement('h3');
      rawTitle.textContent = 'Raw Animation Network Breakdown';
      const rawSubtitle = document.createElement('p');
      rawSubtitle.textContent = 'Panel cepat untuk melihat network yang mendominasi data animation.';
      rawTitleWrap.appendChild(rawTitle);
      rawTitleWrap.appendChild(rawSubtitle);
      const rawMeta = document.createElement('span');
      rawMeta.className = 'overview-source-section-meta accent-raw';
      rawMeta.textContent = `${entries.length} networks`;
      rawHead.appendChild(rawTitleWrap);
      rawHead.appendChild(rawMeta);

      const rawList = document.createElement('div');
      rawList.className = 'overview-breakdown-list';
      entries.slice(0, 10).forEach(([source, count]) => {
        const row = document.createElement('div');
        row.className = 'overview-breakdown-row';

        const label = document.createElement('div');
        label.className = 'overview-breakdown-label';
        const title = document.createElement('strong');
        title.textContent = source;
        const subtitle = document.createElement('span');
        subtitle.textContent = `${count} item` + (count > 1 ? 's' : '');
        label.appendChild(title);
        label.appendChild(subtitle);

        const barWrap = document.createElement('div');
        barWrap.className = 'overview-breakdown-bar-wrap';
        const bar = document.createElement('div');
        bar.className = 'overview-breakdown-bar';
        const fill = document.createElement('i');
        fill.style.width = `${Math.max(4, Math.round((count / maxCount) * 100))}%`;
        bar.appendChild(fill);
        const meta = document.createElement('small');
        meta.textContent = `${Math.round((count / total) * 100)}% of total`;
        barWrap.appendChild(bar);
        barWrap.appendChild(meta);

        const value = document.createElement('strong');
        value.textContent = String(count);
        value.style.textAlign = 'right';

        row.appendChild(label);
        row.appendChild(barWrap);
        row.appendChild(value);
        rawList.appendChild(row);
      });

      rawPanel.appendChild(rawHead);
      rawPanel.appendChild(rawList);
      overviewSourceBreakdown.appendChild(rawPanel);

      if (entries.length > 10) {
        const more = document.createElement('div');
        more.className = 'overview-breakdown-empty';
        more.textContent = `+${entries.length - 10} source lainnya tersembunyi.`;
        overviewSourceBreakdown.appendChild(more);
      }
    }
  };

  try {
    const res = await fetch(`${API_BASE}/comic/stats`);
    if (!res.ok) {
      throw new Error(`stats endpoint failed with status ${res.status}`);
    }
    const json = await res.json();
    const d = json?.data;
    if (!d) {
      throw new Error('stats payload missing data');
    }
    const byType = d.byType || {};
    latestStatsSnapshot = d;

    const formatNum = (num) => {
      if (typeof num !== 'number') return num || '0';
      return new Intl.NumberFormat('id-ID').format(num);
    };

    set('statTotal',   formatNum(d.total));
    set('statDonghua', formatNum(byType.donghua || 0));
    set('statManga',   formatNum(byType.manga   || 0));
    set('statManhwa',  formatNum(byType.manhwa  || 0));
    set('statManhua',  formatNum(byType.manhua  || 0));
    set('statAnime',   formatNum(d.animationTotal || byType.anime || 0));
    set('statOna',     formatNum(byType.ona     || 0));
    set('statMovie',   formatNum(byType.movie   || 0));
    set('statAnimeProxy', formatNum(d.animationSources || d.proxySources || 0));
    renderOverviewSourceBreakdown(d);
    populateAnimationSourceSelect(d.animationSourceList || []);
    await loadAnimationSourceItems();
  } catch {
    latestStatsSnapshot = null;
    set('statTotal', '-');
    set('statDonghua', '-');
    set('statManga', '-');
    set('statManhwa', '-');
    set('statManhua', '-');
    set('statAnime', '-');
    set('statOna', '-');
    set('statMovie', '-');
    set('statAnimeProxy', '-');

    if (overviewBreakdownMeta) overviewBreakdownMeta.textContent = 'No data';
    if (overviewSourceBreakdown) {
      overviewSourceBreakdown.innerHTML = '';
      const empty = document.createElement('div');
      empty.className = 'overview-breakdown-empty';
      empty.textContent = 'Tidak ada data overview source.';
      overviewSourceBreakdown.appendChild(empty);
    }
    if (animationSourceSelect) {
      animationSourceSelect.innerHTML = '<option value="">Tidak ada source animation</option>';
      selectedAnimationSource = '';
    }
    renderAnimationSourceItems({ data: [], meta: { selectedSource: null, sourceSummary: [] }, pagination: { total: 0 } });
  }
};

/* ══════════════════════════════════════════════════════════════
   QUICK LINKS
   ══════════════════════════════════════════════════════════ */
const QUICK_LINKS = [
  {
    group: '🌐 Sistem & Halaman',
    items: [
      { tag: 'PAGE', tagClass: 'ql-page', label: 'Dashboard / Admin Panel', path: '/' },
      { tag: 'DOCS', tagClass: 'ql-docs', label: 'Swagger API Docs', path: '/api/v1/docs' },
      { tag: 'GET',  tagClass: 'ql-get',  label: 'Health Check (JSON)',  path: '/health' },
    ],
  },
  {
    group: '🔥 Discovery & Trending',
    items: [
      { tag: 'GET', tagClass: 'ql-get', label: 'Trending Manga (week)',  path: '/api/v1/trending?period=week&limit=10' },
      { tag: 'GET', tagClass: 'ql-get', label: 'Popular (bookmarks)',    path: '/api/v1/popular?metric=bookmarks&limit=10' },
      { tag: 'GET', tagClass: 'ql-get', label: 'Latest Manga',          path: '/api/v1/latest?limit=20' },
      { tag: 'GET', tagClass: 'ql-get', label: 'Search "naruto"',       path: '/api/v1/search?q=naruto' },
    ],
  },
  {
    group: '📚 Manga / Komik',
    items: [
      { tag: 'GET', tagClass: 'ql-get', label: 'Daftar Manga (page 1)',         path: '/api/v1/mangas?page=1&limit=20' },
      { tag: 'GET', tagClass: 'ql-get', label: 'Filter Manhwa',                 path: '/api/v1/mangas?type=manhwa&page=1' },
      { tag: 'GET', tagClass: 'ql-get', label: 'Detail Manga (solo-leveling)',  path: '/api/v1/mangas/solo-leveling' },
      { tag: 'GET', tagClass: 'ql-get', label: 'Comic Stats',                   path: '/api/v1/comic/stats' },
      { tag: 'GET', tagClass: 'ql-get', label: 'Animation Distribution Debug',  path: '/api/v1/comic/stats/distribution?sample=1&samplePerGroup=2' },
      { tag: 'GET', tagClass: 'ql-get', label: 'Debug: winbu only',             path: '/api/v1/comic/stats/distribution?network=winbu&sample=1&samplePerGroup=2' },
      { tag: 'GET', tagClass: 'ql-get', label: 'Debug: donghua only',           path: '/api/v1/comic/stats/distribution?type=donghua&sample=1&samplePerGroup=2' },
    ],
  },
  {
    group: '🎬 Donghua',
    items: [
      { tag: 'GET', tagClass: 'ql-get', label: 'Donghua Home',           path: '/api/v1/donghua/home' },
      { tag: 'GET', tagClass: 'ql-get', label: 'Donghua Ongoing',        path: '/api/v1/donghua/ongoing?page=1' },
      { tag: 'GET', tagClass: 'ql-get', label: 'Donghua Completed',      path: '/api/v1/donghua/completed?page=1' },
      { tag: 'GET', tagClass: 'ql-get', label: 'Donghua Genres',         path: '/api/v1/donghua/genres' },
      { tag: 'GET', tagClass: 'ql-get', label: 'Search Donghua (battle)',path: '/api/v1/donghua/search?q=battle+through' },
      { tag: 'GET', tagClass: 'ql-get', label: 'Donghua By Year 2024',   path: '/api/v1/donghua/year/2024?page=1' },
    ],
  },
  {
    group: '👤 Auth & User',
    items: [
      { tag: 'GET', tagClass: 'ql-get', label: 'Profil Saya (auth required)', path: '/api/v1/users/me' },
      { tag: 'GET', tagClass: 'ql-get', label: 'Semua Tags',                  path: '/api/v1/tags?page=1&limit=50' },
    ],
  },
  {
    group: '📡 Proxy: Samehadaku',
    items: [
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Home',               path: '/api/v1/samehadaku/home' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Recent',             path: '/api/v1/samehadaku/recent' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Popular',            path: '/api/v1/samehadaku/popular' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Ongoing',            path: '/api/v1/samehadaku/ongoing?page=1' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Movies',             path: '/api/v1/samehadaku/movies' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Schedule',           path: '/api/v1/samehadaku/schedule' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Genres',             path: '/api/v1/samehadaku/genres' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Search "naruto"',    path: '/api/v1/samehadaku/search?q=naruto' },
    ],
  },
  {
    group: '📡 Proxy: Animasu',
    items: [
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Home',               path: '/api/v1/animasu/home' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Latest',             path: '/api/v1/animasu/latest' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Popular',            path: '/api/v1/animasu/popular' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Movies',             path: '/api/v1/animasu/movies' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Schedule',           path: '/api/v1/animasu/schedule' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Genres',             path: '/api/v1/animasu/genres' },
    ],
  },
  {
    group: '📡 Proxy: Kusonime',
    items: [
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Latest',             path: '/api/v1/kusonime/latest' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'All Anime',          path: '/api/v1/kusonime/all-anime' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Movies',             path: '/api/v1/kusonime/movie' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'All Genres',         path: '/api/v1/kusonime/all-genres' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'All Seasons',        path: '/api/v1/kusonime/all-seasons' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Search "naruto"',    path: '/api/v1/kusonime/search/naruto' },
    ],
  },
  {
    group: '📡 Proxy: Anoboy',
    items: [
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Home',               path: '/api/v1/anoboy/home' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'AZ List',            path: '/api/v1/anoboy/az-list' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Genres',             path: '/api/v1/anoboy/genres' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Search "naruto"',    path: '/api/v1/anoboy/search/naruto' },
    ],
  },
  {
    group: '📡 Proxy: AnimeSail',
    items: [
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Home',               path: '/api/v1/animesail/home' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Terbaru',            path: '/api/v1/animesail/terbaru' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Donghua',            path: '/api/v1/animesail/donghua' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Movies',             path: '/api/v1/animesail/movie' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Schedule',           path: '/api/v1/animesail/schedule' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Genres',             path: '/api/v1/animesail/genres' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Search "naruto"',    path: '/api/v1/animesail/search/naruto' },
    ],
  },
  {
    group: '📡 Proxy: Oploverz',
    items: [
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Home',               path: '/api/v1/oploverz/home' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Ongoing',            path: '/api/v1/oploverz/ongoing?page=1' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Completed',          path: '/api/v1/oploverz/completed?page=1' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Schedule',           path: '/api/v1/oploverz/schedule' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Search "naruto"',    path: '/api/v1/oploverz/search/naruto' },
    ],
  },
  {
    group: '📡 Proxy: Stream',
    items: [
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Latest',             path: '/api/v1/stream/latest' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Popular',            path: '/api/v1/stream/popular' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Movies',             path: '/api/v1/stream/movie' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Genres',             path: '/api/v1/stream/genres' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Search "naruto"',    path: '/api/v1/stream/search/naruto' },
    ],
  },
  {
    group: '📡 Proxy: Animekuindo',
    items: [
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Home',               path: '/api/v1/animekuindo/home' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Latest',             path: '/api/v1/animekuindo/latest' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Popular',            path: '/api/v1/animekuindo/popular' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Schedule',           path: '/api/v1/animekuindo/schedule' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Genres',             path: '/api/v1/animekuindo/genres' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Search "naruto"',    path: '/api/v1/animekuindo/search/naruto' },
    ],
  },
  {
    group: '📡 Proxy: Nimegami',
    items: [
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Home',               path: '/api/v1/nimegami/home' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Anime List',         path: '/api/v1/nimegami/anime-list' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'J-Drama',            path: '/api/v1/nimegami/j-drama' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Live Action',        path: '/api/v1/nimegami/live-action' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Genre List',         path: '/api/v1/nimegami/genre/list' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Search "naruto"',    path: '/api/v1/nimegami/search/naruto' },
    ],
  },
  {
    group: '📡 Proxy: Alqanime',
    items: [
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Home',               path: '/api/v1/alqanime/home' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Ongoing',            path: '/api/v1/alqanime/ongoing' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Completed',          path: '/api/v1/alqanime/completed' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Popular',            path: '/api/v1/alqanime/popular' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Schedule',           path: '/api/v1/alqanime/schedule' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Search "naruto"',    path: '/api/v1/alqanime/search/naruto' },
    ],
  },
  {
    group: '📡 Proxy: Donghub',
    items: [
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Home',               path: '/api/v1/donghub/home' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Latest',             path: '/api/v1/donghub/latest' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Popular',            path: '/api/v1/donghub/popular' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Schedule',           path: '/api/v1/donghub/schedule' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Search "naruto"',    path: '/api/v1/donghub/search/naruto' },
    ],
  },
  {
    group: '📡 Proxy: Winbu',
    items: [
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Home',               path: '/api/v1/winbu/home' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Latest',             path: '/api/v1/winbu/latest' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Ongoing',            path: '/api/v1/winbu/ongoing' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Genres',             path: '/api/v1/winbu/genres' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Search',             path: '/api/v1/winbu/search?q=naruto' },
    ],
  },
  {
    group: '📡 Proxy: Kuramanime',
    items: [
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Home',               path: '/api/v1/kura/home' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Anime List',         path: '/api/v1/kura/anime-list?page=1' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Schedule',           path: '/api/v1/kura/schedule' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Search "naruto"',    path: '/api/v1/kura/search/naruto' },
    ],
  },
  {
    group: '📡 Proxy: Dramabox',
    items: [
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Latest',             path: '/api/v1/dramabox/latest?page=1' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Trending',           path: '/api/v1/dramabox/trending' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Search "love"',      path: '/api/v1/dramabox/search?q=love' },
    ],
  },
  {
    group: '📡 Proxy: Drachin',
    items: [
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Home',               path: '/api/v1/drachin/home' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Latest',             path: '/api/v1/drachin/latest?page=1' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Popular',            path: '/api/v1/drachin/popular?page=1' },
      { tag: 'PROXY', tagClass: 'ql-proxy', label: 'Search "naruto"',    path: '/api/v1/drachin/search/naruto' },
    ],
  },

  // ── DB Routes ──────────────────────────────────────────────────────────────
  {
    group: '🗄️ DB: Manga',
    items: [
      { tag: 'DB', tagClass: 'ql-db', label: 'List Manga (page 1)',       path: '/api/v1/manga-db?page=1&limit=20' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Search Manga',             path: '/api/v1/manga-db?search=naruto' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Filter Ongoing',           path: '/api/v1/manga-db?status=ongoing' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Sort by Rating',           path: '/api/v1/manga-db?sortBy=rating&order=desc' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Detail by Slug',           path: '/api/v1/manga-db/one-piece' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Chapters (by ID)',         path: '/api/v1/manga-db/:id/chapters' },
    ],
  },
  {
    group: '🗄️ DB: Manhwa',
    items: [
      { tag: 'DB', tagClass: 'ql-db', label: 'List Manhwa (page 1)',     path: '/api/v1/manhwa-db?page=1&limit=20' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Search Manhwa',           path: '/api/v1/manhwa-db?search=solo+leveling' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Filter Completed',        path: '/api/v1/manhwa-db?status=completed' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Sort by Views',           path: '/api/v1/manhwa-db?sortBy=views&order=desc' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Detail by Slug',          path: '/api/v1/manhwa-db/solo-leveling' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Chapters (by ID)',        path: '/api/v1/manhwa-db/:id/chapters' },
    ],
  },
  {
    group: '🗄️ DB: Manhua',
    items: [
      { tag: 'DB', tagClass: 'ql-db', label: 'List Manhua (page 1)',     path: '/api/v1/manhua-db?page=1&limit=20' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Search Manhua',           path: '/api/v1/manhua-db?search=battle' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Filter Ongoing',          path: '/api/v1/manhua-db?status=ongoing' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Detail by Slug',          path: '/api/v1/manhua-db/battle-through-the-heavens' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Chapters (by ID)',        path: '/api/v1/manhua-db/:id/chapters' },
    ],
  },
  {
    group: '🗄️ DB: Anime',
    items: [
      { tag: 'DB', tagClass: 'ql-db', label: 'List Anime (page 1)',      path: '/api/v1/anime-db?page=1&limit=20' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Search Anime',            path: '/api/v1/anime-db?search=naruto' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Filter Ongoing',          path: '/api/v1/anime-db?status=ongoing' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Sort by Rating',          path: '/api/v1/anime-db?sortBy=rating&order=desc' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Detail by Slug',          path: '/api/v1/anime-db/naruto' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Seasons (by ID)',         path: '/api/v1/anime-db/:id/seasons' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Episodes (by ID)',        path: '/api/v1/anime-db/:id/episodes' },
    ],
  },
  {
    group: '🗄️ DB: Donghua',
    items: [
      { tag: 'DB', tagClass: 'ql-db', label: 'List Donghua (page 1)',    path: '/api/v1/donghua-db?page=1&limit=20' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Search Donghua',          path: '/api/v1/donghua-db?search=battle' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Filter Ongoing',          path: '/api/v1/donghua-db?status=ongoing' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Sort by Views',           path: '/api/v1/donghua-db?sortBy=views&order=desc' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Detail by Slug',          path: '/api/v1/donghua-db/battle-through-the-heavens' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Seasons (by ID)',         path: '/api/v1/donghua-db/:id/seasons' },
      { tag: 'DB', tagClass: 'ql-db', label: 'Episodes (by ID)',        path: '/api/v1/donghua-db/:id/episodes' },
    ],
  },
  {
    group: '🛠️ Anime DB Sync',
    bulkAction: { label: '⚡ Sync All 16 Sources', path: '/api/v1/jobs/anime-sync?limit=20&update=true', method: 'POST' },
    items: [
      { tag: 'SYNC', tagClass: 'ql-admin', method: 'POST', label: 'Sync Oploverz', path: '/api/v1/jobs/anime-sync/oploverz?limit=1&update=true' },
      { tag: 'SYNC', tagClass: 'ql-admin', method: 'POST', label: 'Sync Samehadaku', path: '/api/v1/jobs/anime-sync/samehadaku?limit=1&update=true' },
      { tag: 'SYNC', tagClass: 'ql-admin', method: 'POST', label: 'Sync Animasu', path: '/api/v1/jobs/anime-sync/animasu?limit=1&update=true' },
      { tag: 'SYNC', tagClass: 'ql-admin', method: 'POST', label: 'Sync Kusonime', path: '/api/v1/jobs/anime-sync/kusonime?limit=1&update=true' },
      { tag: 'SYNC', tagClass: 'ql-admin', method: 'POST', label: 'Sync Anoboy', path: '/api/v1/jobs/anime-sync/anoboy?limit=1&update=true' },
      { tag: 'SYNC', tagClass: 'ql-admin', method: 'POST', label: 'Sync AnimeSail', path: '/api/v1/jobs/anime-sync/animesail?limit=1&update=true' },
      { tag: 'SYNC', tagClass: 'ql-admin', method: 'POST', label: 'Sync Stream', path: '/api/v1/jobs/anime-sync/stream?limit=1&update=true' },
      { tag: 'SYNC', tagClass: 'ql-admin', method: 'POST', label: 'Sync Animekuindo', path: '/api/v1/jobs/anime-sync/animekuindo?limit=1&update=true' },
      { tag: 'SYNC', tagClass: 'ql-admin', method: 'POST', label: 'Sync Nimegami', path: '/api/v1/jobs/anime-sync/nimegami?limit=1&update=true' },
      { tag: 'SYNC', tagClass: 'ql-admin', method: 'POST', label: 'Sync Alqanime', path: '/api/v1/jobs/anime-sync/alqanime?limit=1&update=true' },
      { tag: 'SYNC', tagClass: 'ql-admin', method: 'POST', label: 'Sync Donghub', path: '/api/v1/jobs/anime-sync/donghub?limit=1&update=true' },
      { tag: 'SYNC', tagClass: 'ql-admin', method: 'POST', label: 'Sync Winbu', path: '/api/v1/jobs/anime-sync/winbu?limit=1&update=true' },
      { tag: 'SYNC', tagClass: 'ql-admin', method: 'POST', label: 'Sync Kuramanime', path: '/api/v1/jobs/anime-sync/kura?limit=1&update=true' },
      { tag: 'SYNC', tagClass: 'ql-admin', method: 'POST', label: 'Sync Dramabox', path: '/api/v1/jobs/anime-sync/dramabox?limit=1&update=true' },
      { tag: 'SYNC', tagClass: 'ql-admin', method: 'POST', label: 'Sync Drachin', path: '/api/v1/jobs/anime-sync/drachin?limit=1&update=true' },
    ],
  },
];

/* ── Quick Link status persistence ────────────────────────────── */
const QL_STATUS_KEY = 'ql_sync_status_v1';
const _qlStatusCache = (() => {
  try { return JSON.parse(localStorage.getItem(QL_STATUS_KEY) || '{}'); }
  catch { return {}; }
})();
const _saveQlStatus = () => {
  try { localStorage.setItem(QL_STATUS_KEY, JSON.stringify(_qlStatusCache)); } catch {}
};
const setQlStatus = (path, state) => { _qlStatusCache[path] = state; _saveQlStatus(); };
const getQlStatus = (path) => _qlStatusCache[path] || null;
const _applyStatusEl = (el, state) => {
  if (!el) return;
  el.classList.remove('ql-status--ok', 'ql-status--fail', 'ql-status--loading');
  if (!state) { el.textContent = ''; return; }
  if (state === 'loading') {
    el.classList.add('ql-status--loading');
    el.textContent = '●';
    el.title = 'Running…';
    return;
  }
  el.classList.add(state.ok ? 'ql-status--ok' : 'ql-status--fail');
  el.textContent = state.ok ? '✓' : '✗';
  el.title = `${state.ok ? 'OK' : 'Gagal'} · ${state.ts}${state.msg ? ' · ' + state.msg : ''}`;
};

const renderQuickLinks = (filterText = '') => {
  const container = document.getElementById('quickLinksGrid');
  if (!container) return;

  const origin = window.location.origin;
  const searchTerm = filterText.toLowerCase();

  container.innerHTML = `
    <div class="ql-search-container" style="margin-bottom: 30px;">
      <input type="text" id="qlSearchInput" placeholder="🔍 SEARCH ENDPOINTS (e.g. proxy, search, trending...)" 
             value="${filterText}"
             style="width: 100%; padding: 15px 20px; border: 3px solid #000; box-shadow: 6px 6px 0px #000; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; font-weight: 800; outline: none;">
    </div>
    <div id="qlContent"></div>
  `;

  const qlContent = document.getElementById('qlContent');
  const searchInput = document.getElementById('qlSearchInput');

  // Handle live search
  searchInput.addEventListener('input', (e) => {
    renderQuickLinks(e.target.value);
    document.getElementById('qlSearchInput').focus();
  });

  QUICK_LINKS.forEach((group) => {
    const filteredItems = group.items.filter(it => 
      it.label.toLowerCase().includes(searchTerm) || 
      it.path.toLowerCase().includes(searchTerm) ||
      group.group.toLowerCase().includes(searchTerm)
    );

    if (filteredItems.length === 0) return;

    const groupSection = document.createElement('div');
    groupSection.className = 'ql-group-section';
    groupSection.innerHTML = `<h3 class="section-group-title">${group.group}</h3>`;

    const grid = document.createElement('div');
    grid.className = 'tech-grid-compact';

    filteredItems.forEach((item) => {
      const fullUrl = `${origin}${item.path}`;
      const card = document.createElement('div');
      card.className = 'endpoint-card';
      card.innerHTML = `
        <div class="endpoint-header">
           <div style="display: flex; align-items: center; gap: 8px;">
             <span class="method-tag ${item.tagClass}">${item.tag}</span>
             <div class="live-pulse"></div>
           </div>
           <button class="action-btn-mini" data-copy-url="${fullUrl}">COPY</button>
        </div>
        <div class="endpoint-path">${item.path}</div>
        <div class="endpoint-desc">${item.label}</div>
      `;
      
      card.onclick = (e) => {
        if(e.target.dataset.copyUrl) {
          navigator.clipboard.writeText(e.target.dataset.copyUrl);
          const oldText = e.target.textContent;
          e.target.textContent = 'COPIED!';
          setTimeout(() => e.target.textContent = oldText, 1000);
          return;
        }
        window.open(fullUrl, '_blank');
      };

      grid.appendChild(card);
    });

    groupSection.appendChild(grid);
    qlContent.appendChild(groupSection);
  });
};

const executeQuickLink = async ({ method = 'GET', path, body = null, statusEl = null }) => {
  responseMeta.textContent = 'Loading...';
  responseBox.textContent = '';
  _applyStatusEl(statusEl, 'loading');

  let url = path;
  if (!url.startsWith('http')) {
    if (!url.startsWith('/')) url = `/${url}`;
    if (!url.startsWith('/api/')) {
      url = `${API_BASE}${url}`;
    }
  }

  const resolvedUrl = new URL(url, window.location.origin);
  if (resolvedUrl.origin !== window.location.origin) {
    responseMeta.textContent = 'Blocked: external origin is not allowed in quick links';
    responseBox.textContent = resolvedUrl.href;
    return;
  }

  const headers = { Accept: 'application/json' };
  const token = document.getElementById('playToken')?.value?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const options = { method, headers };
  if (body && method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const startedAt = performance.now();
  try {
    const res = await fetch(resolvedUrl.href, options);
    const elapsed = Math.round((performance.now() - startedAt) * 100) / 100;
    const text = await res.text();
    let pretty = text;
    try {
      pretty = JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      // Keep raw text if not JSON
    }
    responseMeta.textContent = `${res.status} ${res.statusText} · ${elapsed} ms`;
    responseBox.textContent = pretty;
    const ts = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const okState = { ok: res.ok, ts, count: (getQlStatus(path)?.count || 0) + 1 };
    if (!res.ok) okState.msg = `${res.status} ${res.statusText}`;
    setQlStatus(path, okState);
    _applyStatusEl(statusEl, okState);
  } catch (err) {
    responseMeta.textContent = 'Request failed';
    responseBox.textContent = err.message;
    const ts = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const errState = { ok: false, ts, count: (getQlStatus(path)?.count || 0) + 1, msg: err.message };
    setQlStatus(path, errState);
    _applyStatusEl(statusEl, errState);
  }
};


/* ── Clean Section Gap ── */

/* ── NAVIGATION SYSTEM (BULLETPROOF) ───────────────── */
/* ── NAVIGATION SYSTEM (BULLETPROOF) ───────────────── */
const initNavigation = () => {
  // Always start with current hash or Overview
  const initialHash = window.location.hash.substring(1) || 'section-overview';
  if (window.showSection) window.showSection(initialHash);

  // Global Click Delegate
  document.body.addEventListener('click', (e) => {
    const link = e.target.closest('.nav-link, .nav-link-sub');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#')) return;

    e.preventDefault();
    const sectionId = href.substring(1);
    if (window.showSection) window.showSection(sectionId);
    history.pushState(null, null, href);

    // Close any open dropdowns immediately
    document.querySelectorAll('.nav-dropdown').forEach(d => {
       d.style.display = 'none';
       setTimeout(() => d.style.removeProperty('display'), 500);
    });
  });
};

window.showSection = (sectionId) => {
    const sections = document.querySelectorAll('.content-section');
    const target = document.getElementById(sectionId);
    
    if (!target) {
        console.warn(`SECTION NOT FOUND: ${sectionId}`);
        return;
    }

    // Strict UI Locking
    sections.forEach(sec => {
        sec.style.cssText = 'display: none !important; opacity: 0;';
    });

    target.style.display = 'block';
    target.style.setProperty('display', 'block', 'important');
    
    setTimeout(() => {
        target.style.opacity = '1';
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);

    // Active Tab Styling
    document.querySelectorAll('.nav-link, .nav-link-sub').forEach(l => {
        l.classList.toggle('active', l.getAttribute('href') === `#${sectionId}`);
    });

    if (sectionId === 'section-discovery' && typeof renderNodeMap === 'function') {
        renderNodeMap();
    }
};

/* ══════════════════════════════════════════════════════════════
   BOOT
   ══════════════════════════════════════════════════════════ */
const boot = async () => {
  // initNavigation(); - Consolidated into initNavigationEvents
  await loadDashboardData();

  attachExamplesToCards();
  attachEndpointCopyButtons();
  renderQuickLinks();
  initTesterPresets();
  initTiltEffect();

  if (copyPlaygroundResponse) {
    copyPlaygroundResponse.addEventListener('click', () => {
      copyText(responseBox.textContent || '', copyPlaygroundResponse);
    });
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  /* ── Manageria Admin Listeners ─────────────────────────── */
  const adminAuthBtn = document.getElementById('adminAuthBtn');
  const loginForm = document.getElementById('loginForm');
  const closeLoginModal = document.getElementById('closeLoginModal');

  if (adminAuthBtn) {
    adminAuthBtn.addEventListener('click', (e) => {
      e.preventDefault();
      adminToken ? logoutAdmin() : showLoginModal();
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const pass = document.getElementById('loginPass').value;
      const success = await loginAdmin(email, pass);
      if (success) {
        // Switch to the first admin section after login
        window.location.hash = '#section-intelligence';
      }
    });
  }

  if (closeLoginModal) {
    closeLoginModal.addEventListener('click', hideLoginModal);
  }

  const signupHeaderBtn = document.getElementById('adminSignupHeaderBtn');
  if (signupHeaderBtn) {
    signupHeaderBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showLoginModal();
      document.getElementById('tabSignup').click();
    });
  }

  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value;
      const email = document.getElementById('regEmail').value;
      const pass = document.getElementById('regPass').value;
      await registerAdmin(email, pass, name);
    });
  }

  // Initial Admin UI Check (Strict)
  if (!adminToken) {
    updateAdminUI(false);
  } else {
    // If token exists, verify UI state
    updateAdminUI(true);
    refreshAdminData();
  }


  // ── CSP Compliance (Button Listeners) ──────────
  const btnTele = document.getElementById('btn-initiate-telemetry');
  if (btnTele) btnTele.addEventListener('click', () => { window.location.hash = '#section-discovery'; });

  const btnScan = document.getElementById('btn-initiate-scan');
  if (btnScan) btnScan.addEventListener('click', () => { alert('Initiating Neural Scan...'); });

  // ── Event Safety Checks ───────────────────────
  if (searchInput) searchInput.addEventListener('input', filterCards);
  if (playgroundForm) playgroundForm.addEventListener('submit', runPlayground);
  // Filter bubbles handle their own click events to load insights instantly

  await loadStatus();
  await loadActivity();
  await loadContentStats();
  await loadMangaExplorer();
  try {
    await loadDataInsights();
  } catch {
    // Keep boot flow alive even when insights payload is malformed.
  }

  setInterval(loadStatus, 9000);
  setInterval(loadActivity, 3000);
  setInterval(loadContentStats, 30000);
  setInterval(loadDataInsights, 45000);
  
  // Admin Polling
  setInterval(() => {
    if (adminToken) {
      const activeSection = window.location.hash.replace('#', '');
      if (activeSection === 'section-operations') loadOperationsData();
      if (activeSection === 'section-intelligence') loadIntelligenceData();
    }
  }, 10000);

  // New App Button
  const createAppBtn = document.getElementById('createNewAppBtn');
  if (createAppBtn) createAppBtn.addEventListener('click', createNewApp);
};

boot();
/* ── Strategic API Monitor Logic ───────────────────────── */
/**
 * Initializing the Technical API Monitor section
 */
function initDiscovery() {
  renderDiscoveryCarousel();
  renderScraperLogs();
  renderEndpointMonitor();
  renderNodeMap();
}

function renderDiscoveryCarousel() {
  const track = document.getElementById('carouselTrack');
  if (!track) return;

  const metrics = [
    { label: "SYSTEM UPTIME", value: "99.98%", sub: "Last 30 Days", color: "#10B981" },
    { label: "AVG LATENCY", value: "142ms", sub: "Global Average", color: "#3B82F6" },
    { label: "TOTAL REQUESTS", value: "4.2M", sub: "Last 24 Hours", color: "#FFDA00" }
  ];

  track.innerHTML = metrics.map(m => `
    <div class="carousel-slide" style="flex-direction: column; align-items: center; justify-content: center; text-align: center;">
      <div style="font-size: 0.75rem; font-weight: 900; letter-spacing: 0.2em; color: rgba(255,255,255,0.6); margin-bottom: 15px;">${m.label}</div>
      <div style="font-size: 5rem; font-weight: 900; line-height: 1; color: ${m.color}; text-shadow: 4px 4px 0px #000;">${m.value}</div>
      <div style="font-size: 1rem; font-weight: 700; color: #FFF; margin-top: 10px;">${m.sub}</div>
    </div>
  `).join('');

  let currentIdx = 0;
  setInterval(() => {
    currentIdx = (currentIdx + 1) % metrics.length;
    track.style.transform = `translateX(-${currentIdx * 100}%)`;
  }, 5000);
}

function renderScraperLogs() {
  const logContainer = document.getElementById('scraperLog');
  if (!logContainer) return;

  const logs = [
    "Scraper-Node-1: Fetching manga metadata from Komiku.id...",
    "Scraper-Node-2: Connection established to HiAnime secure gateway.",
    "Bilibili-Adapter: Parsing JSON schema for 'Donghua Seasonal'...",
    "Cache-Manager: 1.2k entries flushed to Redis successfully.",
    "Load-Balancer: Shifting traffic from node-03 to node-04 (High Latency Detected).",
    "Internal-Audit: Scanning database for corrupt poster URLs...",
    "Audit-Brain: Neural summary generated for 'Solo Leveling' (v2.1.0).",
    "API-Gateway: Token validation successful for client 'Audira-Web-v4'."
  ];

  let i = 0;
  setInterval(() => {
    const line = document.createElement('div');
    line.className = 'log-line';
    line.textContent = `[${new Date().toLocaleTimeString()}] ${logs[i]}`;
    logContainer.appendChild(line);
    logContainer.scrollTop = logContainer.scrollHeight;
    i = (i + 1) % logs.length;
    if (logContainer.childNodes.length > 50) logContainer.removeChild(logContainer.firstChild);
  }, 2500);
}

function renderEndpointMonitor() {
  const container = document.getElementById('endpointMonitor');
  if (!container) return;

  const endpoints = [
    { name: "/mangaDiscovery", load: 85, latency: 120 },
    { name: "/animeStream", load: 60, latency: 240 },
    { name: "/donghuaList", load: 45, latency: 180 },
    { name: "/searchNeural", load: 95, latency: 450 },
    { name: "/authSession", load: 20, latency: 45 }
  ];

  container.innerHTML = endpoints.map(e => `
    <div class="latency-item">
      <div style="font-size: 0.75rem; font-weight: 800; min-width: 120px;">${e.name}</div>
      <div class="latency-bar-wrap">
        <div class="latency-bar" style="width: ${e.load}%"></div>
      </div>
      <div style="font-size: 0.7rem; font-weight: 900;">${e.latency}ms</div>
    </div>
  `).join('');
}

function renderNodeMap() {
  const container = document.getElementById('nodeMapGrid');
  if (!container) return;

  const nodes = [
    { id: "NODE-SG-01", type: "SCRAPER", load: "High", uptime: "14d", status: "online" },
    { id: "NODE-US-04", type: "API-GW", load: "Optimal", uptime: "42d", status: "online" },
    { id: "NODE-ID-158", type: "STRAT-OPS", load: "Active", uptime: "2d", status: "online" },
    { id: "NODE-JP-02", type: "DB-SHARD", load: "Low", uptime: "128d", status: "online", state: "warning" }
  ];

  container.innerHTML = nodes.map(n => `
    <div class="node-card ${n.state || ''} animate-in">
      <div class="node-header">
        <span class="node-id">${n.id}</span>
        <span class="badge badge-blue" style="font-size: 0.55rem;">${n.type}</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span class="node-load">Load: <b style="color: #000;">${n.load}</b></span>
        <span style="font-size: 0.65rem; color: var(--text-muted);">UP: ${n.uptime}</span>
      </div>
      <div class="node-actions">
        <button class="action-btn-mini" data-node-action="restart" data-node-id="${n.id}">🔄 RESTART</button>
        <button class="action-btn-mini" data-node-action="flush" data-node-id="${n.id}">🧹 FLUSH</button>
        <button class="action-btn-mini" data-node-action="stop" data-node-id="${n.id}">⏹ STOP</button>
        <button class="action-btn-mini" data-node-action="inspect" data-node-id="${n.id}">🔍 INSPECT</button>
      </div>
    </div>
  `).join('');

  // Delegation for Node Actions to avoid CSP issues
  container.onclick = (e) => {
    const btn = e.target.closest('[data-node-action]');
    if (!btn) return;
    const action = btn.dataset.nodeAction;
    const id = btn.dataset.nodeId;
    if (action === 'restart') tech_restartNode(id);
    if (action === 'flush') tech_flushNodeCache(id);
    if (action === 'stop') tech_toggleNode(id);
    if (action === 'inspect') tech_inspectNode(id);
  };
}

// ── ORCHESTRATION HANDLERS ──────────────────────────────

window.tech_restartNode = (id) => {
  addLog(`Initiating cold reboot sequence for ${id}...`);
  setTimeout(() => addLog(`${id} rebooting. Signal sent to Docker-Daemon.`), 800);
  setTimeout(() => addLog(`${id} is back online. Re-joining cluster.`), 3000);
};

window.tech_flushNodeCache = (id) => {
  addLog(`Flushing L1/L2 cache for ${id}...`);
  setTimeout(() => addLog(`${id} cache cleared. Re-indexing metadata...`), 1200);
};

window.tech_toggleNode = (id) => {
  addLog(`Toggle command sent to ${id}. Changing state...`);
};

window.tech_inspectNode = (id) => {
  addLog(`Fetching deep-inspect telemetry for ${id}...`);
  setTimeout(() => addLog(`[INSPECT] ${id}: Memory 4.2GB/8GB, CPU 12%, Redis-Conn: Healthy`), 1000);
};

window.tech_flushAllCache = () => {
  if(!confirm("ARE YOU SURE? This will flush the entire Global Redis Cache Cluster.")) return;
  addLog(">>> GLOBAL CACHE FLUSH INITIATED <<<");
  setTimeout(() => addLog("Clearing 12,450 keys from Redis-Main..."), 500);
  setTimeout(() => addLog("Global cache cleared. Platform indexing will re-populate upon next request."), 2000);
};

window.tech_restartAllNodes = () => {
  if(!confirm("DANGER: This will reboot the entire Audira Cluster. Service downtime expected.")) return;
  addLog("CRITICAL: Executing CLUSTER REBOOT...");
  setTimeout(() => addLog("Node-SG-01: Offline"), 500);
  setTimeout(() => addLog("Node-US-04: Offline"), 700);
  setTimeout(() => addLog("All nodes offline. Restarting services..."), 2000);
  setTimeout(() => {
    addLog("Cluster operational. Health: 100%");
    initDiscovery();
  }, 5000);
};

function addLog(msg) {
  const logContainer = document.getElementById('scraperLog');
  if (!logContainer) return;
  const line = document.createElement('div');
  line.className = 'log-line';
  line.textContent = `[CMD] ${msg}`;
  logContainer.appendChild(line);
  logContainer.scrollTop = logContainer.scrollHeight;
}

// ── GLOBAL OPS LISTENERS ──────────────────────────────
setTimeout(() => {
  const flushAll = document.getElementById('btnFlushAll');
  const rebootAll = document.getElementById('btnRebootCluster');
  if (flushAll) flushAll.onclick = tech_flushAllCache;
  if (rebootAll) rebootAll.onclick = tech_restartAllNodes;
}, 1000);

// Start API Monitoring & Navigation
// ── ELITE FEATURES: COMMAND PALETTE & TELEMETRY ──────────
const palette = document.getElementById('commandPalette');
const paletteSearch = document.getElementById('paletteSearch');
const hudLogBody = document.getElementById('hudLogBody');

// Command Palette Logic
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    if (palette) {
      palette.style.display = 'flex';
      paletteSearch.focus();
    }
  }
  if (e.key === 'Escape') {
    if (palette) palette.style.display = 'none';
  }
});

// Mock Telemetry Stream
const mockLogs = [
  "[NET] Scraper Node JP-01 responding (latency: 18ms)",
  "[DB] Cache Hit: MANGA_ID_29401",
  "[SEC] API Key 'PARTNER_ELITE' authenticated",
  "[SYS] Memory Cleanup: 42MB freed",
  "[IO] Writing snapshot to disk...",
  "[NET] Scraper Node US-04 sync complete",
  "[SYNC] 12 new anime titles indexed",
  "[WARN] High latency detected on Node-SEA-03"
];

const COMMANDS = [
  { icon: '🏠', label: 'Go to Overview', action: () => window.showSection('section-overview') },
  { icon: '📡', label: 'Go to Discovery', action: () => window.showSection('section-discovery') },
  { icon: '🧠', label: 'Go to Intelligence', action: () => window.showSection('section-intelligence') },
  { icon: '⚙️', label: 'Go to Operations', action: () => window.showSection('section-operations') },
  { icon: '🛡️', label: 'Go to Registry', action: () => window.showSection('section-registry') },
  { icon: '⚙️', label: 'Go to Sources', action: () => window.showSection('section-sources') },
  { icon: '👤', label: 'Go to User Management', action: () => window.showSection('section-users') },
  { icon: '✨', label: 'Go to Curation', action: () => window.showSection('section-curation') },
  { icon: '🌙', label: 'Toggle Dark Mode', action: () => toggleTheme() },
  { icon: '🔄', label: 'Refresh Data', action: () => { loadStatus(); loadActivity(); fetchSources(); fetchUsers(); fetchCuration(); showToast('Manual Sync Triggered', 'info'); } },
  { icon: '🚪', label: 'Logout Admin', action: () => logoutAdmin() }
];

const renderPalette = (filter = '') => {
  const results = document.getElementById('paletteResults');
  if (!results) return;

  const filtered = COMMANDS.filter(c => c.label.toLowerCase().includes(filter.toLowerCase()));
  results.innerHTML = filtered.map((c, i) => `
    <div class="palette-item" data-idx="${i}">
      <span class="palette-icon">${c.icon}</span>
      <span class="palette-label">${c.label}</span>
      <span class="palette-shortcut">↵</span>
    </div>
  `).join('');

  results.querySelectorAll('.palette-item').forEach(item => {
    item.onclick = () => {
      const cmd = filtered[item.dataset.idx];
      cmd.action();
      if (palette) palette.style.display = 'none';
    };
  });
};

if (paletteSearch) {
  paletteSearch.addEventListener('input', (e) => renderPalette(e.target.value));
  paletteSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = document.querySelector('.palette-item');
      if (first) first.click();
    }
  });
}

// Initialize Palette
renderPalette();


initNavigation();
initDiscovery();

// --- Profile Dropdown Toggle Logic ---
document.addEventListener('DOMContentLoaded', () => {
  const profileTrigger = document.getElementById('adminProfileInfo');
  const dropdownMenu = document.getElementById('profileDropdown');
  const logoutBtn = document.getElementById('headerLogoutBtn');

  if (profileTrigger && dropdownMenu) {
    profileTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('active');
    });

    document.addEventListener('click', () => {
      dropdownMenu.classList.remove('active');
    });

    dropdownMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logoutAdmin();
    });
  }

  // Auto-fetch sources if admin is already logged in
  if (adminToken) {
    fetchSources();
    fetchUsers();
  }
});

/* ── Source Manager Engine ────────────────────────────────── */
const sourceTableBody = document.getElementById('sourceTableBody');
const sourceForm = document.getElementById('sourceForm');
const sourceModal = document.getElementById('sourceModal');
const btnAddSource = document.getElementById('btn-add-source');

const fetchSources = async () => {
  if (!adminToken) return;
  try {
    const res = await adminFetch('/sources');
    if (res.success) renderSources(res.data);
  } catch (err) {
    console.error('Failed to fetch sources:', err);
  }
};

const renderSources = (sources) => {
  if (!sourceTableBody) return;
  sourceTableBody.innerHTML = sources.map(source => `
    <tr>
      <td>
        <div style="font-weight: 700;">${source.name}</div>
        <div style="font-size: 0.65rem; color: var(--text-muted); font-family: monospace;">${source.key}</div>
      </td>
      <td><a href="${source.baseUrl}" target="_blank" style="color: var(--accent); font-size: 0.8rem;">${source.baseUrl}</a></td>
      <td><span class="badge badge-blue">${source.category}</span></td>
      <td><span class="badge-label">${source.defaultType}</span></td>
      <td>
        <span class="status-pill ${source.enabled ? 'online' : 'offline'}" data-action="toggle" data-id="${source._id}" style="cursor: pointer;">
          ${source.enabled ? 'ACTIVE' : 'DISABLED'}
        </span>
      </td>
      <td>
        <div style="display: flex; gap: 8px;">
          <button class="btn-action" data-action="edit" data-id="${source._id}" title="Edit">✏️</button>
          <button class="btn-action" data-action="delete" data-id="${source._id}" title="Delete" style="color: #EF4444;">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
};

window.toggleSourceStatus = async (id) => {
  try {
    const res = await adminFetch(`/sources/${id}/toggle`, { method: 'PATCH' });
    if (res.success) {
      showToast(res.message, 'success');
      fetchSources();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.editSource = async (id) => {
  try {
    const res = await adminFetch(`/sources/${id}`);
    if (res.success) {
      const s = res.data;
      document.getElementById('sourceId').value = s._id;
      document.getElementById('sourceKey').value = s.key;
      document.getElementById('sourceName').value = s.name;
      document.getElementById('sourceBaseUrl').value = s.baseUrl;
      document.getElementById('sourceCategory').value = s.category;
      document.getElementById('sourceDefaultType').value = s.defaultType;
      document.getElementById('sourcePriority').value = s.priority;
      document.getElementById('sourceStrategy').value = s.syncStrategy;
      
      sourceModal.style.display = 'flex';
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.deleteSource = async (id) => {
  if (!confirm('Are you sure you want to delete this source node?')) return;
  try {
    const res = await adminFetch(`/sources/${id}`, { method: 'DELETE' });
    if (res.success) {
      showToast('Source node de-registered.', 'success');
      fetchSources();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
};

if (btnAddSource) {
  btnAddSource.addEventListener('click', () => {
    sourceForm.reset();
    document.getElementById('sourceId').value = '';
    sourceModal.style.display = 'flex';
  });
}

const btnCloseSourceModal = document.getElementById('btn-close-source-modal');
if (btnCloseSourceModal) {
  btnCloseSourceModal.addEventListener('click', () => {
    sourceModal.style.display = 'none';
  });
}

// Event Delegation for Source Table
if (sourceTableBody) {
  sourceTableBody.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    
    const action = target.dataset.action;
    const id = target.dataset.id;
    
    if (action === 'toggle') toggleSourceStatus(id);
    if (action === 'edit') editSource(id);
    if (action === 'delete') deleteSource(id);
  });
}

if (sourceForm) {
  sourceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('sourceId').value;
    const payload = {
      key: document.getElementById('sourceKey').value,
      name: document.getElementById('sourceName').value,
      baseUrl: document.getElementById('sourceBaseUrl').value,
      category: document.getElementById('sourceCategory').value,
      defaultType: document.getElementById('sourceDefaultType').value,
      priority: parseInt(document.getElementById('sourcePriority').value, 10),
      syncStrategy: document.getElementById('sourceStrategy').value,
    };

    try {
      const method = id ? 'PUT' : 'POST';
      const url = id ? `/sources/${id}` : '/sources';
      const res = await adminFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.success) {
        showToast(id ? 'Configuration Updated' : 'New Source Registered', 'success');
        sourceModal.style.display = 'none';
        fetchSources();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

/* ── User Manager Engine ──────────────────────────────────── */
const userTableBody = document.getElementById('userTableBody');
const userSearchInput = document.getElementById('userSearch');

const fetchUsers = async (query = '') => {
  if (!adminToken) return;
  try {
    const res = await adminFetch(`/admin/users?search=${query}`);
    if (res.success) renderUsers(res.data);
  } catch (err) {
    console.error('Failed to fetch users:', err);
  }
};

const renderUsers = (users) => {
  if (!userTableBody) return;
  userTableBody.innerHTML = users.map(user => `
    <tr>
      <td>
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="user-avatar-mini" style="width: 32px; height: 32px; border-radius: 50%; background: var(--accent); color: #000; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.7rem;">
            ${(user.username || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style="font-weight: 700;">${user.username}</div>
            <div style="font-size: 0.65rem; color: var(--text-muted);">ID: ${user._id}</div>
          </div>
        </div>
      </td>
      <td style="font-size: 0.8rem;">${user.email}</td>
      <td style="font-size: 0.8rem; color: var(--text-muted);">${new Date(user.createdAt).toLocaleDateString()}</td>
      <td>
        <select class="role-selector" data-id="${user._id}" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: var(--text); border-radius: 4px; padding: 2px 6px; font-size: 0.75rem;">
          <option value="user" ${user.role === 'user' ? 'selected' : ''}>USER</option>
          <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>ADMIN</option>
        </select>
      </td>
      <td>
        <button class="btn-action" data-action="delete-user" data-id="${user._id}" style="color: #EF4444;" title="Delete User">🗑️</button>
      </td>
    </tr>
  `).join('');
};

if (userSearchInput) {
  let debounceTimer;
  userSearchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fetchUsers(e.target.value), 500);
  });
}

// Event Delegation for User Management
document.addEventListener('change', async (e) => {
  if (e.target.classList.contains('role-selector')) {
    const userId = e.target.dataset.id;
    const role = e.target.value;
    try {
      const res = await adminFetch(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      if (res.success) showToast(`Role updated to ${role}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
      fetchUsers(); // Revert UI
    }
  }
});

document.addEventListener('click', async (e) => {
  const deleteBtn = e.target.closest('[data-action="delete-user"]');
  if (deleteBtn) {
    const userId = deleteBtn.dataset.id;
    if (!confirm('Are you sure you want to PERMANENTLY delete this user?')) return;
    try {
      const res = await adminFetch(`/admin/users/${userId}`, { method: 'DELETE' });
      if (res.success) {
        showToast('User deleted', 'success');
        fetchUsers();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
});

// ── CURATION & SPOTLIGHT MANAGER ─────────────────────────────
async function fetchCuration() {
  try {
    const res = await adminFetch('/api/v1/curation');
    if (res.success) {
      renderCuration(res.data);
    }
  } catch (err) {
    showToast('Failed to fetch curation data', 'error');
  }
}

function renderCuration(data) {
  const featuredBody = document.getElementById('featuredTableBody');
  const hotBody = document.getElementById('hotTableBody');

  if (!featuredBody || !hotBody) return;

  featuredBody.innerHTML = data.featured.length ? data.featured.map(item => `
    <tr>
      <td>
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${item.coverImage}" style="width: 32px; height: 44px; object-fit: cover; border-radius: 4px; border: 1px solid #000;">
          <strong>${item.title}</strong>
        </div>
      </td>
      <td><span class="status-pill">${item.type}</span></td>
      <td>
        <button class="action-btn" data-action="toggle-featured" data-id="${item._id}" title="Remove from Featured">❌</button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="3" class="empty-state">No featured content</td></tr>';

  hotBody.innerHTML = data.hot.length ? data.hot.map(item => `
    <tr>
      <td><strong>${item.title}</strong></td>
      <td>${item.views.toLocaleString()}</td>
      <td>
        <button class="action-btn" data-action="toggle-hot" data-id="${item._id}" title="Remove from Hot">🔥</button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="3" class="empty-state">No hot content</td></tr>';
}

async function toggleFeatured(id) {
  try {
    const res = await adminFetch(`/api/v1/curation/${id}/feature`, { method: 'POST' });
    if (res.success) {
      showToast(res.message, 'success');
      fetchCuration();
    }
  } catch (err) {
    showToast('Failed to toggle featured status', 'error');
  }
}

async function toggleHot(id) {
  try {
    const res = await adminFetch(`/api/v1/curation/${id}/hot`, { method: 'POST' });
    if (res.success) {
      showToast(res.message, 'success');
      fetchCuration();
    }
  } catch (err) {
    showToast('Failed to toggle hot status', 'error');
  }
}

// Event Delegation for Curation Actions
document.addEventListener('click', (e) => {
  const featuredBtn = e.target.closest('[data-action="toggle-featured"]');
  const hotBtn = e.target.closest('[data-action="toggle-hot"]');
  const refreshBtn = e.target.closest('#refreshCurationBtn');

  if (featuredBtn) toggleFeatured(featuredBtn.dataset.id);
  if (hotBtn) toggleHot(hotBtn.dataset.id);
  if (refreshBtn) fetchCuration();
});

// Attach to window for global access
window.fetchCuration = fetchCuration;
window.toggleFeatured = toggleFeatured;
window.toggleHot = toggleHot;

// ── MANGA CRUD LOGIC ──────────────────────────────────────────
const mangaModal = document.getElementById('mangaModal');
const mangaForm = document.getElementById('mangaForm');
const closeMangaModalBtn = document.getElementById('closeMangaModal');
const cancelMangaBtn = document.getElementById('cancelMangaBtn');
const mangaAddBtn = document.getElementById('mangaAddBtn');

function openMangaModal(item = null) {
  if (!mangaModal || !mangaForm) return;
  
  const titleEl = document.getElementById('mangaModalTitle');
  const idInput = document.getElementById('mangaId');
  const titleInput = document.getElementById('mangaTitle');
  const typeInput = document.getElementById('mangaType');
  const statusInput = document.getElementById('mangaStatus');
  const coverInput = document.getElementById('mangaCover');
  const descInput = document.getElementById('mangaDescription');

  if (item) {
    titleEl.textContent = 'Edit Series';
    idInput.value = item._id;
    titleInput.value = item.title || '';
    typeInput.value = item.type || 'manga';
    statusInput.value = item.status || 'ongoing';
    coverInput.value = item.coverImage || '';
    descInput.value = item.description || '';
  } else {
    titleEl.textContent = 'Add New Series';
    mangaForm.reset();
    idInput.value = '';
  }

  mangaModal.style.display = 'flex';
}

if (mangaAddBtn) mangaAddBtn.onclick = () => openMangaModal();
if (closeMangaModalBtn) closeMangaModalBtn.onclick = () => mangaModal.style.display = 'none';
if (cancelMangaBtn) cancelMangaBtn.onclick = () => mangaModal.style.display = 'none';

if (mangaForm) {
  mangaForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('mangaId').value;
    const payload = {
      title: document.getElementById('mangaTitle').value,
      type: document.getElementById('mangaType').value,
      status: document.getElementById('mangaStatus').value,
      coverImage: document.getElementById('mangaCover').value,
      description: document.getElementById('mangaDescription').value,
    };

    try {
      const url = id ? `/api/v1/mangas/${id}` : '/api/v1/mangas';
      const method = id ? 'PUT' : 'POST';
      const res = await adminFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.success) {
        showToast(id ? 'Manga updated' : 'Manga created', 'success');
        mangaModal.style.display = 'none';
        loadMangaExplorer();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
// ── NEURAL SCAN & INTELLIGENCE LOGIC ─────────────────────────
const neuralScanBtn = document.getElementById('neuralScanBtn');
const liveLogTerminal = document.getElementById('liveLogTerminal');

const NEURAL_LOGS = [
  "UPLINK STABLE: NODE_JP_02 (18ms)",
  "SYNCHRONIZING REPLICA_SET_B...",
  "THREAT DETECTION: 0 MALICIOUS PAYLOADS",
  "METRIC_SENT: CLIENT_USAGE_DASHBOARD",
  "CACHE_HIT: MANGA_EXPLORER_V2 (98%)",
  "NODE_SYNC: 142 TITLES INDEXED FROM OTAKUDESU",
  "SECURITY_SCAN: JWT_INTEGRITY_OK",
  "OPTIMIZING QUERY_PLAN: SEARCH_AGGREGATOR"
];

function addNeuralLog(msg, type = '') {
  if (!liveLogTerminal) return;
  const line = document.createElement('div');
  line.className = `terminal-line ${type}`;
  line.textContent = `> ${msg}`;
  liveLogTerminal.appendChild(line);
  liveLogTerminal.scrollTop = liveLogTerminal.scrollHeight;
  
  // Keep logs short
  if (liveLogTerminal.children.length > 20) {
    liveLogTerminal.children[0].remove();
  }
}

function startNeuralScan() {
  if (neuralScanBtn.classList.contains('scanning')) return;
  
  neuralScanBtn.classList.add('scanning');
  neuralScanBtn.querySelector('.label').textContent = '🌀 SCANNING...';
  
  showToast('Initiating Neural Scan across global nodes...', 'info');
  
  let i = 0;
  const interval = setInterval(() => {
    addNeuralLog(NEURAL_LOGS[Math.floor(Math.random() * NEURAL_LOGS.length)]);
    i++;
    if (i > 8) {
      clearInterval(interval);
      neuralScanBtn.classList.remove('scanning');
      neuralScanBtn.querySelector('.label').textContent = '📡 NEURAL SCAN';
      showToast('Neural Scan Complete. Network Integrity Verified.', 'success');
      loadIntelligenceData();
    }
  }, 400);
}

if (neuralScanBtn) {
  neuralScanBtn.onclick = startNeuralScan;
}

// Auto-populate logs periodically
setInterval(() => {
  if (!document.hidden && document.getElementById('section-intelligence').style.display === 'block') {
    addNeuralLog(NEURAL_LOGS[Math.floor(Math.random() * NEURAL_LOGS.length)]);
  }
}, 5000);
  };
}

async function deleteManga(id) {
  if (!confirm('Are you sure you want to delete this title? This action cannot be undone.')) return;
  try {
    const res = await adminFetch(`/api/v1/mangas/${id}`, { method: 'DELETE' });
    if (res.success) {
      showToast('Title deleted', 'success');
      loadMangaExplorer();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}


// --- Manga Contextual Intelligence ---
const initMangaContext = () => {
  const mangaLogEl = document.getElementById('mangaScraperLog');
  if (!mangaLogEl) return;

  const mangaLogs = [
    '> FETCHING: [comick.app] -> 20 new chapters found',
    '> SYNC: [mangadex.org] -> Metadata updated for 12 titles',
    '> CACHE: Refreshing Redis nodes for [MangaIndex]',
    '> ANALYZING: [komikindo.id] -> Search relevance score: 0.98',
    '> ALERT: Scraper Node #07 experienced 50ms jitter',
    '> SUCCESS: Global Manga Matrix Synchronized'
  ];

  let logIndex = 0;
  setInterval(() => {
    const line = document.createElement('div');
    line.className = 'log-line';
    line.textContent = mangaLogs[logIndex % mangaLogs.length];
    mangaLogEl.appendChild(line);
    mangaLogEl.scrollTop = mangaLogEl.scrollHeight;
    logIndex++;

    if (mangaLogEl.children.length > 50) {
      mangaLogEl.removeChild(mangaLogEl.firstChild);
    }
  }, 4000);
};

// --- Anime Contextual Intelligence ---
const initAnimeContext = () => {
  const animeLogEl = document.getElementById('animeScraperLog');
  if (!animeLogEl) return;

  const animeLogs = [
    '> STREAM_SCAN: [hianime.to] -> New sub/dub episodes found',
    '> METADATA: [animepahe.com] -> Synced seasonal schedule',
    '> RESOLVING: [GogoServer] -> Uplink quality 1080p verified',
    '> PROXY: Distributing [cover_images] to sentinel nodes',
    '> SYSTEM: Anime Neural Resolver updated to v2.4.2',
    '> BROADCAST: Global Anime Uplink Active'
  ];

  let logIndex = 0;
  setInterval(() => {
    const line = document.createElement('div');
    line.className = 'log-line';
    line.textContent = animeLogs[logIndex % animeLogs.length];
    animeLogEl.appendChild(line);
    animeLogEl.scrollTop = animeLogEl.scrollHeight;
    logIndex++;

    if (animeLogEl.children.length > 50) {
      animeLogEl.removeChild(animeLogEl.firstChild);
    }
  }, 4500);
};

// --- Donghua Contextual Intelligence ---
const initDonghuaContext = () => {
  const donghuaLogEl = document.getElementById('donghuaScraperLog');
  if (!donghuaLogEl) return;

  const donghuaLogs = [
    '> CULTIVATION: [anichin.vip] -> Spiritual energy (data) levels 100%',
    '> SYNC: [donghuastream.org] -> Metadata for 8 series updated',
    '> DECRYPTION: Resolving Eastern [AES_Stream_Keys]',
    '> INDEXING: [lucianime.com] -> 5 new ONA episodes indexed',
    '> SENTINEL: Donghua persistence node healthy',
    '> TRIUMPH: Eastern Domain Matrix Synchronized'
  ];

  let logIndex = 0;
  setInterval(() => {
    const line = document.createElement('div');
    line.className = 'log-line';
    line.textContent = donghuaLogs[logIndex % donghuaLogs.length];
    donghuaLogEl.appendChild(line);
    donghuaLogEl.scrollTop = donghuaLogEl.scrollHeight;
    logIndex++;

    if (donghuaLogEl.children.length > 50) {
      donghuaLogEl.removeChild(donghuaLogEl.firstChild);
    }
  }, 5000);
};

// Initialize context on page load
document.addEventListener('DOMContentLoaded', () => {
  initMangaContext();
  initAnimeContext();
  initDonghuaContext();
});

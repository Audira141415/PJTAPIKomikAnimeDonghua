const API_BASE = '/api/v1';
const FALLBACK_DATA_PATH = '/data/dashboard-fallback.json';

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
const carouselCategory = document.getElementById('carouselCategory');

let dashboardData = defaultDashboardData;
let carouselSlides = [];
let carouselIndex = 0;
let carouselTimer = null;

const copyText = async (text, buttonEl) => {
  try {
    await navigator.clipboard.writeText(text);
    const prev = buttonEl.textContent;
    buttonEl.textContent = 'Copied';
    setTimeout(() => {
      buttonEl.textContent = prev;
    }, 1000);
  } catch {
    buttonEl.textContent = 'Copy Failed';
    setTimeout(() => {
      buttonEl.textContent = 'Copy';
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

const formatStatusClass = (connected, state) => {
  if (connected) return 'ok';
  if (state === 'connecting' || state === 'initializing') return 'warn';
  return 'down';
};

const setHealthItem = (dotEl, textEl, label, connected, state) => {
  const statusClass = formatStatusClass(connected, state);
  dotEl.className = `health-dot ${statusClass}`;
  textEl.textContent = `${label}: ${connected ? 'Connected' : state}`;
};

const renderStatus = (payload) => {
  const info = payload?.data;
  if (!info) return;

  setHealthItem(stateEls.serverDot, stateEls.serverText, 'Server', true, 'running');
  setHealthItem(stateEls.mongoDot, stateEls.mongoText, 'MongoDB', info.database.connected, info.database.state);
  setHealthItem(stateEls.redisDot, stateEls.redisText, 'Redis', info.cache.connected, info.cache.state);

  stateEls.uptime.textContent = `${Math.floor(info.server.uptimeSeconds / 60)} min`;
  stateEls.mem.textContent = `${info.system.memory.usedMb} MB / ${info.system.memory.totalMb} MB`;

  const dbOnline = info.database.connected;
  stateEls.dbBanner.classList.toggle('hidden', dbOnline);
  carouselRoot.classList.toggle('hidden', dbOnline);
};

const loadStatus = async () => {
  try {
    const res = await fetch('/dashboard/status');
    const data = await res.json();
    renderStatus(data);
  } catch {
    setHealthItem(stateEls.serverDot, stateEls.serverText, 'Server', false, 'unreachable');
    setHealthItem(stateEls.mongoDot, stateEls.mongoText, 'MongoDB', false, 'unreachable');
    setHealthItem(stateEls.redisDot, stateEls.redisText, 'Redis', false, 'unreachable');
  }
};

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
    timeCell.textContent = new Date(item.timestamp).toLocaleTimeString();

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
    if (endpointEl.querySelector('.endpoint-copy-btn')) return; // Already added

    const method = endpointEl.querySelector('.method')?.textContent?.trim() || 'GET';
    const rawPath = endpointEl.textContent.replace(method, '').trim();
    if (!rawPath.startsWith('/')) return;

    // Create wrapper container to hold endpoint and copy button side-by-side
    const wrapper = document.createElement('div');
    wrapper.className = 'endpoint-wrapper';
    
    // Clone endpoint to move it
    const newEndpoint = endpointEl.cloneNode(true);
    endpointEl.replaceWith(wrapper);
    
    // Create copy button
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'copy-btn endpoint-copy-btn';
    copyBtn.textContent = 'Copy URL';
    copyBtn.title = `Copy: ${method} http://localhost:5000${rawPath}`;
    
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const fullUrl = `${method} http://localhost:5000${rawPath}`;
      copyText(fullUrl, copyBtn);
    });
    
    // Add endpoint and button to wrapper
    wrapper.appendChild(newEndpoint);
    wrapper.appendChild(copyBtn);
  });
};

const updateCarousel = () => {
  carouselTrack.style.transform = `translateX(-${carouselIndex * 100}%)`;
  carouselDots.querySelectorAll('.dot').forEach((dot, idx) => {
    dot.classList.toggle('active', idx === carouselIndex);
  });
};

const startCarousel = () => {
  if (carouselSlides.length <= 1) return;
  if (carouselTimer) clearInterval(carouselTimer);
  carouselTimer = setInterval(() => {
    carouselIndex = (carouselIndex + 1) % carouselSlides.length;
    updateCarousel();
  }, 4500);
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
  } catch (err) {
    responseMeta.textContent = 'Request failed';
    responseBox.textContent = err.message;
  }
};

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

const loadContentStats = async () => {
  try {
    const res = await fetch(`${API_BASE}/comic/stats`);
    const json = await res.json();
    const d = json?.data;
    if (!d) return;
    const byType = d.byType || {};
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val ?? '0';
    };
    set('statTotal',   d.total);
    set('statDonghua', (byType.donghua || 0) + (byType.movie || 0));
    set('statManga',   byType.manga   || 0);
    set('statManhwa',  byType.manhwa  || 0);
    set('statManhua',  byType.manhua  || 0);
    set('statOna',     byType.ona     || 0);
  } catch {
    // gagal fetch stats — biarkan ... tetap tampil
  }
};

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
];

const renderQuickLinks = () => {
  const grid = document.getElementById('quickLinksGrid');
  const baseEl = document.getElementById('qlBaseUrl');
  if (!grid) return;

  const origin = window.location.origin;
  if (baseEl) baseEl.textContent = origin;

  grid.innerHTML = '';

  QUICK_LINKS.forEach((group) => {
    const groupEl = document.createElement('div');
    groupEl.className = 'ql-group';

    const titleEl = document.createElement('div');
    titleEl.className = 'ql-group-title';
    titleEl.textContent = group.group;
    groupEl.appendChild(titleEl);

    const itemsEl = document.createElement('div');
    itemsEl.className = 'ql-items';

    group.items.forEach((item) => {
      const fullUrl = `${origin}${item.path}`;

      const row = document.createElement('div');
      row.className = 'ql-item';
      row.title = fullUrl;

      const tag = document.createElement('span');
      tag.className = `ql-tag ${item.tagClass}`;
      tag.textContent = item.tag;

      const label = document.createElement('a');
      label.className = 'ql-label';
      label.href = fullUrl;
      label.target = '_blank';
      label.rel = 'noopener noreferrer';
      label.textContent = item.label;

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'ql-copy-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyText(fullUrl, copyBtn);
      });

      row.appendChild(tag);
      row.appendChild(label);
      row.appendChild(copyBtn);
      itemsEl.appendChild(row);
    });

    groupEl.appendChild(itemsEl);
    grid.appendChild(groupEl);
  });
};

const boot = async () => {
  await loadDashboardData();

  attachExamplesToCards();
  attachEndpointCopyButtons();
  renderQuickLinks();
  initCarouselFilter();
  renderCarousel();
  startCarousel();
  initTesterPresets();

  if (copyPlaygroundResponse) {
    copyPlaygroundResponse.addEventListener('click', () => {
      copyText(responseBox.textContent || '', copyPlaygroundResponse);
    });
  }

  searchInput.addEventListener('input', filterCards);
  playgroundForm.addEventListener('submit', runPlayground);

  await loadStatus();
  await loadActivity();
  await loadContentStats();

  setInterval(loadStatus, 9000);
  setInterval(loadActivity, 3000);
  setInterval(loadContentStats, 30000);
};

boot();

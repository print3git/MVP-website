import { captureSnapshots } from './snapshot.js';

const API_BASE = (window.API_ORIGIN || '') + '/api';

function like(id) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Login required');
    return;
  }
  fetch(`${API_BASE}/models/${id}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.json())
    .then((d) => {
      const span = document.querySelector(`#likes-${id}`);
      if (span) span.textContent = d.likes;
    });
}

const SEARCH_DELAY = 300;

/**
 * Return a function that delays invoking `fn` until after `delay` ms
 * have elapsed since the last invocation.
 * @param {Function} fn
 * @param {number} delay
 */
function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}
var fetchCreations = window.fetchCreations;
if (!fetchCreations) fetchCreations = async function (
  type,
  offset = 0,
  limit = 9,
  category = '',
  search = '',
  order = 'desc'
) {
  const query = new URLSearchParams({ limit, offset });
  if (category) query.set('category', category);
  if (search) query.set('search', search);
  if (order && type === 'recent') query.set('order', order);
  try {
    const res = await fetch(`${API_BASE}/community/${type}?${query}`);
    if (!res.ok) throw new Error('bad response');
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch creations', err);
    return [];
  }
};

var getFallbackModels = window.getFallbackModels;
if (!getFallbackModels) getFallbackModels = function (count = 9, start = 0) {
  const base = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0';

  const samples = [
    { name: 'DamagedHelmet', ext: 'png' },
    { name: 'BoomBox', ext: 'jpg' },
    { name: 'BarramundiFish', ext: 'jpg' },
    // FlightHelmet lacks a GLB; use a different sample that definitely has one
    { name: 'Fox', ext: 'jpg' },
    { name: 'Avocado', ext: 'jpg' },
    { name: 'AntiqueCamera', ext: 'png' },
    { name: 'Lantern', ext: 'jpg' },
    { name: 'WaterBottle', ext: 'jpg' },
    { name: 'Corset', ext: 'jpg' },
    { name: 'ToyCar', ext: 'jpg' },
    { name: 'Duck', ext: 'png' },
    { name: 'CesiumMan', ext: 'gif' },
  ];

  return samples.slice(start, start + count).map((s, i) => ({
    model_url: `${base}/${s.name}/glTF-Binary/${s.name}.glb`,
    likes: 0,
    id: `fallback-${start + i}`,
    job_id: `fallback-${start + i}`,
    snapshot: `${base}/${s.name}/screenshot/screenshot.${s.ext}`,
  }));
}

const prefetchedModels = new Set();
function prefetchModel(url) {
  if (prefetchedModels.has(url)) return;
  const link = document.createElement('link');
  // Preload with high priority so the model is ready when clicked
  link.rel = 'preload';
  link.href = url;
  link.as = 'fetch';
  link.crossOrigin = 'anonymous';
  link.fetchPriority = 'high';
  document.head.appendChild(link);
  prefetchedModels.add(url);
}

function createCard(model) {
  const div = document.createElement('div');
  div.className =
    'model-card relative h-32 bg-[#2A2A2E] border border-white/10 rounded-xl hover:bg-[#3A3A3E] transition-shape flex items-center justify-center cursor-pointer';
  div.dataset.model = model.model_url;
  div.dataset.job = model.job_id;
  div.innerHTML = `\n      <img src="${model.snapshot || ''}" alt="Model" class="w-full h-full object-contain pointer-events-none" />\n      <span class="sr-only">${model.title || 'Model'}</span>\n      <button class="like absolute bottom-1 right-1 text-xs bg-red-600 px-1 rounded">\u2665</button>\n      <span class="absolute bottom-8 right-1 text-xs bg-black/50 px-1 rounded" id="likes-${model.id}">${model.likes}</span>\n      <button class="purchase absolute bottom-1 left-1 font-bold text-sm py-1 px-2 rounded-full shadow-md transition" style="background-color: #1f3b65; color: #5ec2c5">Buy</button>`;
  prefetchModel(model.model_url);
  div.querySelector('.purchase').addEventListener('click', (e) => {
    e.stopPropagation();
    localStorage.setItem('print3Model', model.model_url);
    localStorage.setItem('print3JobId', model.job_id);
    window.location.href = 'payment.html';
  });
  const likeBtn = div.querySelector('.like');
  likeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    like(model.id);
  });
  div.addEventListener('pointerenter', () => prefetchModel(model.model_url));
  div.addEventListener('click', () => {
    const modal = document.getElementById('model-modal');
    const viewer = modal.querySelector('model-viewer');
    viewer.setAttribute('poster', model.snapshot || '');
    // Ensure the viewer fetches the model immediately
    viewer.setAttribute('fetchpriority', 'high');
    viewer.setAttribute('loading', 'eager');
    viewer.src = model.model_url;
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  });
  return div;
}






function getFilters() {
  const category = document.getElementById('category').value;
  const search = document.getElementById('search')?.value || '';
  const order = document.getElementById('sort')?.value || 'desc';
  return { category, search, order, key: `${category}|${search}|${order}` };
}

async function loadMore(type, filters = getFilters()) {
  const { category, search, order, key } = filters;
  const cache = window.communityState[type];
  if (!cache[key]) cache[key] = { offset: 0, models: [] };
  const state = cache[key];
  let models = await fetchCreations(type, state.offset, 9, category, search, order);
  if (models.length === 0 && state.offset === 0) {
    const start = 0;
    models = getFallbackModels(9, start);
  }
  state.offset += models.length;
  state.models = state.models.concat(models);
  const grid = document.getElementById(`${type}-grid`);
  models.forEach((m) => grid.appendChild(createCard(m)));
  await captureSnapshots(grid);
  const btn = document.getElementById(`${type}-load`);
  if (btn) {
    if (models.length < 9) {
      btn.classList.add('hidden');
    } else {
      btn.classList.remove('hidden');
    }
  }
}

function renderGrid(type, filters = getFilters()) {
  const { key } = filters;
  const grid = document.getElementById(`${type}-grid`);
  grid.innerHTML = '';
  const state = window.communityState[type][key];
  if (state && state.models.length) {
    state.models.forEach((m) => grid.appendChild(createCard(m)));
    captureSnapshots(grid);
    const btn = document.getElementById(`${type}-load`);
    if (btn) {
      if (state.models.length < 9) btn.classList.add('hidden');
      else btn.classList.remove('hidden');
    }
  } else {
    loadMore(type, filters);
  }
  state.loading = false;
}

// IntersectionObserver support has been removed in favor of explicit "More"
// buttons. The following function is left in place for potential future use
// but is no longer invoked.
function createObserver(type) {
  const sentinel = document.getElementById(`${type}-sentinel`);
  if (!sentinel) return;
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      loadMore(type);
    }
  });
  observer.observe(sentinel);
  window.communityState[type].observer = observer;
}

function init() {
  window.communityState = {
    recent: { offset: 0, done: false, loading: false, observer: null },
    popular: { offset: 0, done: false, loading: false, observer: null },
  };

  const popBtn = document.getElementById('popular-load');
  if (popBtn) popBtn.addEventListener('click', () => loadMore('popular'));
  const recentBtn = document.getElementById('recent-load');
  if (recentBtn) recentBtn.addEventListener('click', () => loadMore('recent'));
  document.getElementById('category').addEventListener('change', () => {
    document.getElementById('recent-grid').innerHTML = '';
    document.getElementById('popular-grid').innerHTML = '';
    window.communityState = {
      recent: { offset: 0, done: false, loading: false, observer: null },
      popular: { offset: 0, done: false, loading: false, observer: null },
    };
    loadMore('popular');
    loadMore('recent');
  });
  const sortSelect = document.getElementById('sort');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      document.getElementById('recent-grid').innerHTML = '';
      document.getElementById('popular-grid').innerHTML = '';
      window.communityState = {
        recent: { offset: 0, done: false, loading: false, observer: null },
        popular: { offset: 0, done: false, loading: false, observer: null },
      };
      loadMore('popular');
      loadMore('recent');
    });
  }
  const searchInput = document.getElementById('search');
  if (searchInput) {
    function onSearchInput() {
      document.getElementById('recent-grid').innerHTML = '';
      document.getElementById('popular-grid').innerHTML = '';
      window.communityState = {
        recent: { offset: 0, done: false, loading: false, observer: null },
        popular: { offset: 0, done: false, loading: false, observer: null },
      };
      loadMore('popular');
      loadMore('recent');
    }

    searchInput.addEventListener('input', debounce(onSearchInput, SEARCH_DELAY));
  }
  loadMore('popular');
  loadMore('recent');
}

export { like, init };

import { captureSnapshots } from './snapshot.js';

const API_BASE = (window.API_ORIGIN || '') + '/api';

const OPEN_KEY = 'print3CommunityOpen';

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

const STATE_KEY = 'print3CommunityState';

async function fetchComments(id) {
  try {
    const res = await fetch(`${API_BASE}/community/${id}/comments`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch comments', err);
    return [];
  }
}

async function postComment(id, text) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Login required');
    return null;
  }
  try {
    const res = await fetch(`${API_BASE}/community/${id}/comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to post comment', err);
    return null;
  }
}

function loadState() {
  try {
    const data = localStorage.getItem(STATE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Failed to parse saved community state', err);
    return null;
  }
}

function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(window.communityState));
  } catch (err) {
    console.error('Failed to save community state', err);
  }
}

async function renderComments(id) {
  const list = document.getElementById('comments-list');
  if (!list) return;
  list.innerHTML = '';
  const comments = await fetchComments(id);
  comments.forEach((c) => {
    const li = document.createElement('li');
    li.textContent = `${c.username}: ${c.text}`;
    list.appendChild(li);
  });
}

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
if (!fetchCreations)
  fetchCreations = async function (
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
if (!getFallbackModels)
  getFallbackModels = function (count = 9, start = 0) {
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
      { name: '2CylinderEngine', ext: 'png' },
      { name: 'SheenChair', ext: 'jpg' },
      { name: 'IridescenceLamp', ext: 'jpg' },
      { name: 'ReciprocatingSaw', ext: 'png' },
      { name: 'VertexColorTest', ext: 'png' },
      { name: 'CesiumMilkTruck', ext: 'gif' },
    ];

    return samples.slice(start, start + count).map((s, i) => ({
      model_url: `${base}/${s.name}/glTF-Binary/${s.name}.glb`,
      likes: 0,
      id: `fallback-${start + i}`,
      job_id: `fallback-${start + i}`,
      snapshot: `${base}/${s.name}/screenshot/screenshot.${s.ext}`,
    }));
  };

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

function openModel(model) {
  const modal = document.getElementById('model-modal');
  const viewer = modal.querySelector('model-viewer');
  const checkoutBtn = document.getElementById('modal-checkout');
  const addBasketBtn = document.getElementById('modal-add-basket');
  const submitBtn = document.getElementById('comment-submit');
  const input = document.getElementById('comment-input');
  viewer.setAttribute('poster', model.snapshot || '');
  viewer.setAttribute('fetchpriority', 'high');
  viewer.setAttribute('loading', 'eager');
  viewer.src = model.model_url;
  if (checkoutBtn) {
    checkoutBtn.dataset.model = model.model_url;
    checkoutBtn.dataset.job = model.job_id;
  }
  if (addBasketBtn) {
    addBasketBtn.dataset.model = model.model_url;
    addBasketBtn.dataset.job = model.job_id;
    addBasketBtn.dataset.snapshot = model.snapshot || '';
  }
  const copyBtn = document.getElementById('modal-copy-link');
  if (copyBtn) {
    copyBtn.dataset.id = model.id;
  }
  if (submitBtn) {
    submitBtn.dataset.id = model.id;
    input.value = '';
    renderComments(model.id);
  }
  modal.classList.remove('hidden');
  const closeBtn = document.getElementById('close-modal');
  const svg = closeBtn?.querySelector('svg');
  if (closeBtn) {
    closeBtn.classList.remove('w-[9rem]', 'h-[9rem]');
    closeBtn.classList.add('w-[4.5rem]', 'h-[4.5rem]');
  }
  if (svg) {
    svg.classList.remove('w-20', 'h-20');
    svg.classList.add('w-10', 'h-10');
  }
  document.body.classList.add('overflow-hidden');
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify(model));
  } catch (err) {
    console.error('Failed to save open model', err);
  }
}

function closeModel() {
  const modal = document.getElementById('model-modal');
  modal.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
  localStorage.removeItem(OPEN_KEY);
}

function restoreOpenModel() {
  try {
    const data = localStorage.getItem(OPEN_KEY);
    if (!data) return;
    const model = JSON.parse(data);
    if (model) openModel(model);
  } catch (err) {
    console.error('Failed to restore open model', err);
  }
}

function createCard(model) {
  const div = document.createElement('div');
  div.className =
    'model-card relative h-32 bg-[#2A2A2E] border border-white/10 rounded-xl hover:bg-[#3A3A3E] transition-shape flex items-center justify-center cursor-pointer';
  div.dataset.model = model.model_url;
  div.dataset.job = model.job_id;

  div.innerHTML = `\n      <img src="${model.snapshot || ''}" alt="Model" loading="lazy" fetchpriority="low" class="w-full h-full object-contain pointer-events-none" />\n      <span class="sr-only">${model.title || 'Model'}</span>\n      <button class="like absolute bottom-1 right-1 text-xs bg-red-600 px-1 rounded">\u2665</button>\n      <span class="absolute bottom-8 right-1 text-xs bg-black/50 px-1 rounded" id="likes-${model.id}">${model.likes}</span>\n      <button class="purchase absolute bottom-1 left-1 font-bold text-lg py-1.5 px-4 rounded-full shadow-md transition border-2 border-black bg-[#30D5C8] text-[#1A1A1D]">Buy</button>`;

  div.querySelector('.purchase').addEventListener('click', (e) => {
    e.stopPropagation();
    sessionStorage.setItem('fromCommunity', '1');
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
  div.addEventListener('click', (e) => {
    e.stopPropagation();
    openModel(model);
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
  if (models.length === 0) {
    models = getFallbackModels(9, state.offset);
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
  saveState();
}

function renderGrid(type, filters = getFilters()) {
  const { key } = filters;
  const grid = document.getElementById(`${type}-grid`);
  grid.innerHTML = '';
  let state = window.communityState[type][key];
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
    state = window.communityState[type][key];
  }
  if (state) state.loading = false;
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
  let navType = 'navigate';
  if (typeof performance !== 'undefined') {
    const entries = performance.getEntriesByType?.('navigation') || [];
    if (entries.length && entries[0].type) {
      navType = entries[0].type;
    } else if (performance.navigation) {
      if (performance.navigation.type === 1) navType = 'reload';
      else if (performance.navigation.type === 2) navType = 'back_forward';
    }
  }
  if (navType !== 'reload') {
    localStorage.removeItem(STATE_KEY);
    localStorage.removeItem(OPEN_KEY);
  }

  const saved = loadState();
  window.communityState = saved || { recent: {}, popular: {} };

  const popBtn = document.getElementById('popular-load');
  if (popBtn) popBtn.addEventListener('click', () => loadMore('popular'));
  const recentBtn = document.getElementById('recent-load');
  if (recentBtn) recentBtn.addEventListener('click', () => loadMore('recent'));
  const form = document.getElementById('comment-form');
  if (form && !localStorage.getItem('token')) {
    form.classList.add('hidden');
  }
  const submitBtn = document.getElementById('comment-submit');
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const id = submitBtn.dataset.id;
      const input = document.getElementById('comment-input');
      const text = input.value.trim();
      if (!id || !text) return;
      const res = await postComment(id, text);
      if (res) {
        input.value = '';
        renderComments(id);
      }
    });
  }
  document.getElementById('category').addEventListener('change', () => {
    document.getElementById('recent-grid').innerHTML = '';
    document.getElementById('popular-grid').innerHTML = '';
    window.communityState = { recent: {}, popular: {} };
    saveState();
    loadMore('popular');
    loadMore('recent');
  });
  const sortSelect = document.getElementById('sort');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      document.getElementById('recent-grid').innerHTML = '';
      document.getElementById('popular-grid').innerHTML = '';
      window.communityState = { recent: {}, popular: {} };
      saveState();
      loadMore('popular');
      loadMore('recent');
    });
  }
  const searchInput = document.getElementById('search');
  if (searchInput) {
    function onSearchInput() {
      document.getElementById('recent-grid').innerHTML = '';
      document.getElementById('popular-grid').innerHTML = '';
      window.communityState = { recent: {}, popular: {} };
      saveState();
      loadMore('popular');
      loadMore('recent');
    }

    searchInput.addEventListener('input', debounce(onSearchInput, SEARCH_DELAY));
  }
  renderGrid('popular');
  renderGrid('recent');
}

export { like, init, closeModel, restoreOpenModel };

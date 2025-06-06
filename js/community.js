function like(id) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Login required');
    return;
  }
  fetch(`/api/models/${id}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.json())
    .then((d) => {
      const span = document.querySelector(`#likes-${id}`);
      if (span) span.textContent = d.likes;
    });
}
async function fetchCreations(
  type,
  offset = 0,
  limit = 6,
  category = '',
  search = '',
  order = 'desc'
) {
  const query = new URLSearchParams({ limit, offset });
  if (category) query.set('category', category);
  if (search) query.set('search', search);
  if (order && type === 'recent') query.set('order', order);
  try {
    const res = await fetch(`/api/community/${type}?${query}`);
    if (!res.ok) throw new Error('bad response');
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch creations', err);
    return [];
  }
}

function getFallbackModels() {
  const urls = [
    'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
    'https://modelviewer.dev/shared-assets/models/RobotExpressive.glb',
    'https://modelviewer.dev/shared-assets/models/Horse.glb',
  ];
  const models = [];
  for (let i = 0; i < 6; i++) {
    const url = urls[i % urls.length];
    models.push({
      model_url: url,
      likes: 0,
      id: `fallback-${i}`,
      job_id: `fallback-${i}`,
      snapshot: '',
    });
  }
  return models;
}

function createCard(model) {
  const div = document.createElement('div');
  div.className =
    'model-card relative h-32 bg-[#2A2A2E] border border-white/10 rounded-xl hover:bg-[#3A3A3E] transition-shape flex items-center justify-center cursor-pointer';
  div.dataset.model = model.model_url;
  div.dataset.job = model.job_id;
  div.innerHTML = `\n      <img src="${model.snapshot || ''}" alt="Model" class="w-full h-full object-contain pointer-events-none" />\n      <span class="sr-only">${model.title || 'Model'}</span>\n      <span class="absolute bottom-1 right-1 text-xs bg-black/50 px-1 rounded" id="likes-${model.id}">${model.likes}</span>\n      <button class="purchase absolute bottom-1 left-1 text-xs bg-blue-600 px-1 rounded">Buy</button>`;
  div.querySelector('.purchase').addEventListener('click', (e) => {
    e.stopPropagation();
    localStorage.setItem('print3Model', model.model_url);
    localStorage.setItem('print3JobId', model.job_id);
    window.location.href = 'payment.html';
  });
  div.addEventListener('click', () => {
    const modal = document.getElementById('model-modal');
    const viewer = modal.querySelector('model-viewer');
    viewer.src = model.model_url;
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  });
  return div;
}

async function captureSnapshots(container) {
  const cards = container.querySelectorAll('.model-card');
  for (const card of cards) {
    const img = card.querySelector('img');
    if (img && img.src) continue;
    const glbUrl = card.dataset.model;
    const viewer = document.createElement('model-viewer');
    viewer.src = glbUrl;
    viewer.setAttribute(
      'environment-image',
      'https://modelviewer.dev/shared-assets/environments/neutral.hdr'
    );
    viewer.style.position = 'fixed';
    viewer.style.left = '-10000px';
    viewer.style.width = '300px';
    viewer.style.height = '300px';
    document.body.appendChild(viewer);
    try {
      await viewer.updateComplete;
      img.src = await viewer.toDataURL('image/png');
    } catch (err) {
      console.error('Failed to capture snapshot', err);
    } finally {
      viewer.remove();
    }
  }
}

async function loadMore(type) {
  const state = window.communityState[type];
  if (state.loading || state.done) return;
  state.loading = true;

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
  let models = await fetchCreations(type, state.offset, 6, category, search, order);
  if (models.length === 0 && state.offset === 0) {
    models = getFallbackModels();
  }
  state.offset += models.length;
  state.models = state.models.concat(models);
  const grid = document.getElementById(`${type}-grid`);
  models.forEach((m) => grid.appendChild(createCard(m)));
  await captureSnapshots(grid);
  const btn = document.getElementById(`${type}-load`);
  if (models.length < 6) {

    btn.classList.add('hidden');
  } else {
    btn.classList.remove('hidden');
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
    if (state.models.length < 6) btn.classList.add('hidden');
    else btn.classList.remove('hidden');
  } else {
    loadMore(type, filters);

  }
  state.loading = false;
}

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
  document.getElementById('category').addEventListener('change', () => {
    document.getElementById('recent-grid').innerHTML = '';
    document.getElementById('popular-grid').innerHTML = '';
    window.communityState = {
      recent: { offset: 0, done: false, loading: false, observer: null },
      popular: { offset: 0, done: false, loading: false, observer: null },
    };
    createObserver('popular');
    createObserver('recent');
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
      createObserver('popular');
      createObserver('recent');
      loadMore('popular');
      loadMore('recent');

    });
  }
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {

      document.getElementById('recent-grid').innerHTML = '';
      document.getElementById('popular-grid').innerHTML = '';
      window.communityState = {
        recent: { offset: 0, done: false, loading: false, observer: null },
        popular: { offset: 0, done: false, loading: false, observer: null },
      };
      createObserver('popular');
      createObserver('recent');
      loadMore('popular');
      loadMore('recent');
    });
  }
  createObserver('popular');
  createObserver('recent');
  loadMore('popular');
  loadMore('recent');

}

export { like, init };

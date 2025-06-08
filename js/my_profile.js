import { captureSnapshots } from './snapshot.js';

const API_BASE = (window.API_ORIGIN || '') + '/api';

function createCard(model) {
  const div = document.createElement('div');
  div.className =
    'model-card relative h-32 bg-[#2A2A2E] border border-white/10 rounded-xl hover:bg-[#3A3A3E] flex items-center justify-center cursor-pointer';
  div.dataset.model = model.model_url;
  div.dataset.job = model.job_id;
  div.innerHTML = `\n    <img src="${model.snapshot || ''}" alt="Model" class="w-full h-full object-contain pointer-events-none" />\n    <span class="sr-only">${model.prompt || 'Model'}</span>\n    <button class="purchase absolute bottom-1 left-1 text-xs bg-blue-600 px-1 rounded">Buy</button>`;
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

const state = { offset: 0, done: false, loading: false };

async function loadMore() {
  if (state.loading || state.done) return;
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  state.loading = true;
  const query = new URLSearchParams({ limit: 9, offset: state.offset });
  const res = await fetch(`${API_BASE}/my/models?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    state.loading = false;
    return;
  }
  const models = await res.json();
  const container = document.getElementById('models');
  models.forEach((m) => container.appendChild(createCard(m)));
  await captureSnapshots(container);
  state.offset += models.length;
  if (models.length < 9) state.done = true;
  state.loading = false;
}

function createObserver() {
  const sentinel = document.getElementById('models-sentinel');
  if (!sentinel) return;
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) loadMore();
  });
  observer.observe(sentinel);
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('model-modal');
  const closeBtn = document.getElementById('close-modal');
  function close() {
    modal?.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }
  closeBtn?.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  const logoutBtn = document.getElementById('logout-btn');
  logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
  });
  createObserver();
  loadMore();
});

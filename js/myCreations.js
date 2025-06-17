import { captureSnapshots } from './snapshot.js';

const API_BASE = (window.API_ORIGIN || '') + '/api';

function createCard(model) {
  const div = document.createElement('div');
  div.className =
    'model-card relative h-32 bg-[#2A2A2E] border border-white/10 rounded-xl hover:bg-[#3A3A3E] transition-shape flex items-center justify-center cursor-pointer';
  div.dataset.model = model.model_url;
  div.dataset.job = model.job_id;
  div.dataset.id = model.id;

  div.innerHTML = `\n    <img src="${model.snapshot || ''}" alt="Model" loading="lazy" fetchpriority="low" class="w-full h-full object-contain pointer-events-none" />\n    <span class="sr-only">${model.title || 'Model'}</span>\n    <button class="delete absolute bottom-1 right-1 text-xs bg-red-600 px-1 rounded">Delete</button>`;

  div.addEventListener('click', () => {
    const modal = document.getElementById('model-modal');
    const viewer = modal.querySelector('model-viewer');
    const copyBtn = document.getElementById('modal-copy-link');
    viewer.src = model.model_url;
    if (copyBtn) {
      copyBtn.dataset.id = model.id;
    }
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  });

  const delBtn = div.querySelector('.delete');
  delBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm('Delete this creation?')) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`${API_BASE}/community/${model.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      div.remove();
    }
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
  const res = await fetch(`${API_BASE}/community/mine?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    state.loading = false;
    return;
  }
  const models = await res.json();
  const grid = document.getElementById('mine-grid');
  models.forEach((m) => grid.appendChild(createCard(m)));
  await captureSnapshots(grid);
  state.offset += models.length;
  if (models.length < 9) state.done = true;
  state.loading = false;
}

function createObserver() {
  const sentinel = document.getElementById('mine-sentinel');
  if (!sentinel) return;
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) loadMore();
  });
  observer.observe(sentinel);
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('model-modal');
  const closeBtn = document.getElementById('close-modal');
  const copyBtn = document.getElementById('modal-copy-link');
  function close() {
    modal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  copyBtn?.addEventListener('click', () => {
    const id = copyBtn.dataset.id;
    if (!id) return;
    const url = `${window.location.origin}/community/model/${id}`;
    navigator.clipboard.writeText(url).then(() => alert('Link copied'));
  });
  createObserver();
  loadMore();
});

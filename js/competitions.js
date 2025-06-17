import { captureSnapshots } from './snapshot.js';

const API_BASE = (window.API_ORIGIN || '') + '/api';

const prefetchedModels = new Set();
function prefetchModel(url) {
  if (prefetchedModels.has(url)) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  link.as = 'fetch';
  link.crossOrigin = 'anonymous';
  link.fetchPriority = 'high';
  document.head.appendChild(link);
  prefetchedModels.add(url);
}

function openViewer(modelUrl, jobId, snapshot = '') {
  const modal = document.getElementById('model-modal');
  const viewer = modal.querySelector('model-viewer');
  const checkoutBtn = document.getElementById('modal-checkout');
  const addBasketBtn = document.getElementById('modal-add-basket');
  viewer.setAttribute('poster', snapshot);
  viewer.setAttribute('fetchpriority', 'high');
  viewer.setAttribute('loading', 'eager');
  viewer.src = modelUrl;
  if (checkoutBtn) {
    checkoutBtn.dataset.model = modelUrl;
    checkoutBtn.dataset.job = jobId;
  }
  if (addBasketBtn) {
    addBasketBtn.dataset.model = modelUrl;
    addBasketBtn.dataset.job = jobId;
    addBasketBtn.dataset.snapshot = snapshot;
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
}

function purchase(modelUrl, jobId) {
  sessionStorage.setItem('fromCommunity', '1');
  localStorage.setItem('print3Model', modelUrl);
  localStorage.setItem('print3JobId', jobId);
  window.location.href = 'payment.html';
}

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

async function load() {
  const res = await fetch(`${API_BASE}/competitions/active`);
  const list = document.getElementById('list');
  if (!res.ok) {
    // When the competitions API fails, show a friendly message
    list.textContent = 'No ongoing competitions right now';
    return;
  }
  const comps = await res.json();
  if (comps.length === 0) {
    list.innerHTML =
      '<p class="text-center text-white/80">No active competitions. Check back soon!</p>';
    return;
  }
  comps.forEach((c) => {
    const div = document.createElement('div');
    div.className = 'bg-[#2A2A2E] p-4 rounded-xl space-y-2';
    div.innerHTML = `<h2 class="text-xl">${c.name}</h2>
      <p>${c.prize_description || ''}</p>
      <p class="text-sm"><span class="countdown" data-end="${c.end_date}"></span> left</p>
      <div class="flex space-x-2">
        <button data-id="${c.id}" class="enter bg-[#30D5C8] text-[#1A1A1D] px-3 py-1 rounded">Enter</button>
        <button onclick="shareOn('twitter')" aria-label="Share on Twitter" class="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-[#1A1A1D] border border-white/10 rounded hover:bg-[#3A3A3E]"><i class="fab fa-twitter"></i></button>
      </div>
      <table class="leaderboard w-full mt-4 text-sm"></table>

      <div class="comments space-y-1 mt-4"></div>
      <form data-id="${c.id}" class="comment-form flex space-x-2 mt-2">
        <input type="text" name="text" class="flex-1 bg-[#1A1A1D] border border-white/10 rounded px-2" placeholder="Add a comment" />
        <button class="bg-[#30D5C8] text-[#1A1A1D] px-2 rounded">Post</button>
      </form>`;

    list.appendChild(div);
    const table = div.querySelector('.leaderboard');

    const grid = div.querySelector('.entries-grid');
    loadLeaderboard(c.id, table, grid);
    setInterval(() => loadLeaderboard(c.id, table, grid), 30000);
    div.querySelector('.enter').addEventListener('click', () => enter(c.id));
    const commentsDiv = div.querySelector('.comments');
    loadComments(c.id, commentsDiv);
    div.querySelector('.comment-form').addEventListener('submit', (e) => {
      e.preventDefault();
      submitComment(c.id, e.target, commentsDiv);
    });

    const timer = div.querySelector('.countdown');
    startCountdown(timer);
  });
}

async function loadLeaderboard(id, table, grid) {
  const res = await fetch(`${API_BASE}/competitions/${id}/entries`);
  if (!res.ok) return;
  const rows = await res.json();
  table.innerHTML = rows
    .map((r, i) => `<tr><td>${i + 1}</td><td>${r.model_id}</td><td>${r.likes}</td></tr>`)
    .join('');
  if (grid) {
    grid.innerHTML = '';
    rows.forEach((r) => {
      const card = document.createElement('div');
      card.className =
        'entry-card relative h-32 bg-[#2A2A2E] border border-white/10 rounded-xl flex items-center justify-center cursor-pointer';
      card.dataset.model = r.model_url;
      card.dataset.job = r.model_id;
      card.innerHTML = `<img src="" alt="Model" class="w-full h-full object-contain pointer-events-none" />\n      <button class="like absolute bottom-1 right-1 text-xs bg-red-600 px-1 rounded">\u2665</button>\n      <span class="absolute bottom-8 right-1 text-xs bg-black/50 px-1 rounded" id="likes-${r.model_id}">${r.likes}</span>\n      <button class="purchase absolute bottom-1 left-1 font-bold text-lg py-2 px-4 rounded-full shadow-md transition border-2 border-black bg-[#30D5C8] text-[#1A1A1D]">Buy</button>`;
      card.querySelector('.like').addEventListener('click', (e) => {
        e.stopPropagation();
        like(r.model_id);
      });
      const buyBtn = card.querySelector('.purchase');
      buyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        purchase(r.model_url, r.model_id);
      });
      card.addEventListener('pointerenter', () => prefetchModel(r.model_url));
      card.addEventListener('click', () =>
        openViewer(r.model_url, r.model_id, card.querySelector('img')?.src || '')
      );
      grid.appendChild(card);
    });
    captureSnapshots(grid);
  }
}

function zeroPad(num) {
  return String(num).padStart(2, '0');
}

function startCountdown(el) {
  const end = new Date(el.dataset.end + 'T23:59:59');
  let timer;
  function update() {
    const diff = end - new Date();
    if (diff <= 0) {
      el.textContent = 'Closed';
      clearInterval(timer);
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    el.textContent = `${d}d ${zeroPad(h)}:${zeroPad(m)}`;
  }
  update();
  timer = setInterval(update, 60000);
}

let currentId;
let modal;
let form;
let input;
let errorEl;

function openModal(id) {
  currentId = id;
  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
  errorEl.textContent = '';
  input.value = '';
}

function closeModal() {
  modal.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
  errorEl.textContent = '';
  input.value = '';
}

async function submitEntry(e) {
  e.preventDefault();
  const modelId = input.value.trim();
  input.classList.remove('border-red-500');
  if (!modelId) {
    errorEl.textContent = 'Model ID required';
    input.classList.add('border-red-500');
    return;
  }
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Login required');
    return;
  }
  const res = await fetch(`${API_BASE}/competitions/${currentId}/enter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ modelId }),
  });
  if (res.ok) closeModal();
}

async function loadComments(id, container) {
  const res = await fetch(`${API_BASE}/competitions/${id}/comments`);
  if (!res.ok) return;
  const comments = await res.json();
  container.innerHTML = comments
    .map((c) => `<p><strong>${c.username}:</strong> ${c.text}</p>`)
    .join('');
}

async function submitComment(id, form, container) {
  const token = localStorage.getItem('token');
  if (!token) return alert('Login required');
  const text = form.text.value.trim();
  if (!text) return;
  const res = await fetch(`${API_BASE}/competitions/${id}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text }),
  });
  if (res.ok) {
    form.text.value = '';
    loadComments(id, container);
  }
}

async function loadPast() {
  const res = await fetch(`${API_BASE}/competitions/past`);
  const container = document.getElementById('past');
  if (!res.ok) {
    return;
  }
  const comps = await res.json();
  if (comps.length === 0) {
    container.innerHTML = '<p class="text-center text-white/80">No past competitions yet.</p>';
    return;
  }
  comps.forEach((c) => {
    const div = document.createElement('div');
    div.className = 'bg-[#2A2A2E] p-4 rounded-xl space-y-2 text-center';
    div.innerHTML = `<h3 class="text-lg">${c.name}</h3>
      <img src="${c.model_url}" alt="Winning model" class="w-32 h-32 object-contain mx-auto" />`;
    container.appendChild(div);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  modal = document.getElementById('enter-modal');
  form = document.getElementById('enter-form');
  input = document.getElementById('enter-model-id');
  errorEl = document.getElementById('enter-error');
  const cancel = document.getElementById('enter-cancel');
  cancel?.addEventListener('click', closeModal);
  form?.addEventListener('submit', submitEntry);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
  document.querySelectorAll('#winners-grid .model-card').forEach((card) => {
    const likeBtn = card.querySelector('.like');
    const buyBtn = card.querySelector('.purchase');
    if (likeBtn) {
      likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        like(card.dataset.job);
      });
    }
    if (buyBtn) {
      buyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        purchase(card.dataset.model, card.dataset.job);
      });
    }
    card.addEventListener('pointerenter', () => prefetchModel(card.dataset.model));
    card.addEventListener('click', () =>
      openViewer(card.dataset.model, card.dataset.job, card.querySelector('img')?.src || '')
    );
  });
  load();
});

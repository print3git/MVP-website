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

function vote(id) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Login required');
    return;
  }
  const compId = currentId;
  fetch(`${API_BASE}/competitions/${compId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ modelId: id }),
  })
    .then((r) => r.json())
    .then((d) => {
      const span = document.querySelector(`#votes-${id}`);
      if (span && d.votes !== undefined) span.textContent = d.votes;
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
  const themeEl = document.getElementById('current-theme');
  if (themeEl && comps[0].theme) {
    themeEl.textContent = `Current theme: ${comps[0].theme}`;
  }
  comps.forEach((c) => {
    const div = document.createElement('div');
    div.className = 'bg-[#2A2A2E] p-4 rounded-xl space-y-2';
    div.innerHTML = `<h2 class="text-xl">${c.name}</h2>
      <p class="text-[#30D5C8]">Theme: ${c.theme || ''}</p>
      <p>${c.prize_description || ''}</p>
      <p class="text-sm"><span class="countdown" data-deadline="${c.deadline}"></span> left</p>
      <div class="flex space-x-2">
        <button data-id="${c.id}" class="enter bg-[#30D5C8] text-[#1A1A1D] px-3 py-1 rounded">Enter</button>
        <button onclick="shareOn('twitter')" aria-label="Share on Twitter" class="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-[#1A1A1D] border border-white/10 rounded hover:bg-[#3A3A3E]"><i class="fab fa-twitter"></i></button>
        <button onclick="shareOn('facebook')" aria-label="Share on Facebook" class="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-[#1A1A1D] border border-white/10 rounded hover:bg-[#3A3A3E]"><i class="fab fa-facebook-f"></i></button>
        <button onclick="shareOn('reddit')" aria-label="Share on Reddit" class="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-[#1A1A1D] border border-white/10 rounded hover:bg-[#3A3A3E]"><i class="fab fa-reddit-alien"></i></button>
      </div>
      <table class="leaderboard w-full mt-4 text-sm"></table>
      <div class="entries-grid grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4"></div>
      <div class="pagination flex justify-center items-center space-x-2 text-sm mt-1">
        <button class="prev px-2 py-1 bg-[#1A1A1D] border border-white/10 rounded">Prev</button>
        <span class="page-info"></span>
        <button class="next px-2 py-1 bg-[#1A1A1D] border border-white/10 rounded">Next</button>
      </div>
      <div class="comments space-y-1 mt-4"></div>
      <form data-id="${c.id}" class="comment-form flex space-x-2 mt-2">
        <input type="text" name="text" class="flex-1 bg-[#1A1A1D] border border-white/10 rounded px-2" placeholder="Add a comment" />
        <button class="bg-[#30D5C8] text-[#1A1A1D] px-2 rounded">Post</button>
      </form>`;

    list.appendChild(div);
    const table = div.querySelector('.leaderboard');

    const grid = div.querySelector('.entries-grid');
    const pager = div.querySelector('.pagination');
    loadLeaderboard(c.id, table, grid, pager);
    setInterval(() => loadLeaderboard(c.id, table, grid, pager), 30000);
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

async function loadLeaderboard(id, table, grid, pager) {
  const res = await fetch(`${API_BASE}/competitions/${id}/entries`);
  if (!res.ok) return;
  const rows = await res.json();
  table.innerHTML = rows
    .map((r, i) => `<tr><td>${i + 1}</td><td>${r.model_id}</td><td>${r.votes}</td></tr>`)
    .join('');
  if (grid) {
    grid.__entries = rows;
    const page = Number(grid.dataset.page || '1');
    renderEntriesPage(grid, pager, page);
  }
}

function zeroPad(num) {
  return String(num).padStart(2, '0');
}

function renderEntriesPage(grid, pager, page) {
  const rows = grid.__entries || [];
  const perPage = 9;
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  page = Math.min(Math.max(page, 1), totalPages);
  grid.dataset.page = page;
  grid.innerHTML = '';
  const start = (page - 1) * perPage;
  rows.slice(start, start + perPage).forEach((r) => {
    const card = document.createElement('div');
    card.className =
      'entry-card relative h-32 bg-[#2A2A2E] border border-white/10 rounded-xl flex items-center justify-center cursor-pointer';
    card.dataset.model = r.model_url;
    card.dataset.job = r.model_id;
    card.innerHTML = `<img src="" alt="Model" class="w-full h-full object-contain pointer-events-none" />\n      <button class="like absolute bottom-1 right-1 text-xs bg-red-600 px-1 rounded">\u2665</button>\n      <span class="absolute bottom-8 right-1 text-xs bg-black/50 px-1 rounded" id="votes-${r.model_id}">${r.votes}</span>\n      <button class="purchase absolute bottom-1 left-1 font-bold text-lg py-2 px-4 rounded-full shadow-md transition border-2 border-black bg-[#30D5C8] text-[#1A1A1D]">Buy</button>`;
    card.querySelector('.like').addEventListener('click', (e) => {
      e.stopPropagation();
      vote(r.model_id);
    });
    const buyBtn = card.querySelector('.purchase');
    buyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      purchase(r.model_url, r.model_id);
    });
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      const img = card.querySelector('img');
      openModelModal(r.model_url, r.model_id, img ? img.src : '');
    });
    card.addEventListener('pointerenter', () => prefetchModel(r.model_url));
    card.addEventListener('click', () =>
      openViewer(r.model_url, r.model_id, card.querySelector('img')?.src || '')
    );
    grid.appendChild(card);
  });
  captureSnapshots(grid);
  if (pager) {
    const info = pager.querySelector('.page-info');
    const prev = pager.querySelector('.prev');
    const next = pager.querySelector('.next');
    info.textContent = `Page ${page} of ${totalPages}`;
    prev.disabled = page === 1;
    next.disabled = page === totalPages;
    prev.onclick = () => renderEntriesPage(grid, pager, page - 1);
    next.onclick = () => renderEntriesPage(grid, pager, page + 1);
  }
}

function startCountdown(el) {
  const end = new Date(el.dataset.deadline);
  let timer;
  function update() {
    const diff = end - new Date();
    if (diff <= 0) {
      el.textContent = 'Closed';
      clearInterval(timer);
      return;
    }
    let remaining = Math.round(diff / 1000);
    const d = Math.floor(remaining / 86400);
    remaining %= 86400;
    const h = Math.floor(remaining / 3600);
    remaining %= 3600;
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    el.textContent = `${d}d ${zeroPad(h)}:${zeroPad(m)}:${zeroPad(s)}`;
  }
  update();
  timer = setInterval(update, 1000);
}

let currentId;
let modal;
let form;
let input;
let errorEl;

function openModelModal(url, jobId, snapshot) {
  const modalEl = document.getElementById('model-modal');
  const viewer = modalEl.querySelector('model-viewer');
  const checkoutBtn = document.getElementById('modal-checkout');
  const addBasketBtn = document.getElementById('modal-add-basket');
  viewer.setAttribute('poster', snapshot || '');
  viewer.setAttribute('fetchpriority', 'high');
  viewer.setAttribute('loading', 'eager');
  viewer.src = url;
  if (checkoutBtn) {
    checkoutBtn.dataset.model = url;
    checkoutBtn.dataset.job = jobId;
  }
  if (addBasketBtn) {
    addBasketBtn.dataset.model = url;
    addBasketBtn.dataset.job = jobId;
    if (snapshot) addBasketBtn.dataset.snapshot = snapshot;
  }
  modalEl.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
}

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
  if (res.ok) {
    closeModal();
    const msg = document.getElementById('entry-success');
    if (msg) {
      try {
        const resp = await fetch(`${API_BASE}/competitions/${currentId}/discount`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          msg.textContent = `Discount code: ${data.code}`;
          msg.classList.remove('hidden');
        }
      } catch (err) {
        console.error(err);
      }
    }
  }
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
      <div class="model-card relative h-32 border border-white/10 rounded-xl flex items-center justify-center cursor-pointer" data-model="${c.model_url}" data-job="${c.winner_model_id}">
        <img src="${c.snapshot || ''}" alt="Winning model" class="w-full h-full object-contain pointer-events-none" />
        <button class="order absolute bottom-1 left-1 font-bold text-lg py-2 px-4 rounded-full shadow-md transition border-2 border-black bg-[#30D5C8] text-[#1A1A1D]">Buy Print</button>
      </div>`;
    container.appendChild(div);
    const card = div.querySelector('.model-card');
    const btn = div.querySelector('.order');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      purchase(c.model_url, c.winner_model_id);
    });
    card.addEventListener('click', () => {
      openModelModal(c.model_url, c.winner_model_id, c.snapshot || '');
    });
    card.addEventListener('pointerenter', () => prefetchModel(c.model_url));
  });
}

async function loadTrending() {
  const container = document.getElementById('trending-prints');
  if (!container) return;
  const res = await fetch(`${API_BASE}/trending`);
  if (!res.ok) return;
  const items = await res.json();
  items.forEach((i) => {
    const card = document.createElement('div');
    card.className =
      'relative h-32 bg-[#2A2A2E] border border-white/10 rounded-xl flex items-center justify-center cursor-pointer';
    card.dataset.model = i.model_url;
    card.dataset.job = i.job_id;
    if (i.snapshot) {
      card.innerHTML = `<img src="${i.snapshot}" alt="Model" class="w-full h-full object-contain pointer-events-none" />`;
    }
    const btn = document.createElement('button');
    btn.className =
      'add absolute bottom-1 left-1 font-bold text-lg py-2 px-4 rounded-full shadow-md transition border-2 border-black bg-[#30D5C8] text-[#1A1A1D]';
    btn.textContent = 'Add to Basket';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.addToBasket) {
        window.addToBasket({ jobId: i.job_id, modelUrl: i.model_url, snapshot: i.snapshot });
      }
    });
    card.addEventListener('click', () => openModelModal(i.model_url, i.job_id, i.snapshot || ''));
    card.addEventListener('pointerenter', () => prefetchModel(i.model_url));
    card.appendChild(btn);
    container.appendChild(card);
  });
}

async function loadWinnerInterviews() {
  const container = document.getElementById('winner-interviews');
  if (!container) return;
  const res = await fetch(`${API_BASE}/competitions/winners`);
  if (!res.ok) return;
  const winners = await res.json();
  winners.forEach((w) => {
    const div = document.createElement('div');
    div.className = 'flex items-center space-x-4';
    div.innerHTML = `<img src="${w.image}" alt="${w.name}" class="w-16 h-16 rounded-full object-cover" />\n      <blockquote class="text-sm italic">"${w.quote}"</blockquote>`;
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
        vote(card.dataset.job);
      });
    }
    if (buyBtn) {
      buyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        purchase(card.dataset.model, card.dataset.job);
      });
    }
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      const img = card.querySelector('img');
      openModelModal(card.dataset.model, card.dataset.job, img ? img.src : '');
    });
    card.addEventListener('pointerenter', () => prefetchModel(card.dataset.model));

    card.addEventListener('click', () =>
      openViewer(card.dataset.model, card.dataset.job, card.querySelector('img')?.src || '')
    );
  });
  load();
  loadPast();
  loadTrending();
  loadWinnerInterviews();
  const subForm = document.getElementById('comp-subscribe');
  const emailInput = document.getElementById('comp-email');
  const msgEl = document.getElementById('comp-subscribe-msg');
  subForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email) return;
    msgEl.textContent = '';
    const res = await fetch(`${API_BASE}/competitions/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      msgEl.textContent = 'Check your inbox to confirm!';
      emailInput.value = '';
    } else {
      const data = await res.json().catch(() => ({}));
      msgEl.textContent = data.error || 'Subscription failed';
    }
  });
});

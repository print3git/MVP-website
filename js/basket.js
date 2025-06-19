const KEY = 'print3Basket';
export function getBasket() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}
function saveBasket(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
}
export function addToBasket(item, opts = {}) {
  const items = getBasket();
  items.push({ ...item, auto: !!opts.auto });
  saveBasket(items);
  updateBadge();
  renderList();
}

export function addAutoItem(item) {
  const items = getBasket();
  const idx = items.findIndex((it) => it.auto);
  if (idx !== -1) {
    items.splice(idx, 1);
  }
  items.push({ ...item, auto: true });
  saveBasket(items);
  updateBadge();
  renderList();
}

export function manualizeItem(predicate) {
  const items = getBasket();
  const idx = items.findIndex((it) => it.auto && predicate(it));
  if (idx !== -1) {
    items[idx].auto = false;
    saveBasket(items);
  }
  updateBadge();
  renderList();
}
export function removeFromBasket(index) {
  const items = getBasket();
  items.splice(index, 1);
  saveBasket(items);
  updateBadge();
  renderList();
}
export function clearBasket() {
  saveBasket([]);
  updateBadge();
  renderList();
}
function updateBadge() {
  const badge = document.getElementById('basket-count');
  if (badge) {
    const n = getBasket().length;
    badge.textContent = String(n);
    badge.hidden = n === 0;
  }
}
let viewerModal;
let viewerEl;
let viewerCheckoutBtn;
let viewerTierToggle;

function showModel(modelUrl, poster, jobId) {
  if (!viewerModal || !viewerEl) return;
  if (poster) viewerEl.setAttribute('poster', poster);
  viewerEl.src = modelUrl;
  if (viewerCheckoutBtn) {
    viewerCheckoutBtn.dataset.model = modelUrl || '';
    viewerCheckoutBtn.dataset.job = jobId || '';
  }
  viewerModal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
}

function hideModel() {
  if (!viewerModal) return;
  viewerModal.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
}

function renderList() {
  const list = document.getElementById('basket-list');
  if (!list) return;
  list.innerHTML = '';
  const items = getBasket();
  if (items.length === 0) {
    list.innerHTML = '<p class="text-white">Basket empty</p>';
    return;
  }
  items.forEach((it, idx) => {
    const div = document.createElement('div');
    div.className = 'relative group';

    const img = document.createElement('img');
    img.src = it.snapshot || it.modelUrl || '';
    img.alt = 'Model';
    img.className =
      'w-24 h-24 object-cover rounded-lg bg-[#2A2A2E] border border-white/20 cursor-pointer';
    img.addEventListener('click', () => showModel(it.modelUrl, it.snapshot, it.jobId));

    const btn = document.createElement('button');
    btn.textContent = 'Remove';
    btn.type = 'button';

    btn.className =
      'remove absolute bottom-1 right-1 text-xs px-2 py-1 bg-red-600 rounded opacity-80 group-hover:opacity-100';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromBasket(idx);
    });

    div.appendChild(img);
    div.appendChild(btn);
    list.appendChild(div);
  });
}
function openBasket() {
  renderList();
  document.getElementById('basket-overlay')?.classList.remove('hidden');
}
function closeBasket() {
  document.getElementById('basket-overlay')?.classList.add('hidden');
}
export function setupBasketUI() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'basket-button';
  btn.className =
    'fixed bottom-4 right-4 bg-[#30D5C8] text-black p-3 rounded-full shadow-lg z-50 border-2 border-black';
  btn.innerHTML =
    '<i class="fas fa-shopping-basket"></i> <span id="basket-count" class="ml-1"></span>';
  btn.addEventListener('click', openBasket);
  document.body.appendChild(btn);

  const overlay = document.createElement('div');
  overlay.id = 'basket-overlay';
  overlay.className = 'fixed inset-0 bg-black/80 flex items-center justify-center hidden z-50';
  overlay.innerHTML = `\

    <div class="relative bg-[#2A2A2E] border border-white/10 rounded-3xl p-6 text-center w-72">
      <button id="basket-close" type="button" class="absolute -top-1 -right-1 text-white text-4xl w-9 h-9 flex items-center justify-center">
        <i class="fas fa-times-circle"></i>
      </button>
      <h2 class="text-xl font-semibold mb-2 text-white">Basket</h2>
      <div id="basket-list" class="grid grid-cols-2 gap-3 mb-4"></div>
      <button id="basket-checkout" type="button" class="mb-2 px-4 py-2 rounded-md bg-[#30D5C8] text-[#1A1A1D]">Checkout</button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#basket-close').addEventListener('click', closeBasket);
  overlay.querySelector('#basket-checkout').addEventListener('click', () => {
    const items = getBasket();
    if (items.length === 1) {
      const item = items[0];
      if (item.modelUrl) {
        localStorage.setItem('print3Model', item.modelUrl);
      }
      if (item.jobId) {
        localStorage.setItem('print3JobId', item.jobId);
      } else {
        localStorage.removeItem('print3JobId');
      }
    }
    closeBasket();
    window.location.href = 'payment.html';
  });

  overlay.addEventListener('click', (e) => {
    const container = overlay.querySelector('div');
    if (!container.contains(e.target) && !btn.contains(e.target)) {
      closeBasket();
    }
  });

  const viewerOverlay = document.createElement('div');
  viewerOverlay.id = 'basket-model-modal';
  viewerOverlay.className =
    'fixed inset-0 bg-black/80 flex items-center justify-center hidden z-50';
  viewerOverlay.innerHTML = `
    <div class="relative w-11/12 max-w-3xl">
      <button id="basket-model-close" class="absolute -top-4 -right-4 w-[4.5rem] h-[4.5rem] rounded-full bg-white text-black flex items-center justify-center z-50" type="button">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-10 h-10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" /></svg>
        <span class="sr-only">Close</span>
      </button>
      <model-viewer src="" alt="3D model preview" environment-image="https://modelviewer.dev/shared-assets/environments/neutral.hdr" camera-controls auto-rotate class="w-full h-96 bg-[#2A2A2E] rounded-xl"></model-viewer>
      <div id="basket-checkout-container" class="absolute bottom-4 right-4 flex flex-col items-center">
        <div id="basket-tier-toggle" class="flex gap-1 mb-2 text-xs">
          <button type="button" data-tier="bronze" class="basket-tier-option px-2 py-1 rounded-full border border-white/20 opacity-50 text-black" style="background-color: #cd7f32">1 colour</button>
          <button type="button" data-tier="silver" class="basket-tier-option px-2 py-1 rounded-full border border-white/20 opacity-50 text-black" style="background-color: #c0c0c0">multicolour</button>
          <button type="button" data-tier="gold" class="basket-tier-option px-2 py-1 rounded-full border border-white/20 opacity-50 text-black" style="background-color: #ffd700">premium</button>
        </div>
  <a id="basket-model-checkout" href="payment.html" class="font-bold py-2 px-5 rounded-full shadow-md transition border-2 border-black" style="background-color: #30D5C8; color: #1A1A1D" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">Print for £39.99 →</a>
      </div>
    </div>`;
  document.body.appendChild(viewerOverlay);
  viewerModal = viewerOverlay;
  viewerEl = viewerOverlay.querySelector('model-viewer');
  viewerCheckoutBtn = viewerOverlay.querySelector('#basket-model-checkout');
  viewerTierToggle = viewerOverlay.querySelector('#basket-tier-toggle');
  viewerOverlay.querySelector('#basket-model-close').addEventListener('click', hideModel);
  viewerCheckoutBtn.addEventListener('click', () => {
    const model = viewerCheckoutBtn.dataset.model;
    const job = viewerCheckoutBtn.dataset.job;
    if (model) localStorage.setItem('print3Model', model);
    if (job) {
      localStorage.setItem('print3JobId', job);
    } else {
      localStorage.removeItem('print3JobId');
    }
  });
  function setTier(tier) {
    viewerTierToggle?.querySelectorAll('button[data-tier]').forEach((btn) => {
      const active = btn.dataset.tier === tier;
      btn.classList.toggle('ring-2', active);
      btn.classList.toggle('ring-white', active);
      btn.classList.toggle('opacity-100', active);
      btn.classList.toggle('opacity-50', !active);
    });
    if (viewerCheckoutBtn) {
      const price = tier === 'bronze' ? 29.99 : tier === 'gold' ? 79.99 : 39.99;
      viewerCheckoutBtn.textContent = `Print for £${price.toFixed(2)} →`;
    }
    const material = tier === 'bronze' ? 'single' : tier === 'gold' ? 'premium' : 'multi';
    localStorage.setItem('print3Material', material);
  }
  viewerTierToggle?.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-tier]');
    if (btn) setTier(btn.dataset.tier);
  });
  setTier('silver');

  updateBadge();
}
window.addEventListener('DOMContentLoaded', setupBasketUI);
window.addToBasket = addToBasket;
window.addAutoItem = addAutoItem;
window.manualizeItem = manualizeItem;
window.getBasket = getBasket;

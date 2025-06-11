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
export function addToBasket(item) {
  const items = getBasket();
  items.push(item);
  saveBasket(items);
  updateBadge();
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

function showModel(modelUrl, poster) {
  if (!viewerModal || !viewerEl) return;
  if (poster) viewerEl.setAttribute('poster', poster);
  viewerEl.src = modelUrl;
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
    div.className = 'flex items-center mb-2';
    const img = document.createElement('img');
    img.src = it.snapshot || it.modelUrl || '';
    img.alt = 'Model';
    img.className = 'w-16 h-16 object-contain bg-[#2A2A2E] mr-2';
    img.addEventListener('click', () => showModel(it.modelUrl, it.snapshot));
    const btn = document.createElement('button');
    btn.textContent = 'Remove';
    btn.className = 'remove text-xs px-2 py-1 bg-red-600 rounded';
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
  btn.id = 'basket-button';
  btn.className =
    'fixed bottom-4 left-4 bg-[#30D5C8] text-black p-3 rounded-full shadow-lg z-50 border border-black';
  btn.innerHTML =
    '<i class="fas fa-shopping-basket"></i> <span id="basket-count" class="ml-1"></span>';
  btn.addEventListener('click', openBasket);
  document.body.appendChild(btn);

  const overlay = document.createElement('div');
  overlay.id = 'basket-overlay';
  overlay.className = 'fixed inset-0 bg-black/80 flex items-center justify-center hidden z-50';
  overlay.innerHTML = `\
    <div class="relative bg-[#2A2A2E] border border-white/10 rounded-3xl p-6 text-center w-72">
      <button id="basket-close" class="absolute top-2 right-2 text-white text-xl">
        <i class="fas fa-times-circle"></i>
      </button>
      <h2 class="text-xl font-semibold mb-2 text-white">Basket</h2>
      <div id="basket-list" class="mb-4"></div>
      <button id="basket-checkout" class="mb-2 px-4 py-2 rounded-md bg-[#30D5C8] text-[#1A1A1D]">Checkout</button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#basket-close').addEventListener('click', closeBasket);
  overlay.querySelector('#basket-checkout').addEventListener('click', () => {
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
    </div>`;
  document.body.appendChild(viewerOverlay);
  viewerModal = viewerOverlay;
  viewerEl = viewerOverlay.querySelector('model-viewer');
  viewerOverlay.querySelector('#basket-model-close').addEventListener('click', hideModel);

  updateBadge();
}
window.addEventListener('DOMContentLoaded', setupBasketUI);
window.addToBasket = addToBasket;
window.getBasket = getBasket;

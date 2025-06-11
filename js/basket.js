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
    const btn = document.createElement('button');
    btn.textContent = 'Remove';
    btn.className = 'remove text-xs px-2 py-1 bg-red-600 rounded';
    btn.addEventListener('click', () => removeFromBasket(idx));
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
    <div class="bg-[#2A2A2E] border border-white/10 rounded-3xl p-6 text-center w-72">
      <h2 class="text-xl font-semibold mb-2 text-white">Basket</h2>
      <div id="basket-list" class="mb-4"></div>
      <button id="basket-checkout" class="mb-2 px-4 py-2 rounded-md bg-[#30D5C8] text-[#1A1A1D]">Checkout</button>
      <button id="basket-close" class="px-3 py-1 rounded-md bg-[#30D5C8] text-[#1A1A1D]">Close</button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#basket-close').addEventListener('click', closeBasket);
  overlay.querySelector('#basket-checkout').addEventListener('click', () => {
    closeBasket();
    window.location.href = 'payment.html';
  });
  updateBadge();
}
window.addEventListener('DOMContentLoaded', setupBasketUI);
window.addToBasket = addToBasket;
window.getBasket = getBasket;

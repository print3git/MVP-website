(() => {
  try {
    const map = {
      print3Basket: "print2Basket",
      print3Model: "print2Model",
      print3JobId: "print2JobId",
      print3Material: "print2Material",
      print3Color: "print2Color",
      print3EtchName: "print2EtchName",
      print3Email: "print2Email",
      print3ShipName: "print2ShipName",
      print3ShipAddress: "print2ShipAddress",
      print3ShipCity: "print2ShipCity",
      print3ShipZip: "print2ShipZip",
      print3DiscountCode: "print2DiscountCode",
      print3CheckoutItems: "print2CheckoutItems",
      print3Prompt: "print2Prompt",
      print3Images: "print2Images",
      print3Saved: "print2Saved",
      print3CommunityOpen: "print2CommunityOpen",
      print3CommunityState: "print2CommunityState",
    };
    for (const [oldKey, newKey] of Object.entries(map)) {
      const val = localStorage.getItem(oldKey);
      if (val !== null && localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, val);
        localStorage.removeItem(oldKey);
      }
    }
  } catch {
    // ignore
  }
})();

const KEY = "print2Basket";
const API_BASE = (window.API_ORIGIN || "") + "/api";
let basket;
let fetchFn = typeof fetch !== "undefined" ? fetch : undefined;
let setTimeoutFn = typeof setTimeout !== "undefined" ? setTimeout : undefined;
let clearTimeoutFn =
  typeof clearTimeout !== "undefined" ? clearTimeout : undefined;
let setIntervalFn =
  typeof setInterval !== "undefined" ? setInterval : undefined;
let clearIntervalFn =
  typeof clearInterval !== "undefined" ? clearInterval : undefined;
let nowFn = () => Date.now();
export function getBasket() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    basket = Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(KEY);
    basket = [];
    const btn = document.getElementById("basket-button");
    if (btn) btn.hidden = false;
    const badge = document.getElementById("basket-count");
    if (badge) badge.hidden = true;
  }
  return basket;
}

function saveBasket(items = basket) {
  basket = items;
  localStorage.setItem(KEY, JSON.stringify(basket));
}
const RESERVE_MINS = 15;
let reserveInterval;
function notifyBasketChange() {
  window.dispatchEvent(new CustomEvent("basket-change"));
}
export async function addToBasket(item, opts = {}) {
  const items = getBasket();
  const expire = nowFn() + RESERVE_MINS * 60 * 1000;
  const entry = { ...item, auto: !!opts.auto, reserveUntil: expire };
  items.push(entry);
  saveBasket();
  const token = localStorage.getItem("token");
  if (token && item.jobId && typeof fetchFn === "function") {
    try {
      const res = await fetchFn(`${API_BASE}/cart/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jobId: item.jobId, quantity: 1 }),
      });
      const d = await res.json();
      if (d.id) {
        entry.serverId = d.id;
        saveBasket(items);
      }
    } catch {
      /* ignore network errors */
    }
  }
  updateBadge();
  renderList();
  startReservationTimer();
  const basketBtn = document.getElementById("basket-button");
  if (basketBtn) {
    basketBtn.classList.add("basket-bob");
    setTimeoutFn(() => basketBtn.classList.remove("basket-bob"), 800);
    if (window.__basketSound) {
      try {
        window.__basketSound.currentTime = 0;
        window.__basketSound.play();
      } catch {
        /* ignore play errors */
      }
    }
  }
  notifyBasketChange();
  return entry.serverId;
}

export function addAutoItem(item) {
  const items = getBasket();
  const idx = items.findIndex((it) => it.auto);
  if (idx !== -1) {
    items.splice(idx, 1);
  }
  items.push({ ...item, auto: true });
  saveBasket();
  updateBadge();
  renderList();
  notifyBasketChange();
}

export function manualizeItem(predicate) {
  const items = getBasket();
  const idx = items.findIndex((it) => it.auto && predicate(it));
  if (idx !== -1) {
    items[idx].auto = false;
    saveBasket();
  }
  updateBadge();
  renderList();
  notifyBasketChange();
}
export function removeFromBasket(index) {
  const items = getBasket();
  const [removed] = items.splice(index, 1);
  saveBasket();
  const token = localStorage.getItem("token");
  if (token && removed?.serverId && typeof fetchFn === "function") {
    try {
      const res = fetchFn(`${API_BASE}/cart/items/${removed.serverId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res && typeof res.catch === "function") {
        res.catch(() => {});
      }
    } catch {
      /* ignore network errors */
    }
  }
  try {
    const arr = JSON.parse(localStorage.getItem("print2CheckoutItems"));
    if (Array.isArray(arr) && index >= 0 && index < arr.length) {
      arr.splice(index, 1);
      localStorage.setItem("print2CheckoutItems", JSON.stringify(arr));
    }
  } catch {}
  updateBadge();
  renderList();
  notifyBasketChange();
}
export function clearBasket() {
  saveBasket([]);
  localStorage.removeItem("print2CheckoutItems");
  const token = localStorage.getItem("token");
  if (token && typeof fetchFn === "function") {
    try {
      const res = fetchFn(`${API_BASE}/cart`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res && typeof res.catch === "function") {
        res.catch(() => {});
      }
    } catch {
      /* ignore network errors */
    }
  }
  updateBadge();
  renderList();
  notifyBasketChange();
}
function updateBadge() {
  const badge = document.getElementById("basket-count");
  if (badge) {
    const n = getBasket().length;
    badge.textContent = n > 0 ? String(n) : "";
    badge.hidden = n === 0;
  }
}

async function syncServerCart() {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetchFn(`${API_BASE}/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (Array.isArray(data.items)) {
      const mapped = data.items.map((it) => ({
        jobId: it.job_id,
        quantity: it.quantity,
        serverId: it.id,
        modelUrl: it.model_url,
        snapshot: it.snapshot,
      }));
      saveBasket(mapped);
      updateBadge();
      renderList();
    }
  } catch {}
}

function startReservationTimer() {
  clearIntervalFn(reserveInterval);
  const label = document.getElementById("basket-reserve");
  if (!label) return;
  function tick() {
    const items = getBasket();
    if (!items.length) {
      label.classList.add("hidden");
      clearIntervalFn(reserveInterval);
      return;
    }
    const expire = Math.min(...items.map((i) => i.reserveUntil || 0));
    const diff = expire - nowFn();
    if (diff <= 0) {
      label.textContent = "Queue slot expired";
      clearIntervalFn(reserveInterval);
      return;
    }
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    const pos = items.length;
    label.innerHTML = `Your slot in today's print queue expires in ${mins}:${String(secs).padStart(2, "0")} <span class="text-white">(Queue position: ${pos})</span>`;
    label.classList.remove("hidden");
  }
  tick();
  reserveInterval = setIntervalFn(tick, 1000);
}
let viewerModal;
let viewerEl;
let viewerCheckoutBtn;
let viewerTierToggle;

function showModel(modelUrl, poster, jobId) {
  if (!viewerModal || !viewerEl) return;
  if (poster) viewerEl.setAttribute("poster", poster);
  viewerEl.src = modelUrl;
  if (viewerCheckoutBtn) {
    viewerCheckoutBtn.dataset.model = modelUrl || "";
    viewerCheckoutBtn.dataset.job = jobId || "";
  }
  viewerModal.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
}

function hideModel() {
  if (!viewerModal) return;
  viewerModal.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

function renderList() {
  const list = document.getElementById("basket-list");
  if (!list) return;
  list.innerHTML = "";
  const items = getBasket();
  if (items.length === 0) {
    list.innerHTML = '<p class="text-white">Basket empty</p>';
    return;
  }
  items.forEach((it, idx) => {
    const div = document.createElement("div");
    div.className = "relative group";

    const img = document.createElement("img");
    img.src = it.snapshot || it.modelUrl || "";
    img.alt = "Model";
    img.className =
      "w-24 h-24 object-cover rounded-lg bg-[#2A2A2E] border border-white/20 cursor-pointer";
    img.addEventListener("click", () =>
      showModel(it.modelUrl, it.snapshot, it.jobId),
    );

    const btn = document.createElement("button");
    btn.textContent = "Remove";
    btn.type = "button";

    btn.className =
      "remove absolute bottom-1 right-1 text-xs px-2 py-1 bg-red-600 rounded opacity-80 group-hover:opacity-100";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeFromBasket(idx);
      renderList();
    });

    div.appendChild(img);
    div.appendChild(btn);
    list.appendChild(div);
  });
}
function openBasket() {
  renderList();
  document.getElementById("basket-overlay")?.classList.remove("hidden");
  startReservationTimer();
}
function closeBasket() {
  document.getElementById("basket-overlay")?.classList.add("hidden");
}
export function setupBasketUI() {
  // Trigger basket loading to clear any corrupted storage before UI setup
  getBasket();
  if (!document.getElementById("basket-bob-style")) {
    const style = document.createElement("style");
    style.id = "basket-bob-style";
    style.textContent = `@keyframes basketBob {0%,100%{transform:translateY(0);}50%{transform:translateY(-2rem);}}.basket-bob{animation:basketBob 0.8s ease;}`;
    document.head.appendChild(style);
  }
  if (!window.__basketSound) {
    const audio = new Audio("sounds/click.mp3");
    audio.preload = "auto";
    window.__basketSound = audio;
  }
  let btn = document.getElementById("basket-button");
  if (!btn) {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "fixed bottom-3 right-4 bg-[#30D5C8] text-black p-3 rounded-full shadow-lg z-50 border-2 border-black";
    btn.innerHTML =
      '<i class="fas fa-shopping-basket"></i> <span class="ml-1"></span>';
    document.body.appendChild(btn);
  }
  btn.id = "basket-button";
  btn.setAttribute("data-testid", "basket-icon");
  btn.addEventListener("click", openBasket);
  let count = btn.querySelector("#basket-count") || btn.querySelector("span");
  if (!count) {
    count = document.createElement("span");
    count.className = "ml-1";
    btn.appendChild(count);
  }
  count.id = "basket-count";
  count.setAttribute("data-testid", "basket-count");

  const overlay = document.createElement("div");
  overlay.id = "basket-overlay";
  overlay.className =
    "fixed inset-0 bg-black/80 flex items-center justify-center hidden z-50";
  overlay.innerHTML = `\

    <div class="relative bg-[#2A2A2E] border border-white/10 rounded-3xl p-6 text-center w-72">
      <button id="basket-close" type="button" class="absolute -top-1 -right-1 text-white text-4xl w-9 h-9 flex items-center justify-center">
        <i class="fas fa-times-circle"></i>
      </button>
      <h2 class="text-xl font-semibold mb-2 text-white">Basket</h2>
      <div id="basket-list" class="grid grid-cols-2 gap-3 mb-2"></div>
      <div id="basket-reserve" class="hidden text-sm text-[#30D5C8] mb-2"></div>
      <button id="basket-checkout" type="button" class="mb-2 font-bold py-2 px-4 rounded-full shadow-md bg-[#30D5C8] text-[#1A1A1D] border-2 border-black">Checkout →</button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("#basket-close").addEventListener("click", closeBasket);
  overlay.querySelector("#basket-checkout").addEventListener("click", () => {
    const items = getBasket();
    if (items.length) {
      const first = items[0];
      if (first.modelUrl) {
        localStorage.setItem("print2Model", first.modelUrl);
      }
      if (first.jobId) {
        localStorage.setItem("print2JobId", first.jobId);
      } else {
        localStorage.removeItem("print2JobId");
      }
    }
    // Save basket contents for payment page navigation
    try {
      const existing =
        JSON.parse(localStorage.getItem("print2CheckoutItems")) || [];
      const checkoutItems = items.map((it, idx) => {
        const prev = existing[idx] || {};
        return {
          modelUrl: it.modelUrl,
          jobId: it.jobId,
          snapshot: it.snapshot || prev.snapshot || "",
          material:
            prev.material || localStorage.getItem("print2Material") || "single",
          color: prev.color || null,
          // Preserve personalised etch text per model for the payment page.
          etchName:
            prev.etchName || localStorage.getItem("print2EtchName") || "",
        };
      });
      localStorage.setItem(
        "print2CheckoutItems",
        JSON.stringify(checkoutItems),
      );
    } catch {}
    closeBasket();
    if (location.pathname.endsWith("addons.html")) {
      sessionStorage.setItem("fromAddons", "1");
    } else if (location.pathname.endsWith("marketplace.html")) {
      sessionStorage.setItem("fromMarketplace", "1");
    }
    window.location.href = "payment.html";
  });

  overlay.addEventListener("click", (e) => {
    const container = overlay.querySelector("div");
    if (!container.contains(e.target) && !btn.contains(e.target)) {
      closeBasket();
    }
  });

  const viewerOverlay = document.createElement("div");
  viewerOverlay.id = "basket-model-modal";
  viewerOverlay.className =
    "fixed inset-0 bg-black/80 flex items-center justify-center hidden z-50";
  viewerOverlay.innerHTML = `
    <div class="relative w-11/12 max-w-3xl">
      <button id="basket-model-close" class="absolute -top-4 -right-4 w-[4.5rem] h-[4.5rem] rounded-full bg-white text-black flex items-center justify-center z-50" type="button">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="w-10 h-10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" /></svg>
        <span class="sr-only">Close</span>
      </button>
      <model-viewer src="" alt="3D model preview" poster="images/astro-image.png" environment-image="https://modelviewer.dev/shared-assets/environments/neutral.hdr" camera-controls auto-rotate crossOrigin="anonymous" class="w-full h-96 bg-[#2A2A2E] rounded-xl"></model-viewer>
      <div id="basket-checkout-container" class="absolute bottom-4 right-4 flex flex-col items-center">
        <div id="basket-tier-toggle" class="flex gap-1 mb-2 text-xs">
          <button type="button" data-tier="bronze" class="basket-tier-option px-2 py-1 rounded-full border border-white/20 opacity-50 text-black" style="background-color: #cd7f32">1 colour</button>
          <button type="button" data-tier="silver" disabled aria-disabled="true" class="basket-tier-option px-2 py-1 rounded-full border border-white/20 opacity-50 text-black cursor-not-allowed" style="background-color: #c0c0c0">multicolour</button>
          <button type="button" data-tier="gold" disabled aria-disabled="true" class="basket-tier-option px-2 py-1 rounded-full border border-white/20 opacity-50 text-black cursor-not-allowed" style="background-color: #ffd700">premium</button>
        </div>
  <a id="basket-model-checkout" href="payment.html" class="font-bold py-2 px-5 rounded-full shadow-md transition border-2 border-black" style="background-color: #30D5C8; color: #1A1A1D" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">Print for £39.99 →</a>
      </div>
    </div>`;
  document.body.appendChild(viewerOverlay);
  viewerModal = viewerOverlay;
  viewerEl = viewerOverlay.querySelector("model-viewer");
  const fallbackModelError = (e) => {
    const img = document.createElement("img");
    img.src = "images/astro-image.png";
    img.alt = "3D model preview unavailable";
    img.className = e.target.className;
    e.target.replaceWith(img);
  };
  viewerEl.addEventListener("error", fallbackModelError);
  viewerCheckoutBtn = viewerOverlay.querySelector("#basket-model-checkout");
  viewerTierToggle = viewerOverlay.querySelector("#basket-tier-toggle");
  viewerOverlay
    .querySelector("#basket-model-close")
    .addEventListener("click", hideModel);
  viewerCheckoutBtn.addEventListener("click", () => {
    const model = viewerCheckoutBtn.dataset.model;
    const job = viewerCheckoutBtn.dataset.job;
    if (model) localStorage.setItem("print2Model", model);
    if (job) {
      localStorage.setItem("print2JobId", job);
    } else {
      localStorage.removeItem("print2JobId");
    }
  });
  function setTier(tier) {
    viewerTierToggle?.querySelectorAll("button[data-tier]").forEach((btn) => {
      const active = btn.dataset.tier === tier;
      btn.classList.toggle("ring-2", active);
      btn.classList.toggle("ring-white", active);
      btn.classList.toggle("opacity-100", active);
      btn.classList.toggle("opacity-50", !active);
    });
    if (viewerCheckoutBtn) {
      const price = tier === "bronze" ? 29.99 : tier === "gold" ? 79.99 : 39.99;
      viewerCheckoutBtn.textContent = `Print for £${price.toFixed(2)} →`;
    }
    const material =
      tier === "bronze" ? "single" : tier === "gold" ? "premium" : "multi";
    localStorage.setItem("print2Material", material);
  }
  viewerTierToggle?.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-tier]");
    if (btn && !btn.disabled) setTier(btn.dataset.tier);
  });
  setTier("bronze");

  updateBadge();
  syncServerCart();
}
export function createBasket(
  storage = typeof window !== "undefined" ? window.localStorage : undefined,
  opts = {},
) {
  try {
    const map = {
      print3Basket: "print2Basket",
      print3Model: "print2Model",
      print3JobId: "print2JobId",
      print3Material: "print2Material",
      print3Color: "print2Color",
      print3EtchName: "print2EtchName",
      print3Email: "print2Email",
      print3ShipName: "print2ShipName",
      print3ShipAddress: "print2ShipAddress",
      print3ShipCity: "print2ShipCity",
      print3ShipZip: "print2ShipZip",
      print3DiscountCode: "print2DiscountCode",
      print3CheckoutItems: "print2CheckoutItems",
      print3Prompt: "print2Prompt",
      print3Images: "print2Images",
      print3Saved: "print2Saved",
      print3CommunityOpen: "print2CommunityOpen",
      print3CommunityState: "print2CommunityState",
    };
    for (const [oldKey, newKey] of Object.entries(map)) {
      const val = storage?.getItem?.(oldKey);
      if (val !== null && storage?.getItem?.(newKey) === null) {
        storage.setItem(newKey, val);
        storage.removeItem(oldKey);
      }
    }
  } catch {}
  const {
    fetchFn: fetchOverride = typeof fetch !== "undefined" ? fetch : undefined,
    setTimeoutFn: setTimeoutOverride = typeof setTimeout !== "undefined"
      ? setTimeout
      : undefined,
    clearTimeoutFn: clearTimeoutOverride = typeof clearTimeout !== "undefined"
      ? clearTimeout
      : undefined,
    setIntervalFn: setIntervalOverride = typeof setInterval !== "undefined"
      ? setInterval
      : undefined,
    clearIntervalFn: clearIntervalOverride = typeof clearInterval !==
    "undefined"
      ? clearInterval
      : undefined,
    nowFn: nowOverride = () => Date.now(),
  } = opts;
  const bind =
    (fn) =>
    (...args) => {
      const originalStorage = globalThis.localStorage;
      const originals = {
        fetchFn,
        setTimeoutFn,
        clearTimeoutFn,
        setIntervalFn,
        clearIntervalFn,
        nowFn,
      };
      globalThis.localStorage = storage;
      fetchFn = fetchOverride;
      setTimeoutFn = setTimeoutOverride;
      clearTimeoutFn = clearTimeoutOverride;
      setIntervalFn = setIntervalOverride;
      clearIntervalFn = clearIntervalOverride;
      nowFn = nowOverride;
      const result = fn(...args);
      const restore = () => {
        globalThis.localStorage = originalStorage;
        ({
          fetchFn,
          setTimeoutFn,
          clearTimeoutFn,
          setIntervalFn,
          clearIntervalFn,
          nowFn,
        } = originals);
      };
      if (result && typeof result.then === "function") {
        return result.finally(restore);
      }
      restore();
      return result;
    };
  return {
    getBasket: bind(getBasket),
    addToBasket: bind(addToBasket),
    addAutoItem: bind(addAutoItem),
    manualizeItem: bind(manualizeItem),
    removeFromBasket: bind(removeFromBasket),
    clearBasket: bind(clearBasket),
    setupBasketUI: bind(setupBasketUI),
    syncServerCart: bind(syncServerCart),
  };
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", setupBasketUI);
  } else {
    setupBasketUI();
  }
}
if (typeof window !== "undefined") {
  window.addToBasket = addToBasket;
  window.addAutoItem = addAutoItem;
  window.manualizeItem = manualizeItem;
  window.getBasket = getBasket;
  window.syncServerCart = syncServerCart;
}

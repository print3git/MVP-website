const KEY = "print3Basket";
const API_BASE = (window.API_ORIGIN || "") + "/api";
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
const RESERVE_MINS = 15;
let reserveInterval;
function notifyBasketChange() {
  window.dispatchEvent(new CustomEvent("basket-change"));
}
export function addToBasket(item, opts = {}) {
  const items = getBasket();
  const expire = Date.now() + RESERVE_MINS * 60 * 1000;
  const entry = { ...item, auto: !!opts.auto, reserveUntil: expire };
  items.push(entry);
  saveBasket(items);
  const token = localStorage.getItem("token");
  if (token && item.jobId) {
    fetch(`${API_BASE}/cart/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ jobId: item.jobId, quantity: 1 }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.id) {
          const list = getBasket();
          list[list.length - 1].serverId = d.id;
          saveBasket(list);
        }
      })
      .catch(() => {});
  }
  updateBadge();
  renderList();
  startReservationTimer();
  const basketBtn = document.getElementById("basket-button");
  if (basketBtn) {
    basketBtn.classList.add("basket-bob");
    setTimeout(() => basketBtn.classList.remove("basket-bob"), 600);
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
  notifyBasketChange();
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
  notifyBasketChange();
}
export function removeFromBasket(index) {
  const items = getBasket();
  const [removed] = items.splice(index, 1);
  saveBasket(items);
  const token = localStorage.getItem("token");
  if (token && removed?.serverId) {
    fetch(`${API_BASE}/cart/items/${removed.serverId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  try {
    const arr = JSON.parse(localStorage.getItem("print3CheckoutItems"));
    if (Array.isArray(arr) && index >= 0 && index < arr.length) {
      arr.splice(index, 1);
      localStorage.setItem("print3CheckoutItems", JSON.stringify(arr));
    }
  } catch {}
  updateBadge();
  renderList();
  notifyBasketChange();
}
export function clearBasket() {
  saveBasket([]);
  localStorage.removeItem("print3CheckoutItems");
  const token = localStorage.getItem("token");
  if (token) {
    fetch(`${API_BASE}/cart`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  updateBadge();
  renderList();
  notifyBasketChange();
}
function updateBadge() {
  const badge = document.getElementById("basket-count");
  if (badge) {
    const n = getBasket().length;
    badge.textContent = String(n);
    badge.hidden = n === 0;
  }
}

async function syncServerCart() {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (Array.isArray(data.items)) {
      const mapped = data.items.map((it) => ({
        jobId: it.job_id,
        quantity: it.quantity,
        serverId: it.id,
      }));
      saveBasket(mapped);
      updateBadge();
      renderList();
    }
  } catch {}
}

function startReservationTimer() {
  clearInterval(reserveInterval);
  const label = document.getElementById("basket-reserve");
  if (!label) return;
  function tick() {
    const items = getBasket();
    if (!items.length) {
      label.classList.add("hidden");
      clearInterval(reserveInterval);
      return;
    }
    const expire = Math.min(...items.map((i) => i.reserveUntil || 0));
    const diff = expire - Date.now();
    if (diff <= 0) {
      label.textContent = "Queue slot expired";
      clearInterval(reserveInterval);
      return;
    }
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    label.textContent = `Your slot in today's print queue expires in ${mins}:${String(secs).padStart(2, "0")}`;
    label.classList.remove("hidden");
  }
  tick();
  reserveInterval = setInterval(tick, 1000);
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
    });

    div.appendChild(img);
    div.appendChild(btn);
    list.appendChild(div);
  });
}
function openBasket() {
  renderList();
  const queueLabel = document.getElementById("basket-queue");
  if (queueLabel) {
    const pos = getBasket().length;
    queueLabel.textContent = pos ? `Queue position: ${pos}` : "";
  }
  document.getElementById("basket-overlay")?.classList.remove("hidden");
  startReservationTimer();
}
function closeBasket() {
  document.getElementById("basket-overlay")?.classList.add("hidden");
}
export function setupBasketUI() {
  if (!document.getElementById("basket-bob-style")) {
    const style = document.createElement("style");
    style.id = "basket-bob-style";
    style.textContent = `@keyframes basketBob {0%,100%{transform:translateY(0);}50%{transform:translateY(-1rem);}}.basket-bob{animation:basketBob 0.6s ease;}`;
    document.head.appendChild(style);
  }
  if (!window.__basketSound) {
    const audio = new Audio("sounds/click.mp3");
    audio.preload = "auto";
    window.__basketSound = audio;
  }
  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "basket-button";
  btn.className =
    "fixed bottom-4 right-4 bg-[#30D5C8] text-black p-3 rounded-full shadow-lg z-50 border-2 border-black";
  btn.innerHTML =
    '<i class="fas fa-shopping-basket"></i> <span id="basket-count" class="ml-1"></span>';
  btn.addEventListener("click", openBasket);
  document.body.appendChild(btn);

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
      <div id="basket-queue" class="text-sm text-gray-200 mb-2"></div>
      <button id="basket-checkout" type="button" class="mb-2 font-bold py-2 px-4 rounded-full shadow-md bg-[#30D5C8] text-[#1A1A1D] border-2 border-black">Checkout</button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("#basket-close").addEventListener("click", closeBasket);
  overlay.querySelector("#basket-checkout").addEventListener("click", () => {
    const items = getBasket();
    if (items.length === 1) {
      const item = items[0];
      if (item.modelUrl) {
        localStorage.setItem("print3Model", item.modelUrl);
      }
      if (item.jobId) {
        localStorage.setItem("print3JobId", item.jobId);
      } else {
        localStorage.removeItem("print3JobId");
      }
    }
    // Save basket contents for payment page navigation
    try {
      const existing =
        JSON.parse(localStorage.getItem("print3CheckoutItems")) || [];
      const checkoutItems = items.map((it, idx) => {
        const prev = existing[idx] || {};
        return {
          modelUrl: it.modelUrl,
          jobId: it.jobId,
          snapshot: it.snapshot || prev.snapshot || "",
          material:
            prev.material || localStorage.getItem("print3Material") || "multi",
          color: prev.color || null,
          // Preserve personalised etch text per model for the payment page.
          etchName:
            prev.etchName || localStorage.getItem("print3EtchName") || "",
        };
      });
      localStorage.setItem(
        "print3CheckoutItems",
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
      <model-viewer src="" alt="3D model preview" environment-image="https://modelviewer.dev/shared-assets/environments/neutral.hdr" camera-controls auto-rotate crossOrigin="anonymous" class="w-full h-96 bg-[#2A2A2E] rounded-xl"></model-viewer>
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
  viewerEl = viewerOverlay.querySelector("model-viewer");
  viewerCheckoutBtn = viewerOverlay.querySelector("#basket-model-checkout");
  viewerTierToggle = viewerOverlay.querySelector("#basket-tier-toggle");
  viewerOverlay
    .querySelector("#basket-model-close")
    .addEventListener("click", hideModel);
  viewerCheckoutBtn.addEventListener("click", () => {
    const model = viewerCheckoutBtn.dataset.model;
    const job = viewerCheckoutBtn.dataset.job;
    if (model) localStorage.setItem("print3Model", model);
    if (job) {
      localStorage.setItem("print3JobId", job);
    } else {
      localStorage.removeItem("print3JobId");
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
      const price = tier === "bronze" ? 29.99 : tier === "gold" ? 59.99 : 39.99;
      viewerCheckoutBtn.textContent = `Print for £${price.toFixed(2)} →`;
    }
    const material =
      tier === "bronze" ? "single" : tier === "gold" ? "premium" : "multi";
    localStorage.setItem("print3Material", material);
  }
  viewerTierToggle?.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-tier]");
    if (btn) setTier(btn.dataset.tier);
  });
  const storedMat = localStorage.getItem("print3Material");
  if (storedMat === "single") setTier("bronze");
  else if (storedMat === "premium") setTier("gold");
  else setTier("silver");

  updateBadge();
  syncServerCart();
}
window.addEventListener("DOMContentLoaded", setupBasketUI);
window.addToBasket = addToBasket;
window.addAutoItem = addAutoItem;
window.manualizeItem = manualizeItem;
window.getBasket = getBasket;
window.syncServerCart = syncServerCart;

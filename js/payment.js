// Initialize Stripe after the library loads to avoid breaking the rest of the
// page if the network request for Stripe fails. This variable will be assigned
// once the DOM content is ready.
let stripe = null;

// Use a lightweight fallback model and upgrade to the high detail version after load.
const FALLBACK_GLB_LOW =
  "https://modelviewer.dev/shared-assets/models/Astronaut.glb";
const FALLBACK_GLB_HIGH =
  "https://modelviewer.dev/shared-assets/models/Astronaut.glb";
const FALLBACK_GLB = FALLBACK_GLB_LOW;
const PRICES = {
  single: 2999,
  multi: 3999,
  premium: 7999,
};

const TWO_PRINT_DISCOUNT = 700;
let PRICING_VARIANT = localStorage.getItem("pricingVariant");
if (!PRICING_VARIANT) {
  PRICING_VARIANT = Math.random() < 0.5 ? "A" : "B";
  localStorage.setItem("pricingVariant", PRICING_VARIANT);
}
const PRINT_CLUB_PRICE = 14999;
const FIRST_MONTH_DISCOUNT = 0.5;
const ANNUAL_DISCOUNT = 0.9;
const PRINT_CLUB_ANNUAL_PRICE = Math.round(
  PRINT_CLUB_PRICE * 12 * ANNUAL_DISCOUNT,
);
let selectedPrice = PRICES.multi;
const SINGLE_BORDER_COLOR = "#60a5fa";
const API_BASE = (window.API_ORIGIN || "") + "/api";
// Time zone used to reset local purchase counts at 1 AM Eastern
const TZ = "America/New_York";
let flashTimerId = null;
let flashSale = null;
let checkoutItems = [];
let currentIndex = 0;
const NEXT_PROMPTS = [
  "cute robot figurine",
  "ornate chess piece",
  "geometric flower vase",
];

function getUserIdFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.id || null;
  } catch {
    return null;
  }
}

async function fetchPaymentInit() {
  try {
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`${API_BASE}/payment-init`, { headers });
    if (res.ok) return await res.json();
  } catch {}
  return {};
}

// Restore previously selected material option and colour
let storedMaterial = localStorage.getItem("print3Material");
const storedColor = localStorage.getItem("print3Color");
const personalise = qs("personalise");
if (personalise !== null) {
  storedMaterial = "multi";
  localStorage.setItem("print3Material", storedMaterial);
}
if (storedMaterial && PRICES[storedMaterial]) {
  selectedPrice = PRICES[storedMaterial];
}

function selectedMaterialValue() {
  const r = document.querySelector(
    '#material-options input[name="material"]:checked',
  );
  return r ? r.value : "multi";
}

function updateFlashSaleBanner() {
  const flashBanner = document.getElementById("flash-banner");
  const flashTimer = document.getElementById("flash-timer");
  if (!flashBanner || !flashTimer) return;
  if (!flashSale) {
    // No server-driven flash sale is active. Don't hide any existing banner
    // (e.g. the local 5% discount) when the material selection changes.
    return;
  }
  const end = new Date(flashSale.end_time).getTime();
  if (Date.now() >= end || selectedMaterialValue() !== flashSale.product_type) {
    flashBanner.hidden = true;
    return;
  }
  flashBanner.innerHTML = `Flash sale! <span id="flash-timer">5:00</span> left - ${flashSale.discount_percent}% off`;
  const timerEl = flashBanner.querySelector("#flash-timer");
  const update = () => {
    const diff = end - Date.now();
    if (diff <= 0 || selectedMaterialValue() !== flashSale.product_type) {
      flashBanner.hidden = true;
      if (flashTimerId) {
        clearTimeout(flashTimerId);
        flashTimerId = null;
      }
      return;
    }
    const diffSec = Math.ceil(diff / 1000);
    const m = Math.floor(diffSec / 60);
    const s = String(diffSec % 60).padStart(2, "0");
    timerEl.textContent = `${m}:${s}`;
    flashTimerId = setTimeout(update, 1000);
  };
  update();
  flashBanner.hidden = false;
}

async function fetchFlashSale() {
  try {
    const resp = await fetch(`${API_BASE}/flash-sale`);
    if (resp.ok) {
      flashSale = await resp.json();
      updateFlashSaleBanner();
      return;
    }
  } catch {}
  startFlashDiscount();
}

function ensureModelViewerLoaded() {
  if (window.customElements?.get("model-viewer")) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.type = "module";
    s.src =
      "https://cdn.jsdelivr.net/npm/@google/model-viewer@1.12.0/dist/model-viewer.min.js";
    document.head.appendChild(s);
    resolve();
  });
}

function getCycleKey() {
  const now = new Date();
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const hourFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    hour12: false,
  });
  const dateStr = dateFmt.format(now);
  const hour = parseInt(hourFmt.format(now), 10);
  if (hour < 1) {
    const prev = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return dateFmt.format(prev);
  }
  return dateStr;
}

function resetPurchaseCount() {
  const key = getCycleKey();
  if (localStorage.getItem("slotCycle") !== key) {
    localStorage.setItem("slotCycle", key);
    localStorage.setItem("slotPurchases", "0");
  }
}

function getPurchaseCount() {
  resetPurchaseCount();
  const n = parseInt(localStorage.getItem("slotPurchases"), 10);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function recordPurchase() {
  resetPurchaseCount();
  const n = getPurchaseCount();
  localStorage.setItem("slotPurchases", String(n + 1));
  const sessionId = localStorage.getItem("adSessionId");
  const subreddit = localStorage.getItem("adSubreddit");
  if (sessionId && subreddit) {
    fetch(`${API_BASE}/track/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, subreddit, step: "complete" }),
    }).catch(() => {});
  }
}

function adjustedSlots(base) {
  const n = getPurchaseCount();
  return Math.max(0, base - n);
}

function computeSlotsByTime() {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour12: false,
    hour: "numeric",
  });
  const hour = parseInt(dtf.format(new Date()), 10);
  if (hour >= 1 && hour < 4) return 9;
  if (hour >= 4 && hour < 7) return 8;
  if (hour >= 7 && hour < 10) return 7;
  if (hour >= 10 && hour < 13) return 6;
  if (hour >= 13 && hour < 16) return 5;
  if (hour >= 16 && hour < 19) return 4;
  if (hour >= 19 && hour < 22) return 3;
  if (hour >= 22 && hour < 24) return 2;
  return 1;
}

function computeColorSlotsByTime() {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour12: false,
    hour: "numeric",
  });
  const hour = parseInt(dtf.format(new Date()), 10);
  if (hour >= 15) return 3;
  if (hour >= 12) return 4;
  if (hour >= 9) return 5;
  return 6;
}

function qs(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

async function loadCheckoutCredits() {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/subscription/credits`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    const container = document.getElementById("credit-option");
    const span = document.getElementById("credits-remaining");
    if (container && span) {
      span.textContent = data.remaining;
      if (data.remaining > 0) container.classList.remove("hidden");
      else container.classList.add("hidden");
    }
  } catch {}
}

async function fetchCampaignBundle() {
  try {
    const res = await fetch(`${API_BASE}/campaign`);
    if (!res.ok) return;
    const data = await res.json();
    const banner = document.getElementById("bundle-banner");
    if (banner && data.bundle && !banner.dataset.set) {
      banner.textContent = `${data.bundle.name} - ${data.bundle.discount_percent}% off`;
      banner.classList.remove("hidden");
      banner.dataset.set = "1";
    }
  } catch {}
}

async function createCheckout(
  quantity,
  discount,
  discountCodes,
  shippingInfo,
  referral,
  etchName,
  useCredit,
) {
  const jobId = localStorage.getItem("print3JobId");
  const res = await fetch(`${API_BASE}/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jobId,
      price: selectedPrice,
      qty: quantity,
      discount,
      discountCodes,
      shippingInfo,
      referral,
      etchName,
      useCredit,
      productType: selectedMaterialValue(),
      utmSource: localStorage.getItem("utm_source") || undefined,
      utmMedium: localStorage.getItem("utm_medium") || undefined,
      utmCampaign: localStorage.getItem("utm_campaign") || undefined,
      adSubreddit: localStorage.getItem("adSubreddit") || undefined,
    }),
  });
  const data = await res.json();
  return data;
}

function startFlashDiscount() {
  const flashBanner = document.getElementById("flash-banner");
  const flashTimer = document.getElementById("flash-timer");
  if (!flashBanner || !flashTimer) return;

  let show = sessionStorage.getItem("flashDiscountShow");
  if (!show) {
    show = Math.random() < 0.5 ? "1" : "0";
    sessionStorage.setItem("flashDiscountShow", show);
  }
  if (show === "0") {
    flashBanner.hidden = true;
    localStorage.removeItem("flashDiscountEnd");
    return;
  }

  const endStr = localStorage.getItem("flashDiscountEnd");
  if (endStr === "0") {
    flashBanner.hidden = true;
    return;
  }
  let end = parseInt(endStr, 10);

  if (!Number.isFinite(end)) {
    end = Date.now() + 5 * 60 * 1000;
    localStorage.setItem("flashDiscountEnd", String(end));
  } else if (end <= Date.now()) {
    flashBanner.hidden = true;
    localStorage.setItem("flashDiscountEnd", "0");
    return;
  }

  if (flashTimerId) {
    return;
  }
  const update = () => {
    const diff = end - Date.now();
    if (diff <= 0) {
      flashBanner.hidden = true;
      localStorage.setItem("flashDiscountEnd", "0");
      if (flashTimerId) {
        clearTimeout(flashTimerId);
        flashTimerId = null;
      }
      return;
    }
    const diffSec = Math.ceil(diff / 1000);
    const m = Math.floor(diffSec / 60);
    const s = String(diffSec % 60).padStart(2, "0");
    flashTimer.textContent = `${m}:${s}`;
    flashTimerId = setTimeout(update, 1000);
  };

  update();
  flashBanner.hidden = false;
}
window.startFlashDiscount = startFlashDiscount;

async function initPaymentPage() {
  await ensureModelViewerLoaded();
  const referralId = localStorage.getItem("referrerId");
  if (window.setWizardStage) window.setWizardStage("purchase");
  const initData = await fetchPaymentInit();
  if (window.Stripe && initData.publishableKey) {
    try {
      stripe = window.Stripe(initData.publishableKey);
    } catch {}
  }

  const loader = document.getElementById("loader");
  const viewer = document.getElementById("viewer");
  const optOut = document.getElementById("opt-out");
  const emailEl = document.getElementById("checkout-email");
  const successMsg = document.getElementById("success");
  const cancelMsg = document.getElementById("cancel");
  const flashBanner = document.getElementById("flash-banner");
  const flashTimer = document.getElementById("flash-timer");
  const costEl = document.getElementById("cost-estimate");
  const etaEl = document.getElementById("eta-estimate");
  const slotEl = document.getElementById("slot-count");
  const colorSlotEl = document.getElementById("color-slot-count");
  const bulkSlotEl = document.getElementById("bulk-slot-count");
  const discountInput = document.getElementById("discount-code");
  const discountMsg = document.getElementById("discount-msg");
  const applyBtn = document.getElementById("apply-discount");
  const surpriseToggle = document.getElementById("surprise-toggle");
  const recipientFields = document.getElementById("recipient-fields");
  const qtySelect = document.getElementById("print-qty");
  const qtyDec = document.getElementById("qty-decrement");
  const qtyInc = document.getElementById("qty-increment");
  const bulkMsg = document.getElementById("bulk-discount-msg");
  const inputIds = [
    "ship-name",
    "etch-name",
    "checkout-email",
    "ship-address",
    "ship-city",
    "ship-zip",
    "discount-code",
  ];
  const highlightValid = (el) => {
    if (!el) return;
    const value = el.value.trim();
    let valid = !el.disabled && value !== "" && el.checkValidity();
    if (el.id === "checkout-email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      valid = valid && emailRegex.test(value);
    }
    if (valid) {
      el.classList.add("ring-2", "ring-green-500");
    } else {
      el.classList.remove("ring-2", "ring-green-500");
    }
  };

  fetchCampaignBundle();
  loadCheckoutCredits();
  if (referralId && discountMsg) {
    discountMsg.textContent = "Referral discount applied";
  }
  const materialRadios = document.querySelectorAll(
    '#material-options input[name="material"]',
  );
  const subscriptionRadios = document.querySelectorAll(
    '#subscription-choice input[name="printclub"]',
  );
  const priceSpan = document.getElementById("printclub-price");
  const annualSpan = document.getElementById("printclub-annual");
  const hasReferral = Boolean(localStorage.getItem("referrerId"));
  const updatePriceDisplay = () => {
    if (!priceSpan) return;
    const first =
      ((PRINT_CLUB_PRICE * FIRST_MONTH_DISCOUNT) / 100) *
      (hasReferral ? 0.9 : 1);
    priceSpan.textContent = `Join print2 pro £${first.toFixed(2)} first month`;
    if (annualSpan)
      annualSpan.textContent = `Annual £${(
        PRINT_CLUB_ANNUAL_PRICE / 100
      ).toFixed(2)}`;
  };
  updatePriceDisplay();
  const plan = qs("plan");
  if (plan === "printclub") {
    subscriptionRadios.forEach((r) => {
      if (r.value === "monthly") r.checked = true;
    });
  }
  const payBtn = document.getElementById("submit-payment");
  const priceBreakdown = document.getElementById("price-breakdown");
  const singleLabel = document.getElementById("single-label");
  const singleInput = document.getElementById("opt-single");
  const colorMenu = document.getElementById("single-color-menu");
  const singleButton = singleLabel?.querySelector("span");
  const etchInput = document.getElementById("etch-name");
  const etchContainer = document.getElementById("etch-name-container");
  const etchWarning = document.getElementById("etch-warning");
  const storedRadio = document.querySelector(
    `#material-options input[value="${storedMaterial}"]`,
  );
  if (storedRadio) storedRadio.checked = true;
  updateEtchVisibility(storedMaterial);
  if (personalise !== null && etchInput) {
    requestAnimationFrame(() => {
      etchInput.focus();
      etchInput.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
  if (storedMaterial === "single") {
    if (singleButton && storedColor) {
      singleButton.style.backgroundColor = storedColor;

      singleButton.style.borderColor = SINGLE_BORDER_COLOR;
    }
    if (colorMenu) {
      if (storedColor) colorMenu.classList.add("hidden");
      else colorMenu.classList.remove("hidden");
    }
  } else if (colorMenu) {
    colorMenu.classList.add("hidden");
  }
  initPlaceAutocomplete();
  let discountCodes = [];
  let discountValue = 0;
  let originalColor = null;
  let originalTextures = null;

  function hexToFactor(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m
      ? [
          parseInt(m[1], 16) / 255,
          parseInt(m[2], 16) / 255,
          parseInt(m[3], 16) / 255,
          1,
        ]
      : null;
  }

  function applyModelColor(factor, restore = false) {
    if (!viewer || !factor) return;
    const apply = () => {
      if (!viewer.model) return;
      viewer.model.materials.forEach((mat, i) => {
        const pbr = mat.pbrMetallicRoughness;
        if (!pbr) return;
        if (pbr.setBaseColorFactor) pbr.setBaseColorFactor(factor);
        const texObj = pbr.baseColorTexture;
        if (texObj?.setTexture) {
          const tex = restore ? originalTextures?.[i] || null : null;
          texObj.setTexture(tex);
        }
      });
    };
    if (viewer.model) apply();
    else viewer.addEventListener("load", apply, { once: true });
  }

  function captureOriginal() {
    const mats = viewer.model?.materials || [];
    const mat = mats[0];
    if (mat?.pbrMetallicRoughness?.baseColorFactor)
      originalColor = mat.pbrMetallicRoughness.baseColorFactor.slice();
    originalTextures = mats.map(
      (m) => m.pbrMetallicRoughness?.baseColorTexture?.texture || null,
    );
    if (storedMaterial === "single" && storedColor) {
      const factor = hexToFactor(storedColor);
      if (factor) applyModelColor(factor);
    }
  }

  viewer.addEventListener("load", captureOriginal, { once: true });
  if (viewer.model) captureOriginal();

  function updateEtchVisibility(val) {
    if (!etchInput || !etchContainer) return;
    const warning = document.getElementById("etch-warning");
    if (val === "multi" || val === "premium") {
      etchInput.disabled = false;
      etchInput.classList.remove(
        "cursor-not-allowed",
        "border-[#30D5C8]",
        "bg-[#30D5C8]/20",
        "text-[#30D5C8]",
        "placeholder-[#30D5C8]",
        "border-amber-500",
        "bg-amber-900/20",
        "text-amber-300",
        "placeholder-amber-300",
      );
      if (warning) warning.classList.add("hidden");
    } else {
      etchInput.disabled = true;
      etchInput.value = "";
      etchInput.classList.add("cursor-not-allowed");
      etchInput.classList.add(
        "border-[#30D5C8]",
        "bg-[#30D5C8]/20",
        "text-[#30D5C8]",
        "placeholder-[#30D5C8]",
      );
      if (warning) warning.classList.remove("hidden");
    }
  }

  function updatePayButton() {
    if (!payBtn) return;
    const planChoice = Array.from(subscriptionRadios).find(
      (r) => r.checked,
    )?.value;
    if (planChoice === "monthly") {
      const hasReferral = Boolean(localStorage.getItem("referrerId"));
      const price =
        ((PRINT_CLUB_PRICE * FIRST_MONTH_DISCOUNT) / 100) *
        (hasReferral ? 0.9 : 1);
      payBtn.textContent = `Join print2 pro – Pay £${price.toFixed(2)}`;
    } else if (planChoice === "annual") {
      payBtn.textContent = `Join print2 pro – Pay £${(
        PRINT_CLUB_ANNUAL_PRICE / 100
      ).toFixed(2)}`;
    } else {
      const qty = Math.max(1, parseInt(qtySelect?.value || "2", 10));
      let total = selectedPrice * qty;
      if (qty > 1) {
        total -= TWO_PRINT_DISCOUNT;
      }
      payBtn.textContent = `Pay £${(total / 100).toFixed(2)} (${qty} prints)`;
    }
    updatePriceBreakdown();
  }

  function updatePriceBreakdown() {
    if (!priceBreakdown) return;
    const qty = Math.max(1, parseInt(qtySelect?.value || "2", 10));
    let discount = 0;
    const end = parseInt(localStorage.getItem("flashDiscountEnd"), 10) || 0;
    if (end && end > Date.now()) {
      discount += Math.round(selectedPrice * 0.05);
    }
    if (
      flashSale &&
      Date.now() < new Date(flashSale.end_time).getTime() &&
      selectedMaterialValue() === flashSale.product_type
    ) {
      discount += Math.round(
        selectedPrice * (flashSale.discount_percent / 100),
      );
    }
    if (qty > 1) {
      discount += TWO_PRINT_DISCOUNT;
    }
    const subtotal = (selectedPrice * qty) / 100;
    const total = (selectedPrice * qty - discount) / 100;
    const saved = discount / 100;
    let lines = [`£${(selectedPrice / 100).toFixed(2)} each`];
    lines.push(
      `×${qty} prints${qty > 1 ? ` – £${(TWO_PRINT_DISCOUNT / 100).toFixed(0)} bundle discount` : ""}`,
    );
    lines.push("─────────────");
    lines.push(`Total: £${total.toFixed(2)}`);
    if (saved > 0) {
      const pct = Math.round((saved / subtotal) * 100);
      lines.push(`You save £${saved.toFixed(2)} (${pct}% off)`);
    }
    priceBreakdown.textContent = lines.join("\n");
  }

  materialRadios.forEach((r) => {
    r.addEventListener("change", () => {
      if (r.checked) {
        selectedPrice = PRICES[r.value] || PRICES.single;
        updatePayButton();
        updateFlashSaleBanner();
        localStorage.setItem("print3Material", r.value);
        updateEtchVisibility(r.value);
        if (colorMenu) {
          if (r.value === "single") {
            colorMenu.classList.remove("hidden");
          } else {
            colorMenu.classList.add("hidden");
            // Reset the single colour button when another option is selected
            if (singleButton) {
              singleButton.style.backgroundColor = "";
              singleButton.style.borderColor = "";
            }
            if (originalColor) applyModelColor(originalColor, true);
            localStorage.removeItem("print3Color");
          }
        }
      }
    });
  });

  subscriptionRadios.forEach((r) => {
    r.addEventListener("change", () => {
      updatePayButton();
      updatePopularMessage();
    });
  });

  function updatePopularMessage() {
    if (!bulkMsg) return;
    bulkMsg.innerHTML =
      '<span class="text-gray-400">Popular: keep one, gift one – </span>' +
      '<span class="text-white">save £7.00</span>';
    bulkMsg.classList.remove("hidden");
  }

  qtySelect?.addEventListener("change", () => {
    updatePayButton();

    updatePopularMessage();
  });

  qtyDec?.addEventListener("click", () => {
    if (!qtySelect) return;
    let val = parseInt(qtySelect.value, 10) || 1;
    val = Math.max(1, val - 1);
    qtySelect.value = String(val);
    qtySelect.dispatchEvent(new Event("change"));
  });

  qtyInc?.addEventListener("click", () => {
    if (!qtySelect) return;
    let val = parseInt(qtySelect.value, 10) || 1;
    val = Math.max(1, val + 1);
    qtySelect.value = String(val);
    qtySelect.dispatchEvent(new Event("change"));
  });

  if (singleInput && colorMenu && singleButton) {
    singleInput.addEventListener("click", () => {
      // If already selected, allow reopening the color menu on click
      if (singleInput.checked && colorMenu.classList.contains("hidden")) {
        colorMenu.classList.remove("hidden");
      }
    });
    const handleColorSelect = (ev) => {
      const btn = ev.target.closest("button[data-color]");
      if (!btn) return;
      // Prevent default label behaviour which could reopen the menu
      ev.preventDefault();
      ev.stopPropagation();
      const color = btn.dataset.color;
      singleButton.style.backgroundColor = color;

      singleButton.style.borderColor = SINGLE_BORDER_COLOR;

      const factor = hexToFactor(color);
      if (factor) applyModelColor(factor);
      localStorage.setItem("print3Color", color);
      localStorage.setItem("print3Material", "single");
      colorMenu.classList.add("hidden");
    };
    colorMenu.addEventListener("click", handleColorSelect);
  }
  updatePayButton();
  updatePopularMessage();
  const prevBtn = document.getElementById("prev-model");
  const nextBtn = document.getElementById("next-model");

  function showItem(idx) {
    if (!checkoutItems.length) return;
    currentIndex = (idx + checkoutItems.length) % checkoutItems.length;
    const item = checkoutItems[currentIndex];
    viewer.src = item.modelUrl || FALLBACK_GLB;
    if (item.jobId) localStorage.setItem("print3JobId", item.jobId);
    else localStorage.removeItem("print3JobId");
    storedMaterial = item.material || "multi";
    localStorage.setItem("print3Material", storedMaterial);
    const radio = document.querySelector(
      `#material-options input[value="${storedMaterial}"]`,
    );
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event("change"));
    }
    updatePayButton();
    updateFlashSaleBanner();
  }

  prevBtn?.addEventListener("click", () => showItem(currentIndex - 1));
  nextBtn?.addEventListener("click", () => showItem(currentIndex + 1));
  if (checkoutItems.length) showItem(0);
  const sessionId = qs("session_id");
  if (sessionId) {
    recordPurchase();
    await loadCheckoutCredits();
  }
  let baseSlots = null;

  if (slotEl) {
    slotEl.style.visibility = "hidden";
    if (bulkSlotEl) {
      bulkSlotEl.style.visibility = "hidden";
    }
    // Compute a client-side slot count first so we have a reasonable value even
    // if the API fails or returns stale data.
    baseSlots = computeSlotsByTime();
    if (typeof initData.slots === "number") {
      baseSlots = initData.slots;
    }
    slotEl.textContent = adjustedSlots(baseSlots);
    slotEl.style.visibility = "visible";
    if (window.setWizardSlotCount)
      window.setWizardSlotCount(adjustedSlots(baseSlots));
    if (bulkSlotEl) {
      bulkSlotEl.textContent = adjustedSlots(baseSlots);
      bulkSlotEl.style.visibility = "visible";
    }
  }

  if (colorSlotEl) {
    colorSlotEl.style.visibility = "hidden";
    colorSlotEl.textContent = computeColorSlotsByTime();
    colorSlotEl.style.visibility = "visible";
  }

  async function updateEstimate() {
    if (!costEl || !etaEl) return;
    const dest = {
      address: document.getElementById("ship-address").value,
      city: document.getElementById("ship-city").value,
      zip: document.getElementById("ship-zip").value,
    };
    try {
      const resp = await fetch(`${API_BASE}/shipping-estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: dest, model: { weight: 1 } }),
      });
      const data = await resp.json();
      if (data.cost)
        costEl.textContent = `Estimated Cost: $${data.cost.toFixed(2)}`;
      if (data.etaDays) etaEl.textContent = `ETA: ${data.etaDays} days`;
    } catch {
      /* ignore */
    }
  }

  function initPlaceAutocomplete() {
    const cityInput = document.getElementById("ship-city");
    const zipInput = document.getElementById("ship-zip");
    if (!cityInput || !window.google?.maps?.places) return;
    const ac = new google.maps.places.Autocomplete(cityInput, {
      types: ["(cities)"],
    });
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (!place.address_components) return;
      let city = "";
      let country = "";
      let postal = "";
      place.address_components.forEach((c) => {
        if (c.types.includes("locality")) city = c.long_name;
        if (c.types.includes("country")) country = c.short_name;
        if (c.types.includes("postal_code")) postal = c.long_name;
      });
      if (city && country) cityInput.value = `${city}, ${country}`;
      if (postal && zipInput) zipInput.value = postal;
      updateEstimate();
    });
  }

  const hideLoader = () => (loader.hidden = true);

  // Attach events immediately so we don't miss the "load" event even if the
  // <model-viewer> element upgrades while this script is still loading. If the
  // library fails to load, the "error" handler falls back to the astronaut
  // model and hides the loader overlay.
  viewer.addEventListener("load", hideLoader);
  viewer.addEventListener("error", () => {
    viewer.src = FALLBACK_GLB;
    hideLoader();
  });

  // Wait for the <model-viewer> definition before assigning the model source.
  // Some browsers won't process the "src" attribute on a custom element until
  // after it's upgraded, so we guard against that here.
  if (window.customElements?.whenDefined) {
    try {
      await customElements.whenDefined("model-viewer");
    } catch {
      // ignore if the element never upgrades
    }
  }

  loader.hidden = false;
  // Assign the model source only after the load/error listeners are in place
  const storedModel = localStorage.getItem("print3Model");
  // Load saved basket items
  try {
    const arr = JSON.parse(localStorage.getItem("print3CheckoutItems"));
    if (Array.isArray(arr) && arr.length) checkoutItems = arr;
  } catch {}

  if (!checkoutItems.length) {
    viewer.src = storedModel || FALLBACK_GLB;
    if (!storedModel) {
      viewer.addEventListener(
        "load",
        () => {
          const temp = document.createElement("model-viewer");
          temp.style.display = "none";
          temp.crossOrigin = "anonymous";
          temp.src = FALLBACK_GLB_HIGH;
          temp.addEventListener("load", () => {
            if (viewer.src === FALLBACK_GLB_LOW) {
              viewer.src = FALLBACK_GLB_HIGH;
            }
            temp.remove();
          });
          document.body.appendChild(temp);
        },
        { once: true },
      );
    }
  } else {
    const first = checkoutItems[0];
    viewer.src = first.modelUrl || FALLBACK_GLB;
    if (first.jobId) localStorage.setItem("print3JobId", first.jobId);
    else localStorage.removeItem("print3JobId");
    storedMaterial = first.material || storedMaterial;
    localStorage.setItem("print3Material", storedMaterial);
  }

  // Hide the overlay if nothing happens after a short delay
  setTimeout(hideLoader, 7000);

  if (sessionId) {
    successMsg.hidden = false;
    const popup = document.getElementById("bulk-discount-popup");
    const closeBtn = document.getElementById("bulk-discount-close");
    if (popup && closeBtn) {
      popup.classList.remove("hidden");
      closeBtn.addEventListener("click", () => popup.classList.add("hidden"));
    }
    const refInput = document.getElementById("referral-link");
    const refDiv = document.getElementById("referral");
    const copyBtn = document.getElementById("copy-referral");
    const reorderBtn = document.getElementById("reorder-color");
    const token = localStorage.getItem("token");
    if (refInput && refDiv && copyBtn && token) {
      try {
        const res = await fetch(`${API_BASE}/referral-link`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const { code } = await res.json();
          refInput.value = `${window.location.origin}/index.html?ref=${encodeURIComponent(code)}`;
          refDiv.classList.remove("hidden");
          copyBtn.addEventListener("click", () => {
            refInput.select();
            try {
              document.execCommand("copy");
            } catch {}
          });
        }
      } catch {}
    }
    reorderBtn?.addEventListener("click", () => {
      window.location.href = "payment.html";
    });
    const giftDiv = document.getElementById("gift-options");
    const giftBtn = document.getElementById("gift-order");
    if (giftDiv && giftBtn) {
      giftDiv.classList.remove("hidden");
      giftBtn.addEventListener("click", () => {
        document.getElementById("checkout-form")?.scrollIntoView({
          behavior: "smooth",
        });
      });
    }
    const nextModal = document.getElementById("next-print-modal");
    const nextBtn = document.getElementById("next-print-btn");
    const nextText = document.getElementById("next-print-text");

    const discountSpan = document.getElementById("next-discount");
    if (nextModal && nextBtn && nextText && discountSpan) {
      const span = nextText.querySelector("span");
      const suggestion =
        NEXT_PROMPTS[Math.floor(Math.random() * NEXT_PROMPTS.length)];
      if (span) span.textContent = suggestion;
      try {
        const resp = await fetch(`${API_BASE}/generate-discount`, {
          method: "POST",
        });
        if (resp.ok) {
          const data = await resp.json();
          discountSpan.textContent = data.code;
        }
      } catch {
        discountSpan.textContent = "SAVE5";
      }

      nextBtn.addEventListener("click", () => {
        localStorage.setItem("print3Prompt", suggestion);
        window.location.href = "index.html";
      });
      nextModal.classList.remove("hidden");
    }
    return;
  }
  if (qs("cancel")) {
    cancelMsg.hidden = false;
  }

  if (flashBanner && initData.flashSale) {
    flashSale = initData.flashSale;
    updateFlashSaleBanner();
  }

  // Prefill shipping fields from saved profile
  if (initData.profile) {
    const ship = initData.profile.shipping_info || {};
    if (ship.name) document.getElementById("ship-name").value = ship.name;
    if (ship.address)
      document.getElementById("ship-address").value = ship.address;
    if (ship.city) document.getElementById("ship-city").value = ship.city;
    if (ship.zip) document.getElementById("ship-zip").value = ship.zip;
    await updateEstimate();
  }

  inputIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      highlightValid(el);
      el.addEventListener("input", () => highlightValid(el));
    }
  });

  ["ship-address", "ship-city", "ship-zip"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", updateEstimate);
  });

  applyBtn?.addEventListener("click", async () => {
    const raw = discountInput.value.trim();
    if (!raw) return;
    const codes = raw.split(/[,\s]+/).filter(Boolean);
    discountMsg.textContent = "Checking…";
    discountCodes = [];
    discountValue = 0;
    try {
      for (const c of codes) {
        const resp = await fetch(`${API_BASE}/discount-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: c }),
        });
        if (!resp.ok) throw new Error("invalid");
        const data = await resp.json();
        discountCodes.push(c);
        discountValue += data.discount || 0;
      }
      discountMsg.textContent = `Code applied: -$${(discountValue / 100).toFixed(2)}`;
    } catch {
      discountCodes = [];
      discountValue = 0;
      discountMsg.textContent = "Invalid code";
    }
  });

  const payHandler = async () => {
    const sessionId = localStorage.getItem("adSessionId");
    const subreddit = localStorage.getItem("adSubreddit");
    if (sessionId && subreddit) {
      fetch(`${API_BASE}/track/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, subreddit, step: "start" }),
      }).catch(() => {});
    }
    const qty = Math.max(
      1,
      parseInt(document.getElementById("print-qty")?.value || "2", 10),
    );
    let discount = 0;
    const end = parseInt(localStorage.getItem("flashDiscountEnd"), 10) || 0;
    if (end && end > Date.now()) {
      discount += Math.round(selectedPrice * 0.05);
    }
    if (
      flashSale &&
      Date.now() < new Date(flashSale.end_time).getTime() &&
      selectedMaterialValue() === flashSale.product_type
    ) {
      discount += Math.round(
        selectedPrice * (flashSale.discount_percent / 100),
      );
    }
    if (qty > 1) {
      discount += TWO_PRINT_DISCOUNT;
    }
    const shippingInfo = {
      name: document.getElementById("ship-name").value,
      address: document.getElementById("ship-address").value,
      city: document.getElementById("ship-city").value,
      zip: document.getElementById("ship-zip").value,
      email: emailEl.value,
    };
    let etchName = "";
    if (etchInput && !etchInput.disabled) {
      etchName = etchInput.value
        .replace(/[^a-z0-9 ]/gi, "")
        .slice(0, 20)
        .trim();
    }
    const useCredit = document.getElementById("use-credit")?.checked;
    const data = await createCheckout(
      qty,
      discount,
      discountCodes,
      shippingInfo,
      referralId,
      etchName || undefined,
      useCredit,
    );
    if (useCredit && data.success) {
      recordPurchase();
      await loadCheckoutCredits();
      successMsg.hidden = false;
    } else if (data.checkoutUrl) {
      if (stripe) {
        stripe.redirectToCheckout({
          sessionId: data.checkoutUrl.split("session_id=")[1],
        });
      } else {
        window.location.href = data.checkoutUrl;
      }
    }
    if (emailEl.value) {
      fetch(`${API_BASE}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailEl.value }),
      });
    }

    const joinClub =
      Array.from(subscriptionRadios).find((r) => r.checked)?.value === "join";
    const token = localStorage.getItem("token");
    if (joinClub && token) {
      fetch(`${API_BASE}/subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          variant: PRICING_VARIANT,
          price_cents:
            Array.from(subscriptionRadios).find((r) => r.checked)?.value ===
            "annual"
              ? PRINT_CLUB_ANNUAL_PRICE
              : Math.round(PRINT_CLUB_PRICE * FIRST_MONTH_DISCOUNT),
        }),
      });
    }
  };
  window.payHandler = payHandler;

  document
    .getElementById("submit-payment")
    .addEventListener("click", () => payHandler());

  const alignBadge = () => {
    const badge = document.getElementById("money-back-badge");
    if (!badge || !payBtn) return;
    const btnRect = payBtn.getBoundingClientRect();
    const container = badge.parentElement;
    const containerRect = container && container.getBoundingClientRect();
    if (!containerRect) return;

    const offset = btnRect.top + btnRect.height / 2 - containerRect.top;
    // Center the badge on the button and override the initial transform
    badge.style.transform = "translateY(-50%)";
    badge.style.top = offset + "px";
    badge.style.visibility = "visible";
  };
  alignBadge();
  window.addEventListener("resize", alignBadge);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPaymentPage);
} else {
  initPaymentPage();
}

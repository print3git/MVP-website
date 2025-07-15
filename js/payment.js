// Initialize Stripe after the library loads to avoid breaking the rest of the
// page if the network request for Stripe fails. This variable will be assigned
// once the DOM content is ready.
let stripe = null;

// Use a lightweight fallback model and upgrade to the high detail version after load.
const FALLBACK_GLB_LOW = "models/bag.glb";
const FALLBACK_GLB_HIGH = FALLBACK_GLB_LOW;
const FALLBACK_GLB = FALLBACK_GLB_LOW;
const PRICES = {
  single: 2999,
  multi: 3999,
  premium: 5999,
};

// Override prices for Luckybox checkout
if (window.location.pathname.endsWith("luckybox-payment.html")) {
  PRICES.single = 1999;
  PRICES.multi = 2999;
  PRICES.premium = 5999;
}
if (window.location.pathname.endsWith("minis-checkout.html")) {
  PRICES.single = 1499;
  PRICES.multi = 1499;
  PRICES.premium = 1499;
}

const TWO_PRINT_DISCOUNT = 700;
const THIRD_PRINT_DISCOUNT = window.location.pathname.endsWith(
  "luckybox-payment.html",
)
  ? 0
  : 1500;
const MINI_SECOND_DISCOUNT = 500;
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
import { track } from "./analytics.js";
// Time zone used to reset local purchase counts at 1 AM Eastern
const TZ = "America/New_York";
let flashTimerId = null;
let flashSale = null;
let checkoutItems = [];
let currentIndex = 0;

function computeDiscountFor(material, qty) {
  const price = PRICES[material] || PRICES.single;
  let discount = 0;
  const end = parseInt(localStorage.getItem("flashDiscountEnd"), 10) || 0;
  if (end && end > Date.now()) {
    discount += Math.round(price * 0.05);
  }
  if (
    flashSale &&
    Date.now() < new Date(flashSale.end_time).getTime() &&
    material === flashSale.product_type
  ) {
    discount += Math.round(price * (flashSale.discount_percent / 100));
  }
  return discount;
}

function computeBulkDiscount(items) {
  let totalQty = 0;
  for (const it of items) {
    totalQty += Math.max(1, parseInt(it.qty || 1, 10));
  }
  if (window.location.pathname.endsWith("minis-checkout.html")) {
    if (totalQty >= 2) return MINI_SECOND_DISCOUNT;
    return 0;
  }

  let discount = 0;
  if (totalQty >= 2) discount += TWO_PRINT_DISCOUNT;
  if (totalQty >= 3) discount += THIRD_PRINT_DISCOUNT;
  return discount;
}
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
let storedColor = localStorage.getItem("print3Color");
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
  if (
    typeof navigator !== "undefined" &&
    (navigator.userAgent?.includes("Node.js") ||
      navigator.userAgent?.includes("jsdom"))
  ) {
    return Promise.resolve();
  }
  const cdnUrl =
    "https://cdn.jsdelivr.net/npm/@google/model-viewer@1.12.0/dist/model-viewer.min.js";
  const localUrl = "js/model-viewer.min.js";
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.type = "module";
    s.src = cdnUrl;
    s.onload = resolve;
    s.onerror = () => {
      s.remove();
      const fallback = document.createElement("script");
      fallback.type = "module";
      fallback.src = localUrl;
      fallback.onload = resolve;
      fallback.onerror = resolve;
      document.head.appendChild(fallback);
    };
    document.head.appendChild(s);
    setTimeout(() => {
      if (!window.customElements?.get("model-viewer")) {
        s.onerror();
      }
    }, 3000);
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
    track("checkout", { sessionId, subreddit, step: "complete" }).catch(
      () => {},
    );
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
    const [subRes, creditRes] = await Promise.all([
      fetch(`${API_BASE}/subscription/credits`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${API_BASE}/credits`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);
    if (subRes.ok) {
      const data = await subRes.json();
      const container = document.getElementById("credit-option");
      const span = document.getElementById("credits-remaining");
      if (container && span) {
        span.textContent = data.remaining;
        if (data.remaining > 0) container.classList.remove("hidden");
        else container.classList.add("hidden");
      }
    }
    if (creditRes.ok) {
      const d = await creditRes.json();
      const c2 = document.getElementById("sale-credit-option");
      const s2 = document.getElementById("sale-credit-balance");
      if (c2 && s2) {
        s2.textContent = (d.credit / 100).toFixed(2);
        if (d.credit > 0) c2.classList.remove("hidden");
        else c2.classList.add("hidden");
      }
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
  const promoToggle = document.querySelector(".promo-toggle");
  const promoBox = document.querySelector(".promo-input");
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
  const persistMap = {
    "ship-name": "print3ShipName",
    "etch-name": "print3EtchName",
    "checkout-email": "print3Email",
    "ship-address": "print3ShipAddress",
    "ship-city": "print3ShipCity",
    "ship-zip": "print3ShipZip",
    "discount-code": "print3DiscountCode",
  };
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
    priceSpan.textContent = `Join print2 Pro £${first.toFixed(2)} first month`;
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
      // Always start hidden; user can open it manually
      colorMenu.classList.add("hidden");
    }
  } else if (colorMenu) {
    colorMenu.classList.add("hidden");
  }
  initPlaceAutocomplete();
  promoToggle?.addEventListener("click", () => {
    if (promoBox) promoBox.hidden = !promoBox.hidden;
  });
  let discountCodes = [];
  let discountValue = 0;
  let percentDiscount = 0;
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
    else if (viewer && viewer.tagName.toLowerCase() !== "img")
      viewer.addEventListener("load", apply, { once: true });
  }

  function captureOriginal() {
    const mats = viewer.model?.materials || [];
    const mat = mats[0];
    if (mat?.pbrMetallicRoughness?.baseColorFactor)
      originalColor = mat.pbrMetallicRoughness.baseColorFactor.slice();
    originalTextures = mats.map(
      (m) => m.pbrMetallicRoughness?.baseColorTexture?.texture || null,
    );
    applyStoredColorIfNeeded();
  }

  function applyStoredColorIfNeeded() {
    if (storedMaterial === "single" && storedColor) {
      const factor = hexToFactor(storedColor);
      if (factor) applyModelColor(factor);
    }
  }

  // Capture the original colours every time a new model loads so that
  // switching between items restores the correct textures.
  if (viewer && viewer.tagName.toLowerCase() !== "img") {
    viewer.addEventListener("load", captureOriginal);
    if (viewer.model) captureOriginal();
  }

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
      if (checkoutItems[currentIndex]) {
        checkoutItems[currentIndex].etchName = "";
        saveCheckoutItems();
      }
      localStorage.removeItem("print3EtchName");
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
      payBtn.textContent = `Join print2 Pro – Pay £${price.toFixed(2)}`;
    } else if (planChoice === "annual") {
      payBtn.textContent = `Join print2 Pro – Pay £${(
        PRINT_CLUB_ANNUAL_PRICE / 100
      ).toFixed(2)}`;
    } else {
      const items = checkoutItems.length
        ? checkoutItems
        : [
            {
              material: selectedMaterialValue(),
              qty: Math.max(1, parseInt(qtySelect?.value || "2", 10)),
            },
          ];
      let subtotal = 0;
      let totalQty = 0;
      for (const it of items) {
        const price = PRICES[it.material] || PRICES.single;
        const qty = Math.max(1, parseInt(it.qty || 1, 10));
        subtotal += price * qty;
        totalQty += qty;
      }
      const bulk = computeBulkDiscount(items);
      let discount = bulk;
      for (const it of items) {
        const q = Math.max(1, parseInt(it.qty || 1, 10));
        discount += computeDiscountFor(it.material, q);
      }
      let codeDisc = discountValue;
      if (percentDiscount > 0) {
        codeDisc += Math.round(
          (subtotal - discount - discountValue) * (percentDiscount / 100),
        );
      }
      const total = subtotal - discount - codeDisc;
      payBtn.textContent = `Pay £${(total / 100).toFixed(2)} (${totalQty} prints)`;
    }
    updatePriceBreakdown();
  }

  function updatePriceBreakdown() {
    if (!priceBreakdown) return;
    const items = checkoutItems.length
      ? checkoutItems
      : [
          {
            material: selectedMaterialValue(),
            qty: Math.max(1, parseInt(qtySelect?.value || "2", 10)),
          },
        ];
    let subtotal = 0;
    let discount = 0;
    let premiumCount = 0;
    let multiCount = 0;
    let singleCount = 0;
    for (const it of items) {
      const price = PRICES[it.material] || PRICES.single;
      const qty = Math.max(1, parseInt(it.qty || 1, 10));
      const d = computeDiscountFor(it.material, qty);
      subtotal += price * qty;
      discount += d;
      if (it.material === "premium") premiumCount += qty;
      else if (it.material === "multi") multiCount += qty;
      else singleCount += qty;
    }
    discount += computeBulkDiscount(items);
    let codeDisc = discountValue;
    if (percentDiscount > 0) {
      codeDisc += Math.round(
        (subtotal - discount - discountValue) * (percentDiscount / 100),
      );
    }
    discount += codeDisc;
    const saved = discount / 100;
    const parts = [];
    if (premiumCount > 0) parts.push(`${premiumCount} premium`);
    if (multiCount > 0) parts.push(`${multiCount} multi`);
    if (singleCount > 0) parts.push(`${singleCount} single-colour`);
    const total = (subtotal - discount) / 100;
    const totalQty = premiumCount + multiCount + singleCount;
    let text = parts.join(" + ");
    if (saved > 0) {
      const percent =
        subtotal > 0 ? Math.round((discount / subtotal) * 100) : 0;
      text += ` - £${saved.toFixed(2)} = £${total.toFixed(2)}`;
      if (!window.location.pathname.endsWith("luckybox-payment.html")) {
        const indent = text.lastIndexOf("£");
        const pct = totalQty > 3 ? "" : "%";
        text += `\n${" ".repeat(indent)}(${percent}${pct} saving)`;
      }
    } else {
      text += ` = £${total.toFixed(2)}`;
    }
    priceBreakdown.textContent = text;
  }

  materialRadios.forEach((r) => {
    r.addEventListener("change", () => {
      if (r.checked) {
        selectedPrice = PRICES[r.value] || PRICES.single;
        storedMaterial = r.value;
        localStorage.setItem("print3Material", r.value);
        if (checkoutItems[currentIndex]) {
          checkoutItems[currentIndex].material = r.value;
          if (r.value !== "single") {
            checkoutItems[currentIndex].color = null;
          }
          saveCheckoutItems();
        }
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
            storedColor = null;
            localStorage.removeItem("print3Color");
          }
        }
        updatePayButton();
        updateFlashSaleBanner();
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
    const path = window.location.pathname;
    const amount = path.endsWith("minis-checkout.html") ? "£5.00" : "£7.00";
    const showGiftTwo =
      !path.endsWith("minis-checkout.html") &&
      !path.endsWith("luckybox-payment.html");
    bulkMsg.innerHTML =
      '<span class="text-gray-400">Popular: keep one, gift one – </span>' +
      `<span class="text-white">save ${amount}</span>` +
      (showGiftTwo
        ? '<br><span class="invisible">Popular: keep one, </span><span class="text-gray-400">gift two – </span><span class="text-white">save £22.00</span>'
        : "");
    bulkMsg.classList.remove("hidden");
  }

  qtySelect?.addEventListener("change", () => {
    if (checkoutItems[currentIndex]) {
      checkoutItems[currentIndex].qty = Math.max(
        1,
        parseInt(qtySelect.value || "1", 10),
      );
      saveCheckoutItems();
    }
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
      storedColor = color;
      storedMaterial = "single";
      localStorage.setItem("print3Color", color);
      localStorage.setItem("print3Material", "single");
      if (checkoutItems[currentIndex]) {
        checkoutItems[currentIndex].material = "single";
        checkoutItems[currentIndex].color = color;
        saveCheckoutItems();
      }
      colorMenu.classList.add("hidden");
    };
    colorMenu.addEventListener("click", handleColorSelect);
  }
  updatePayButton();
  updatePopularMessage();
  const prevBtn = document.getElementById("prev-model");
  const nextBtn = document.getElementById("next-model");
  const removeBtn = document.getElementById("remove-model");

  function updateNavButtons() {
    if (!prevBtn || !nextBtn) return;
    if (checkoutItems.length > 1) {
      prevBtn.classList.remove("hidden");
      nextBtn.classList.remove("hidden");
    } else {
      prevBtn.classList.add("hidden");
      nextBtn.classList.add("hidden");
    }
  }

  function showItem(idx) {
    if (!checkoutItems.length) return;
    currentIndex = (idx + checkoutItems.length) % checkoutItems.length;
    const item = checkoutItems[currentIndex];
    if (viewer) {
      const tag = viewer.tagName.toLowerCase();
      if (tag === "img") {
        if (item.snapshot) viewer.src = item.snapshot;
      } else {
        viewer.src = item.modelUrl || storedModel || FALLBACK_GLB;
      }
    }
    if (item.jobId) localStorage.setItem("print3JobId", item.jobId);
    else localStorage.removeItem("print3JobId");
    storedMaterial = item.material || "multi";
    storedColor = item.color || null;
    localStorage.setItem("print3Material", storedMaterial);
    if (storedColor) localStorage.setItem("print3Color", storedColor);
    else localStorage.removeItem("print3Color");
    const radio = document.querySelector(
      `#material-options input[value="${storedMaterial}"]`,
    );
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event("change"));
      if (storedMaterial === "single" && !storedColor && colorMenu) {
        // Keep menu collapsed when selecting stored single option
        colorMenu.classList.add("hidden");
      }
    }
    if (etchInput) {
      etchInput.value = item.etchName || "";
      localStorage.setItem("print3EtchName", item.etchName || "");
      highlightValid(etchInput);
    }
    if (storedMaterial === "single") {
      if (singleButton) {
        if (storedColor) {
          singleButton.style.backgroundColor = storedColor;
          singleButton.style.borderColor = SINGLE_BORDER_COLOR;
        } else {
          singleButton.style.backgroundColor = "";
          singleButton.style.borderColor = "";
        }
      }
      if (colorMenu) {
        if (storedColor) colorMenu.classList.add("hidden");
        else colorMenu.classList.remove("hidden");
      }
    } else if (singleButton) {
      singleButton.style.backgroundColor = "";
      singleButton.style.borderColor = "";
    }
    if (qtySelect) {
      qtySelect.value = String(item.qty || 1);
    }
    const counter = document.getElementById("model-counter");
    if (counter) {
      if (checkoutItems.length > 1) {
        counter.textContent = `${currentIndex + 1} / ${checkoutItems.length}`;
        counter.classList.remove("hidden");
      } else {
        counter.classList.add("hidden");
      }
    }
    if (removeBtn) {
      if (checkoutItems.length > 1) {
        removeBtn.classList.remove("hidden");
      } else {
        removeBtn.classList.add("hidden");
      }
    }
    updateNavButtons();
    applyStoredColorIfNeeded();
    updatePayButton();
    updateFlashSaleBanner();
  }

  prevBtn?.addEventListener("click", () => showItem(currentIndex - 1));
  nextBtn?.addEventListener("click", () => showItem(currentIndex + 1));
  removeBtn?.addEventListener("click", () => {
    if (!checkoutItems.length) return;
    const idx = currentIndex;
    checkoutItems.splice(idx, 1);
    saveCheckoutItems();
    try {
      const basket = JSON.parse(localStorage.getItem("print3Basket")) || [];
      if (idx >= 0 && idx < basket.length) {
        basket.splice(idx, 1);
        localStorage.setItem("print3Basket", JSON.stringify(basket));
      }
    } catch {}
    if (checkoutItems.length) {
      if (currentIndex >= checkoutItems.length) currentIndex = 0;
      showItem(currentIndex);
    }
    window.dispatchEvent(new CustomEvent("basket-change"));
  });
  const sessionId = qs("session_id");
  if (sessionId) {
    recordPurchase();
    await loadCheckoutCredits();
    try {
      const q = JSON.parse(localStorage.getItem("pendingCheckouts") || "[]");
      if (q.length) {
        const next = q.shift();
        if (q.length)
          localStorage.setItem("pendingCheckouts", JSON.stringify(q));
        else localStorage.removeItem("pendingCheckouts");
        setTimeout(() => {
          window.location.href = next;
        }, 500);
        return;
      }
    } catch {}
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
  if (viewer && viewer.tagName.toLowerCase() !== "img") {
    viewer.addEventListener("load", hideLoader);
    viewer.addEventListener("error", () => {
      hideLoader();
    });
  }

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

  if (viewer && viewer.tagName.toLowerCase() === "img") {
    // The Luckybox page uses a static <img> preview, so skip the loading
    // overlay entirely to avoid covering the image.
    loader.hidden = true;
  } else {
    loader.hidden = false;
    // Assign the model source only after the load/error listeners are in place
    const storedModel = localStorage.getItem("print3Model");
    if (viewer) viewer.src = storedModel || FALLBACK_GLB;
  }
  // Load saved basket items unless this is the Luckybox page
  if (!window.location.pathname.endsWith("luckybox-payment.html")) {
    try {
      const arr = JSON.parse(localStorage.getItem("print3CheckoutItems"));
      if (Array.isArray(arr) && arr.length) {
        if (
          arr.length === 1 &&
          (arr[0].qty == null || parseInt(arr[0].qty, 10) === 1)
        ) {
          arr[0].qty = 2;
        }
        checkoutItems = arr.map((it) => ({
          ...it,
          etchName: it.etchName || "",
          qty: Math.max(1, parseInt(it.qty || "1", 10)),
        }));
      }
    } catch {}
  } else {
    localStorage.removeItem("print3CheckoutItems");
  }

  // Sync checkout items with the current basket in case this page was
  // opened directly and the stored list is stale.
  if (!window.location.pathname.endsWith("luckybox-payment.html")) {
    try {
      const basket = JSON.parse(localStorage.getItem("print3Basket")) || [];
      if (
        basket.length &&
        (basket.length !== checkoutItems.length ||
          basket.some((it, idx) => {
            const c = checkoutItems[idx];
            return !c || c.modelUrl !== it.modelUrl || c.jobId !== it.jobId;
          }))
      ) {
        const existing = checkoutItems;
        checkoutItems = basket.map((it, idx) => {
          const prev = existing[idx] || {};
          return {
            modelUrl: it.modelUrl,
            jobId: it.jobId,
            snapshot: it.snapshot || prev.snapshot || "",
            material:
              prev.material ||
              localStorage.getItem("print3Material") ||
              "multi",
            color: prev.color || null,
            etchName:
              prev.etchName || localStorage.getItem("print3EtchName") || "",
            qty: (() => {
              let q = prev.qty ?? it.quantity;
              if (basket.length === 1 && (q == null || parseInt(q, 10) === 1)) {
                q = "2";
              }
              if (q == null) q = "1";
              return Math.max(1, parseInt(q, 10));
            })(),
          };
        });
        localStorage.setItem(
          "print3CheckoutItems",
          JSON.stringify(checkoutItems),
        );
      }
    } catch {}
  }
  // Reset quantities to 1 when multiple items are in the basket
  if (checkoutItems.length > 1) {
    checkoutItems.forEach((it) => {
      it.qty = 1;
    });
    try {
      localStorage.setItem(
        "print3CheckoutItems",
        JSON.stringify(checkoutItems),
      );
    } catch {}
  }
  function saveCheckoutItems() {
    try {
      localStorage.setItem(
        "print3CheckoutItems",
        JSON.stringify(checkoutItems),
      );
    } catch {}
  }

  if (!checkoutItems.length) {
    if (removeBtn) removeBtn.classList.add("hidden");
    if (viewer && viewer.tagName.toLowerCase() !== "img") {
      viewer.addEventListener("load", applyStoredColorIfNeeded, { once: true });
    }
    updateNavButtons();
  } else {
    const first = checkoutItems[0];
    if (first.jobId) localStorage.setItem("print3JobId", first.jobId);
    else localStorage.removeItem("print3JobId");
    storedMaterial = first.material || storedMaterial;
    localStorage.setItem("print3Material", storedMaterial);
    showItem(0);
    if (removeBtn) {
      if (checkoutItems.length > 1) removeBtn.classList.remove("hidden");
      else removeBtn.classList.add("hidden");
    }
    updateNavButtons();
  }

  if (!checkoutItems.length && qtySelect) {
    qtySelect.value = "2";
    qtySelect.dispatchEvent(new Event("change"));
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
    try {
      const q = JSON.parse(localStorage.getItem("pendingCheckouts") || "[]");
      if (q.length) {
        const next = q.shift();
        if (q.length)
          localStorage.setItem("pendingCheckouts", JSON.stringify(q));
        else localStorage.removeItem("pendingCheckouts");
        setTimeout(() => {
          window.location.href = next;
        }, 500);
        return;
      }
    } catch {}
  }

  if (flashBanner && initData.flashSale) {
    flashSale = initData.flashSale;
    updateFlashSaleBanner();
  }

  // Prefill shipping fields from saved profile
  if (initData.profile) {
    const ship = initData.profile.shipping_info || {};
    if (ship.name) {
      document.getElementById("ship-name").value = ship.name;
      localStorage.setItem(persistMap["ship-name"], ship.name);
    }
    if (ship.address) {
      document.getElementById("ship-address").value = ship.address;
      localStorage.setItem(persistMap["ship-address"], ship.address);
    }
    if (ship.city) {
      document.getElementById("ship-city").value = ship.city;
      localStorage.setItem(persistMap["ship-city"], ship.city);
    }
    if (ship.zip) {
      document.getElementById("ship-zip").value = ship.zip;
      localStorage.setItem(persistMap["ship-zip"], ship.zip);
    }
    await updateEstimate();
  }

  Object.entries(persistMap).forEach(([id, key]) => {
    const el = document.getElementById(id);
    const val = localStorage.getItem(key);
    if (el && val) el.value = val;
  });
  await updateEstimate();

  inputIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      highlightValid(el);
      el.addEventListener("input", () => {
        highlightValid(el);
        const key = persistMap[id];
        if (key) {
          if (el.value) localStorage.setItem(key, el.value);
          else localStorage.removeItem(key);
        }
        if (id === "etch-name" && checkoutItems[currentIndex]) {
          checkoutItems[currentIndex].etchName = el.value.trim();
          saveCheckoutItems();
        }
      });
    }
  });

  ["ship-address", "ship-city", "ship-zip"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => {
      updateEstimate();
      const el = document.getElementById(id);
      const key = persistMap[id];
      if (el && key) {
        if (el.value) localStorage.setItem(key, el.value);
        else localStorage.removeItem(key);
      }
    });
  });

  applyBtn?.addEventListener("click", async () => {
    const raw = discountInput.value.trim();
    if (!raw) return;
    const codes = raw.split(/[,\s]+/).filter(Boolean);
    discountMsg.textContent = "Checking…";
    discountCodes = [];
    discountValue = 0;
    percentDiscount = 0;
    try {
      for (const c of codes) {
        const up = c.trim().toUpperCase();
        const resp = await fetch(`${API_BASE}/discount-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: up }),
        });
        if (!resp.ok) throw new Error("invalid");
        const data = await resp.json();
        discountCodes.push(up);
        discountValue += data.discount || 0;
        if (up === "SAVE5") percentDiscount = 5;
      }
      if (percentDiscount > 0) {
        discountMsg.textContent = `Code applied: ${percentDiscount}% off`;
      } else {
        discountMsg.textContent = `Code applied: -$${(discountValue / 100).toFixed(2)}`;
      }
      updatePayButton();
    } catch {
      discountCodes = [];
      discountValue = 0;
      percentDiscount = 0;
      discountMsg.textContent = "Invalid code";
      updatePayButton();
    }
  });

  const payHandler = async () => {
    const sessionId = localStorage.getItem("adSessionId");
    const subreddit = localStorage.getItem("adSubreddit");
    if (sessionId && subreddit) {
      track("checkout", { sessionId, subreddit, step: "start" }).catch(
        () => {},
      );
    }
    const qty = Math.max(
      1,
      parseInt(document.getElementById("print-qty")?.value || "2", 10),
    );
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
    const useSaleCredit = document.getElementById("use-sale-credit")?.checked;
    const items = checkoutItems.length
      ? checkoutItems
      : [
          {
            jobId: localStorage.getItem("print3JobId"),
            material: selectedMaterialValue(),
            etchName: etchName || "",
            qty,
          },
        ];
    const sessions = [];
    const bulk = computeBulkDiscount(items);
    let bulkApplied = false;
    for (const item of items) {
      const q = Math.max(1, parseInt(item.qty || qty, 10));
      if (item.jobId) localStorage.setItem("print3JobId", item.jobId);
      selectedPrice = PRICES[item.material] || PRICES.single;
      let discount = computeDiscountFor(item.material, q);
      if (!bulkApplied && bulk > 0) {
        discount += bulk;
        bulkApplied = true;
      }
      if (useSaleCredit) {
        const amount = selectedPrice * q - discount;
        const token = localStorage.getItem("token");
        const resp = await fetch(`${API_BASE}/credits/redeem`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount_cents: amount,
            jobId: item.jobId,
            qty: q,
            shippingInfo,
            etchName: item.etchName || undefined,
            productType: item.material,
          }),
        });
        const data = await resp.json();
        if (resp.ok) sessions.push(null);
        else alert(data.error || "Credit redemption failed");
      } else {
        const resp = await createCheckout(
          q,
          discount,
          discountCodes,
          shippingInfo,
          referralId,
          item.etchName || undefined,
          useCredit,
        );
        if (resp.checkoutUrl) sessions.push(resp.checkoutUrl);
      }
    }
    if ((useCredit || useSaleCredit) && sessions.length === 0) {
      recordPurchase();
      await loadCheckoutCredits();
      successMsg.hidden = false;
    } else if (sessions.length) {
      const rest = sessions.slice(1);
      if (rest.length) {
        localStorage.setItem("pendingCheckouts", JSON.stringify(rest));
      } else {
        localStorage.removeItem("pendingCheckouts");
      }
      const first = sessions[0];
      if (stripe) {
        stripe.redirectToCheckout({
          sessionId: first.split("session_id=")[1],
        });
      } else {
        window.location.href = first;
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

  const summaryEl = document.getElementById("pay-summary");
  function materialLabel(mat) {
    if (mat === "single") return "single-colour";
    if (mat === "multi") return "multi";
    if (mat === "premium") return "premium";
    return mat;
  }
  function updateSummary() {
    if (!summaryEl) return;
    const items = checkoutItems.length
      ? checkoutItems
      : [
          {
            material: storedMaterial,
            color: storedColor,
            etchName:
              etchInput && !etchInput.disabled ? etchInput.value.trim() : "",
          },
        ];
    summaryEl.innerHTML =
      "<div class='flex flex-wrap justify-center gap-2'>" +
      items
        .map((it) => {
          const src = it.snapshot || it.modelUrl || "";
          return `<img src='${src}' alt='print' class='w-12 h-12 object-cover rounded' />`;
        })
        .join("") +
      "</div>";
  }

  payBtn?.addEventListener("mouseenter", () => {
    updateSummary();
    summaryEl?.classList.remove("hidden");
  });
  payBtn?.addEventListener("mouseleave", () => {
    summaryEl?.classList.add("hidden");
  });

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

// Reload the page when returning via back/forward cache so newly added basket
// items are displayed correctly.
window.addEventListener("pageshow", (e) => {
  if (e.persisted) {
    window.location.reload();
  }
});

// Refresh the page if basket contents change in another tab
window.addEventListener("storage", (e) => {
  if (e.key === "print3CheckoutItems") {
    window.location.reload();
  }
});

// Refresh the page if basket changes within this tab
window.addEventListener("basket-change", () => {
  window.location.reload();
});

// Initialize Stripe after the library loads to avoid breaking the rest of the
// page if the network request for Stripe fails. This variable will be assigned
// once the DOM content is ready.
let stripe = null;
// Use a bundled copy of the astronaut model so the payment page works offline
// and is not dependent on external CDNs.
const FALLBACK_GLB = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
const PRICES = {
  single: 2799,
  multi: 3499,
  premium: 5999,
};
const PRINT_CLUB_PRICE = 14000;
let selectedPrice = PRICES.multi;
const API_BASE = (window.API_ORIGIN || '') + '/api';
// Time zone used to reset local purchase counts at 1 AM Eastern
const TZ = 'America/New_York';
let flashTimerId = null;
let flashSale = null;
const NEXT_PROMPTS = ['cute robot figurine', 'ornate chess piece', 'geometric flower vase'];

function getUserIdFromToken() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id || null;
  } catch {
    return null;
  }
}

// Restore previously selected material option and colour
const storedMaterial = localStorage.getItem('print3Material');
const storedColor = localStorage.getItem('print3Color');
if (storedMaterial && PRICES[storedMaterial]) {
  selectedPrice = PRICES[storedMaterial];
}

function selectedMaterialValue() {
  const r = document.querySelector('#material-options input[name="material"]:checked');
  return r ? r.value : 'multi';
}

function updateFlashSaleBanner() {
  const flashBanner = document.getElementById('flash-banner');
  const flashTimer = document.getElementById('flash-timer');
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
  const timerEl = flashBanner.querySelector('#flash-timer');
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
    const s = String(diffSec % 60).padStart(2, '0');
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
  if (window.customElements?.get('model-viewer')) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.type = 'module';
    s.src = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@1.12.0/dist/model-viewer.min.js';
    document.head.appendChild(s);
    resolve();
  });
}

function getCycleKey() {
  const now = new Date();
  const dateFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const hourFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: 'numeric',
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
  if (localStorage.getItem('slotCycle') !== key) {
    localStorage.setItem('slotCycle', key);
    localStorage.setItem('slotPurchases', '0');
  }
}

function getPurchaseCount() {
  resetPurchaseCount();
  const n = parseInt(localStorage.getItem('slotPurchases'), 10);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function recordPurchase() {
  resetPurchaseCount();
  const n = getPurchaseCount();
  localStorage.setItem('slotPurchases', String(n + 1));
}

function adjustedSlots(base) {
  const n = getPurchaseCount();
  return Math.max(0, base - n);
}

function computeSlotsByTime() {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour12: false,
    hour: 'numeric',
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
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour12: false,
    hour: 'numeric',
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

async function createCheckout(quantity, discount, discountCode, shippingInfo, referral, etchName) {
  const jobId = localStorage.getItem('print3JobId');
  const res = await fetch(`${API_BASE}/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobId,
      price: selectedPrice,
      qty: quantity,
      discount,
      discountCode,
      shippingInfo,
      referral,
      etchName,
    }),
  });
  const data = await res.json();
  return data.checkoutUrl;
}

function startFlashDiscount() {
  const flashBanner = document.getElementById('flash-banner');
  const flashTimer = document.getElementById('flash-timer');
  if (!flashBanner || !flashTimer) return;

  let show = sessionStorage.getItem('flashDiscountShow');
  if (!show) {
    show = Math.random() < 0.5 ? '1' : '0';
    sessionStorage.setItem('flashDiscountShow', show);
  }
  if (show === '0') {
    flashBanner.hidden = true;
    localStorage.removeItem('flashDiscountEnd');
    return;
  }

  const endStr = localStorage.getItem('flashDiscountEnd');
  if (endStr === '0') {
    flashBanner.hidden = true;
    return;
  }
  let end = parseInt(endStr, 10);

  if (!Number.isFinite(end)) {
    end = Date.now() + 5 * 60 * 1000;
    localStorage.setItem('flashDiscountEnd', String(end));
  } else if (end <= Date.now()) {
    flashBanner.hidden = true;
    localStorage.setItem('flashDiscountEnd', '0');
    return;
  }

  if (flashTimerId) {
    return;
  }
  const update = () => {
    const diff = end - Date.now();
    if (diff <= 0) {
      flashBanner.hidden = true;
      localStorage.setItem('flashDiscountEnd', '0');
      if (flashTimerId) {
        clearTimeout(flashTimerId);
        flashTimerId = null;
      }
      return;
    }
    const diffSec = Math.ceil(diff / 1000);
    const m = Math.floor(diffSec / 60);
    const s = String(diffSec % 60).padStart(2, '0');
    flashTimer.textContent = `${m}:${s}`;
    flashTimerId = setTimeout(update, 1000);
  };

  update();
  flashBanner.hidden = false;
}
window.startFlashDiscount = startFlashDiscount;

async function initPaymentPage() {
  await ensureModelViewerLoaded();
  const referralId = localStorage.getItem('referrerId');
  if (window.setWizardStage) window.setWizardStage('purchase');
  // Safely initialize Stripe once the DOM is ready. If the Stripe library
  // failed to load, we fall back to plain redirects.
  if (window.Stripe) {
    try {
      const resp = await fetch(`${API_BASE}/config/stripe`);
      const data = await resp.json();
      if (data.publishableKey) {
        stripe = window.Stripe(data.publishableKey);
      }
    } catch {
      // ignore if the config request fails
    }
  }
  const loader = document.getElementById('loader');
  const viewer = document.getElementById('viewer');
  const optOut = document.getElementById('opt-out');
  const emailEl = document.getElementById('checkout-email');
  const successMsg = document.getElementById('success');
  const cancelMsg = document.getElementById('cancel');
  const flashBanner = document.getElementById('flash-banner');
  const flashTimer = document.getElementById('flash-timer');
  const costEl = document.getElementById('cost-estimate');
  const etaEl = document.getElementById('eta-estimate');
  const slotEl = document.getElementById('slot-count');
  const colorSlotEl = document.getElementById('color-slot-count');
  const bulkSlotEl = document.getElementById('bulk-slot-count');
  const discountInput = document.getElementById('discount-code');
  const discountMsg = document.getElementById('discount-msg');
  const applyBtn = document.getElementById('apply-discount');
  if (referralId && discountMsg) {
    discountMsg.textContent = 'Referral discount applied';
  }
  const materialRadios = document.querySelectorAll('#material-options input[name="material"]');
  const subscriptionRadios = document.querySelectorAll(
    '#subscription-choice input[name="printclub"]'
  );
  const payBtn = document.getElementById('submit-payment');
  const singleLabel = document.getElementById('single-label');
  const singleInput = document.getElementById('opt-single');
  const colorMenu = document.getElementById('single-color-menu');
  const singleButton = singleLabel?.querySelector('span');
  const etchInput = document.getElementById('etch-name');
  const etchContainer = document.getElementById('etch-name-container');
  const etchWarning = document.getElementById('etch-warning');
  const storedRadio = document.querySelector(`#material-options input[value="${storedMaterial}"]`);
  if (storedRadio) storedRadio.checked = true;
  updateEtchVisibility(storedMaterial);
  if (storedMaterial === 'single') {
    if (singleButton && storedColor) {
      singleButton.style.backgroundColor = storedColor;
    }
    if (colorMenu) {
      if (storedColor) colorMenu.classList.add('hidden');
      else colorMenu.classList.remove('hidden');
    }
  } else if (colorMenu) {
    colorMenu.classList.add('hidden');
  }
  initPlaceAutocomplete();
  let discountCode = '';
  let discountValue = 0;
  let originalColor = null;
  let originalTextures = null;

  function hexToFactor(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m
      ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255, 1]
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
    else viewer.addEventListener('load', apply, { once: true });
  }

  function captureOriginal() {
    const mats = viewer.model?.materials || [];
    const mat = mats[0];
    if (mat?.pbrMetallicRoughness?.baseColorFactor)
      originalColor = mat.pbrMetallicRoughness.baseColorFactor.slice();
    originalTextures = mats.map((m) => m.pbrMetallicRoughness?.baseColorTexture?.texture || null);
    if (storedMaterial === 'single' && storedColor) {
      const factor = hexToFactor(storedColor);
      if (factor) applyModelColor(factor);
    }
  }

  viewer.addEventListener('load', captureOriginal, { once: true });
  if (viewer.model) captureOriginal();

  function updateEtchVisibility(val) {
    if (!etchInput || !etchContainer) return;
    const warning = document.getElementById('etch-warning');
    if (val === 'multi' || val === 'premium') {
      etchInput.disabled = false;
      etchInput.classList.remove(
        'cursor-not-allowed',
        'border-amber-500',
        'bg-amber-900/20',
        'text-amber-300',
        'placeholder-amber-300'
      );
      if (warning) warning.classList.add('hidden');
    } else {
      etchInput.disabled = true;
      etchInput.value = '';
      etchInput.classList.add('cursor-not-allowed');
      etchInput.classList.add(
        'border-amber-500',
        'bg-amber-900/20',
        'text-amber-300',
        'placeholder-amber-300'
      );
      if (warning) warning.classList.remove('hidden');


    }
  }

  function updatePayButton() {
    if (!payBtn) return;
    const joinClub =
      Array.from(subscriptionRadios).find((r) => r.checked)?.value === 'join';
    if (joinClub) {
      payBtn.textContent =
        `Join Print Club – Pay £${(PRINT_CLUB_PRICE / 100).toFixed(2)}`;
    } else {
      payBtn.textContent = `Pay £${(selectedPrice / 100).toFixed(2)}`;
    }
  }

  materialRadios.forEach((r) => {
    r.addEventListener('change', () => {
      if (r.checked) {
        selectedPrice = PRICES[r.value] || PRICES.single;
        updatePayButton();
        updateFlashSaleBanner();
        localStorage.setItem('print3Material', r.value);
        updateEtchVisibility(r.value);
        if (colorMenu) {
          if (r.value === 'single') {
            colorMenu.classList.remove('hidden');
          } else {
            colorMenu.classList.add('hidden');
            // Reset the single colour button when another option is selected
            if (singleButton) singleButton.style.backgroundColor = '';
            if (originalColor) applyModelColor(originalColor, true);
            localStorage.removeItem('print3Color');
          }
        }
      }
    });
  });

  subscriptionRadios.forEach((r) => {
    r.addEventListener('change', updatePayButton);
  });

  if (singleInput && colorMenu && singleButton) {
    singleInput.addEventListener('click', () => {
      // If already selected, allow reopening the color menu on click
      if (singleInput.checked && colorMenu.classList.contains('hidden')) {
        colorMenu.classList.remove('hidden');
      }
    });
    colorMenu.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-color]');
      if (btn) {
        const color = btn.dataset.color;
        singleButton.style.backgroundColor = color;
        const factor = hexToFactor(color);
        if (factor) applyModelColor(factor);
        localStorage.setItem('print3Color', color);
        localStorage.setItem('print3Material', 'single');
        colorMenu.classList.add('hidden');
      }
    });
  }
  updatePayButton();
  const sessionId = qs('session_id');
  if (sessionId) recordPurchase();
  let baseSlots = null;

  if (slotEl) {
    slotEl.style.visibility = 'hidden';
    if (bulkSlotEl) {
      bulkSlotEl.style.visibility = 'hidden';
    }
    // Compute a client-side slot count first so we have a reasonable value even
    // if the API fails or returns stale data.
    baseSlots = computeSlotsByTime();
    try {
      const resp = await fetch(`${API_BASE}/print-slots`);
      if (resp.ok) {
        const data = await resp.json();

        if (typeof data.slots === 'number') {
          baseSlots = data.slots;
        }
      }
    } catch {
      // ignore slot errors and fall back to the computed time-based value
    }
    slotEl.textContent = adjustedSlots(baseSlots);
    slotEl.style.visibility = 'visible';
    if (window.setWizardSlotCount) window.setWizardSlotCount(adjustedSlots(baseSlots));
    if (bulkSlotEl) {
      bulkSlotEl.textContent = adjustedSlots(baseSlots);
      bulkSlotEl.style.visibility = 'visible';
    }
  }

  if (colorSlotEl) {
    colorSlotEl.style.visibility = 'hidden';
    colorSlotEl.textContent = computeColorSlotsByTime();
    colorSlotEl.style.visibility = 'visible';
  }

  async function updateEstimate() {
    if (!costEl || !etaEl) return;
    const dest = {
      address: document.getElementById('ship-address').value,
      city: document.getElementById('ship-city').value,
      zip: document.getElementById('ship-zip').value,
    };
    try {
      const resp = await fetch(`${API_BASE}/shipping-estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: dest, model: { weight: 1 } }),
      });
      const data = await resp.json();
      if (data.cost) costEl.textContent = `Estimated Cost: $${data.cost.toFixed(2)}`;
      if (data.etaDays) etaEl.textContent = `ETA: ${data.etaDays} days`;
    } catch {
      /* ignore */
    }
  }

  function initPlaceAutocomplete() {
    const cityInput = document.getElementById('ship-city');
    const zipInput = document.getElementById('ship-zip');
    if (!cityInput || !window.google?.maps?.places) return;
    const ac = new google.maps.places.Autocomplete(cityInput, {
      types: ['(cities)'],
    });
    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place.address_components) return;
      let city = '';
      let country = '';
      let postal = '';
      place.address_components.forEach((c) => {
        if (c.types.includes('locality')) city = c.long_name;
        if (c.types.includes('country')) country = c.short_name;
        if (c.types.includes('postal_code')) postal = c.long_name;
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
  viewer.addEventListener('load', hideLoader);
  viewer.addEventListener('error', () => {
    viewer.src = FALLBACK_GLB;
    hideLoader();
  });

  // Wait for the <model-viewer> definition before assigning the model source.
  // Some browsers won't process the "src" attribute on a custom element until
  // after it's upgraded, so we guard against that here.
  if (window.customElements?.whenDefined) {
    try {
      await customElements.whenDefined('model-viewer');
    } catch {
      // ignore if the element never upgrades
    }
  }

  loader.hidden = false;
  // Assign the model source only after the load/error listeners are in place
  viewer.src = localStorage.getItem('print3Model') || FALLBACK_GLB;

  // Hide the overlay if nothing happens after a short delay
  setTimeout(hideLoader, 7000);

  if (sessionId) {
    successMsg.hidden = false;
    const popup = document.getElementById('bulk-discount-popup');
    const closeBtn = document.getElementById('bulk-discount-close');
    if (popup && closeBtn) {
      popup.classList.remove('hidden');
      closeBtn.addEventListener('click', () => popup.classList.add('hidden'));
    }
    const refInput = document.getElementById('referral-link');
    const refDiv = document.getElementById('referral');
    const copyBtn = document.getElementById('copy-referral');
    const reorderBtn = document.getElementById('reorder-color');
    const userId = getUserIdFromToken();
    if (refInput && refDiv && copyBtn && userId) {
      const link = `${window.location.origin}/index.html?ref=${encodeURIComponent(userId)}`;
      refInput.value = link;
      refDiv.classList.remove('hidden');
      copyBtn.addEventListener('click', () => {
        refInput.select();
        try {
          document.execCommand('copy');
        } catch {}
      });
    }
    reorderBtn?.addEventListener('click', () => {
      window.location.href = 'payment.html';
    });
    const nextModal = document.getElementById('next-print-modal');
    const nextBtn = document.getElementById('next-print-btn');
    const nextText = document.getElementById('next-print-text');

    const discountSpan = document.getElementById('next-discount');
    if (nextModal && nextBtn && nextText && discountSpan) {
      const span = nextText.querySelector('span');
      const suggestion = NEXT_PROMPTS[Math.floor(Math.random() * NEXT_PROMPTS.length)];
      if (span) span.textContent = suggestion;
      try {
        const resp = await fetch(`${API_BASE}/generate-discount`, { method: 'POST' });
        if (resp.ok) {
          const data = await resp.json();
          discountSpan.textContent = data.code;
        }
      } catch {
        discountSpan.textContent = 'SAVE5';
      }

      nextBtn.addEventListener('click', () => {
        localStorage.setItem('print3Prompt', suggestion);
        window.location.href = 'index.html';
      });
      nextModal.classList.remove('hidden');
    }
    return;
  }
  if (qs('cancel')) {
    cancelMsg.hidden = false;
  }

  if (flashBanner) {
    await fetchFlashSale();
  }

  // Prefill shipping fields from saved profile
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const resp = await fetch(`${API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const profile = await resp.json();
        const ship = profile.shipping_info || {};
        if (ship.name) document.getElementById('ship-name').value = ship.name;
        if (ship.address) document.getElementById('ship-address').value = ship.address;
        if (ship.city) document.getElementById('ship-city').value = ship.city;
        if (ship.zip) document.getElementById('ship-zip').value = ship.zip;
        await updateEstimate();
      }
    } catch {
      /* ignore profile errors */
    }
  }

  ['ship-address', 'ship-city', 'ship-zip'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', updateEstimate);
  });

  applyBtn?.addEventListener('click', async () => {
    const code = discountInput.value.trim();
    if (!code) return;
    discountMsg.textContent = 'Checking…';
    try {
      const resp = await fetch(`${API_BASE}/discount-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      if (resp.ok) {
        const data = await resp.json();
        discountCode = code;
        discountValue = data.discount || 0;
        discountMsg.textContent = `Code applied: -$${(discountValue / 100).toFixed(2)}`;
      } else {
        discountCode = '';
        discountValue = 0;
        discountMsg.textContent = 'Invalid code';
      }
    } catch {
      discountMsg.textContent = 'Error validating code';
    }
  });

  const payHandler = async () => {
    const basket = window.getBasket ? window.getBasket() : [];
    const qty = Math.max(1, basket.length || 0);
    let discount = 0;
    const end = parseInt(localStorage.getItem('flashDiscountEnd'), 10) || 0;
    if (end && end > Date.now()) {
      discount += Math.round(selectedPrice * 0.05);
    }
    if (
      flashSale &&
      Date.now() < new Date(flashSale.end_time).getTime() &&
      selectedMaterialValue() === flashSale.product_type
    ) {
      discount += Math.round(selectedPrice * (flashSale.discount_percent / 100));
    }
    const shippingInfo = {
      name: document.getElementById('ship-name').value,
      address: document.getElementById('ship-address').value,
      city: document.getElementById('ship-city').value,
      zip: document.getElementById('ship-zip').value,
      email: emailEl.value,
    };
    let etchName = '';
    if (etchInput && !etchInput.disabled) {
      etchName = etchInput.value
        .replace(/[^a-z0-9 ]/gi, '')
        .slice(0, 20)
        .trim();
    }
    const url = await createCheckout(
      qty,
      discount,
      discountCode,
      shippingInfo,
      referralId,
      etchName || undefined
    );
    if (stripe) {
      stripe.redirectToCheckout({ sessionId: url.split('session_id=')[1] });
    } else {
      // Fallback if Stripe failed to load: just navigate to the checkout URL
      window.location.href = url;
    }
    if (emailEl.value) {
      fetch(`${API_BASE}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailEl.value }),
      });
    }

    const joinClub = Array.from(subscriptionRadios).find((r) => r.checked)?.value === 'join';
    const token = localStorage.getItem('token');
    if (joinClub && token) {
      fetch(`${API_BASE}/subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
    }
  };
  window.payHandler = payHandler;

  document.getElementById('submit-payment').addEventListener('click', () => payHandler());

  const alignBadge = () => {
    const badge = document.getElementById('money-back-badge');
    if (!badge || !payBtn) return;
    const btnRect = payBtn.getBoundingClientRect();
    const container = badge.parentElement;
    const containerRect = container && container.getBoundingClientRect();
    if (!containerRect) return;

    const offset = btnRect.top + btnRect.height / 2 - containerRect.top;
    // Center the badge on the button and override the initial transform
    badge.style.transform = 'translateY(-50%)';
    badge.style.top = offset + 'px';
    badge.style.visibility = 'visible';
  };
  alignBadge();
  window.addEventListener('resize', alignBadge);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPaymentPage);
} else {
  initPaymentPage();
}

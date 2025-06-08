// Initialize Stripe after the library loads to avoid breaking the rest of the
// page if the network request for Stripe fails. This variable will be assigned
// once the DOM content is ready.
let stripe = null;
const FALLBACK_GLB = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
const PRICE = 2000;
const API_BASE = (window.API_ORIGIN || '') + '/api';
// Time zone used to reset local purchase counts at 1 AM Eastern
const TZ = 'America/New_York';
let flashTimerId = null;

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

function qs(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

async function createCheckout(quantity, discount, shippingInfo) {
  const jobId = localStorage.getItem('print3JobId');
  const res = await fetch(`${API_BASE}/create-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, price: PRICE, qty: quantity, discount, shippingInfo }),
  });
  const data = await res.json();
  return data.checkoutUrl;
}

document.addEventListener('DOMContentLoaded', async () => {
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
  const sessionId = qs('session_id');
  if (sessionId) recordPurchase();
  let baseSlots = null;

  if (slotEl) {
    try {
      const resp = await fetch(`${API_BASE}/print-slots`);
      if (resp.ok) {
        const data = await resp.json();

        baseSlots = data.slots;
        slotEl.textContent = adjustedSlots(baseSlots);
      }
    } catch {
      /* ignore slot errors */
    }
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

  function startFlashDiscount() {
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
  viewer.src =
    localStorage.getItem('print3Model') || localStorage.getItem('print2Model') || FALLBACK_GLB;

  // Hide the overlay if nothing happens after a short delay
  setTimeout(hideLoader, 7000);

  if (sessionId) {
    successMsg.hidden = false;
    return;
  }
  if (qs('cancel')) {
    cancelMsg.hidden = false;
  }

  if (flashBanner) {
    startFlashDiscount();
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
  updateEstimate();

  document.getElementById('submit-payment').addEventListener('click', async () => {
    const qty = 1;
    let discount = 0;
    const end = parseInt(localStorage.getItem('flashDiscountEnd'), 10) || 0;
    if (end && end > Date.now()) {
      discount += Math.round(PRICE * 0.05);
    }
    const shippingInfo = {
      name: document.getElementById('ship-name').value,
      address: document.getElementById('ship-address').value,
      city: document.getElementById('ship-city').value,
      zip: document.getElementById('ship-zip').value,
      email: emailEl.value,
    };
    const url = await createCheckout(qty, discount, shippingInfo);
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
  });
});

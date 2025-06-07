// Initialize Stripe after the library loads to avoid breaking the rest of the
// page if the network request for Stripe fails. This variable will be assigned
// once the DOM content is ready.
let stripe = null;
const FALLBACK_GLB = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
const PRICE = 2000;

function qs(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

async function createCheckout(quantity, discount, shippingInfo) {
  const jobId = localStorage.getItem('print3JobId');
  const res = await fetch('/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, price: PRICE, qty: quantity, discount, shippingInfo }),
  });
  const data = await res.json();
  return data.checkoutUrl;
}

async function init() {
  // Safely initialize Stripe once the DOM is ready. If the Stripe library
  // failed to load, we fall back to plain redirects.
  if (window.Stripe) {
    try {
      const resp = await fetch('/api/config/stripe');
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

  async function updateEstimate() {
    if (!costEl || !etaEl) return;
    const dest = {
      address: document.getElementById('ship-address').value,
      city: document.getElementById('ship-city').value,
      zip: document.getElementById('ship-zip').value,
    };
    try {
      const resp = await fetch('/api/shipping-estimate', {
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

  let flashDiscountInterval;

  function startFlashDiscount() {
    // Always hide the banner until the timer text is updated to avoid flicker
    flashBanner.hidden = true;
    let end = parseInt(localStorage.getItem('flashDiscountEnd'), 10);

    if (flashDiscountInterval) {
      clearInterval(flashDiscountInterval);
      flashDiscountInterval = null;
    }

    if (!Number.isFinite(end) || end <= Date.now()) {
      end = Date.now() + 5 * 60 * 1000;
      localStorage.setItem('flashDiscountEnd', String(end));
    }

    const update = () => {
      const diff = end - Date.now();
      if (diff <= 0) {
        flashBanner.hidden = true;
        localStorage.removeItem('flashDiscountEnd');
        if (flashDiscountInterval) {
          clearInterval(flashDiscountInterval);
          flashDiscountInterval = null;
        }
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000)
        .toString()
        .padStart(2, '0');
      flashTimer.textContent = `${m}:${s}`;
    };

    update();
    if (end > Date.now()) {
      flashBanner.hidden = false;
      flashDiscountInterval = setInterval(update, 1000);
    } else {
      localStorage.removeItem('flashDiscountEnd');
    }
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

  const sessionId = qs('session_id');
  if (sessionId) {
    successMsg.hidden = false;
    return;
  }
  if (qs('cancel')) {
    cancelMsg.hidden = false;
  }

  if (flashBanner) {
    startFlashDiscount();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        startFlashDiscount();
      }
    });
  }

  // Prefill shipping fields from saved profile
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const resp = await fetch('/api/profile', {
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
      fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailEl.value }),
      });
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

// Initialize Stripe after the library loads to avoid breaking the rest of the
// page if the network request for Stripe fails. This variable will be assigned
// once the DOM content is ready.
let stripe = null;
const FALLBACK_GLB =
  "https://modelviewer.dev/shared-assets/models/Astronaut.glb";

function qs(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

async function createCheckout(quantity, discount) {
  const jobId = localStorage.getItem("print3JobId");
  const res = await fetch("/api/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId, price: 2000, qty: quantity, discount }),
  });
  const data = await res.json();
  return data.checkoutUrl;
}

document.addEventListener("DOMContentLoaded", async () => {
  // Safely initialize Stripe once the DOM is ready. If the Stripe library
  // failed to load, we fall back to plain redirects.
  if (window.Stripe) {
    stripe = window.Stripe("pk_test_placeholder");
  }
  const loader = document.getElementById("loader");
  const viewer = document.getElementById("viewer");
  const qtyInput = document.getElementById("qty");
  const optOut = document.getElementById("opt-out");
  const successMsg = document.getElementById("success");
  const cancelMsg = document.getElementById("cancel");

  const hideLoader = () => (loader.hidden = true);

  // Wait briefly for the <model-viewer> element to be defined before
  // attaching events. If the library fails to load we still continue so the
  // loader will eventually hide and the fallback model appears.
  if (window.customElements?.whenDefined) {
    try {
      await Promise.race([
        customElements.whenDefined("model-viewer"),
        new Promise((r) => setTimeout(r, 3000)),
      ]);
    } catch {
      // ignore if the element never upgrades
    }
  }

  viewer.addEventListener("load", hideLoader);
  viewer.addEventListener("model-visibility", hideLoader);
  viewer.addEventListener("error", () => {
    viewer.src = FALLBACK_GLB;
    hideLoader();
  });

  loader.hidden = false;
  viewer.src =
    localStorage.getItem("print3Model") ||
    localStorage.getItem("print2Model") ||
    FALLBACK_GLB;

  // Hide the overlay if nothing happens after a short delay
  setTimeout(hideLoader, 7000);

  const sessionId = qs("session_id");
  if (sessionId && successMsg) {
    successMsg.hidden = false;
    return;
  }
  if (qs("cancel") && cancelMsg) {
    cancelMsg.hidden = false;
  }

  document
    .getElementById("submit-payment")
    .addEventListener("click", async () => {
      const qty = parseInt(qtyInput.value) || 1;
      const discount = qty >= 3 && !optOut.checked ? 200 : 0;
      const url = await createCheckout(qty, discount);
      if (stripe) {
        stripe.redirectToCheckout({ sessionId: url.split("session_id=")[1] });
      } else {
        // Fallback if Stripe failed to load: just navigate to the checkout URL
        window.location.href = url;
      }
    });
});

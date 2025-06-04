const stripe = Stripe("pk_test_placeholder");
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
  const loader = document.getElementById("loader");
  const viewer = document.getElementById("viewer");
  const qtyInput = document.getElementById("qty");
  const optOut = document.getElementById("opt-out");
  const successMsg = document.getElementById("success");
  const cancelMsg = document.getElementById("cancel");

  const hideLoader = () => (loader.hidden = true);
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
  setTimeout(hideLoader, 7000);

  const sessionId = qs("session_id");
  if (sessionId) {
    successMsg.hidden = false;
    return;
  }
  if (qs("cancel")) {
    cancelMsg.hidden = false;
  }

  document
    .getElementById("submit-payment")
    .addEventListener("click", async () => {
      const qty = parseInt(qtyInput.value) || 1;
      const discount = qty >= 3 && !optOut.checked ? 200 : 0;
      const url = await createCheckout(qty, discount);
      stripe.redirectToCheckout({ sessionId: url.split("session_id=")[1] });
    });
});

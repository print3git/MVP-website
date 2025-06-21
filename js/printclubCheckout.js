const PRINT_CLUB_PRICE = 14999;
let PRICING_VARIANT = localStorage.getItem("pricingVariant");
if (!PRICING_VARIANT) {
  PRICING_VARIANT = Math.random() < 0.5 ? "A" : "B";
  localStorage.setItem("pricingVariant", PRICING_VARIANT);
}
const API_BASE = (window.API_ORIGIN || "") + "/api";

function qs(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

document.addEventListener("DOMContentLoaded", () => {
  const priceSpan = document.getElementById("printclub-price");
  const successMsg = document.getElementById("success");
  const cancelMsg = document.getElementById("cancel");
  if (priceSpan) {
    const hasReferral = Boolean(localStorage.getItem("referrerId"));
    const price = hasReferral
      ? (PRINT_CLUB_PRICE * 0.9) / 100
      : PRINT_CLUB_PRICE / 100;
    priceSpan.textContent = hasReferral
      ? `Join print2 pro £${price.toFixed(2)} first month`
      : `Join print2 pro £${price.toFixed(2)}/mo`;
  }

  const sessionId = qs("session_id");
  if (sessionId) {
    successMsg?.classList.remove("hidden");
    const token = localStorage.getItem("token");
    if (token) {
      fetch(`${API_BASE}/subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          variant: PRICING_VARIANT,
          price_cents: PRINT_CLUB_PRICE,
        }),
      }).catch(() => {});
    }
  } else if (qs("cancel")) {
    cancelMsg?.classList.remove("hidden");
  }
});

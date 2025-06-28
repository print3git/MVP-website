const PRINT_CLUB_PRICE = 14999;
const FIRST_MONTH_DISCOUNT = 0.5;
const ANNUAL_DISCOUNT = 0.9;
const PRINT_CLUB_ANNUAL_PRICE = Math.round(
  PRINT_CLUB_PRICE * 12 * ANNUAL_DISCOUNT,
);
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
  const annualSpan = document.getElementById("printclub-annual");
  const payBtn = document.getElementById("submit-payment");
  const successMsg = document.getElementById("success");
  const cancelMsg = document.getElementById("cancel");
  const updatePrices = () => {
    const hasReferral = Boolean(localStorage.getItem("referrerId"));
    const firstMonth =
      ((PRINT_CLUB_PRICE * FIRST_MONTH_DISCOUNT) / 100) *
      (hasReferral ? 0.9 : 1);
    if (priceSpan) {
      priceSpan.textContent = `Join print2 Pro £${firstMonth.toFixed(2)} first month`;
      if (payBtn)
        payBtn.textContent = `Join print2 Pro – Pay £${firstMonth.toFixed(2)}`;
    }
    if (annualSpan)
      annualSpan.textContent = `Annual £${(PRINT_CLUB_ANNUAL_PRICE / 100).toFixed(2)}`;
  };
  updatePrices();
  document
    .querySelectorAll('#subscription-choice input[name="printclub"]')
    .forEach((r) => {
      r.addEventListener("change", () => {
        const val = r.value;
        if (val === "annual" && payBtn) {
          payBtn.textContent = `Join print2 Pro – Pay £${(PRINT_CLUB_ANNUAL_PRICE / 100).toFixed(2)}`;
        } else {
          updatePrices();
        }
      });
    });

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
          price_cents:
            document.querySelector(
              '#subscription-choice input[name="printclub"]:checked',
            )?.value === "annual"
              ? PRINT_CLUB_ANNUAL_PRICE
              : Math.round(PRINT_CLUB_PRICE * FIRST_MONTH_DISCOUNT),
        }),
      }).catch(() => {});
    }
  } else if (qs("cancel")) {
    cancelMsg?.classList.remove("hidden");
  }
});

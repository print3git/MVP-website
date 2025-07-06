(function () {
  const ready =
    (typeof process !== "undefined" &&
      process.env &&
      process.env.NEXT_PUBLIC_STRIPE_READY) ||
    window.NEXT_PUBLIC_STRIPE_READY;
  if (ready === "true") return;
  function disableAll() {
    document.querySelectorAll('input[type="file"]').forEach((el) => {
      el.disabled = true;
      el.classList.add("opacity-50", "cursor-not-allowed");
    });
    const selectors = [
      "#submit-payment",
      "#checkout-button",
      "#basket-checkout",
      "#basket-model-checkout",
      "#checkout-all",
      "#modal-checkout",
      "#buy-now-button",
      "#avatar-upload",
    ];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        el.addEventListener("click", (e) => e.preventDefault());
        if (el.tagName !== "A") el.disabled = true;
        else el.removeAttribute("href");
        el.classList.add("opacity-50", "cursor-not-allowed");
      });
    });
    document
      .querySelectorAll('a[href*="payment.html"],a[href*="checkout.html"]')
      .forEach((a) => {
        a.addEventListener("click", (e) => e.preventDefault());
        a.removeAttribute("href");
        a.classList.add("opacity-50", "cursor-not-allowed");
      });
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", disableAll);
  else disableAll();
})();

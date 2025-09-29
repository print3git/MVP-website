"use strict";

function initDiscountDeliveryBanner(
  bannerEl,
  {
    discountMessage = "24% off when you order 3 prints",
    getNow = () => new Date(),
    scheduleInterval = (fn, interval) => setInterval(fn, interval),
    scheduleTimeout = (fn, delay) => setTimeout(fn, delay),
  } = {},
) {
  if (!bannerEl) return;

  let countdownText = "";
  let showDiscount = true;

  if (!bannerEl.style.opacity) bannerEl.style.opacity = "1";
  if (!bannerEl.style.transition) bannerEl.style.transition = "opacity 1s";
  if (!bannerEl.style.position) bannerEl.style.position = "sticky";
  if (!bannerEl.style.top) bannerEl.style.top = "0";
  if (!bannerEl.style.zIndex) bannerEl.style.zIndex = "50";
  if (!bannerEl.classList.contains("w-full")) bannerEl.classList.add("w-full");

  const discountMarkup = discountMessage;

  function setDiscountMessage() {
    bannerEl.innerHTML = discountMarkup;
  }

  setDiscountMessage();

  function getCountdownText() {
    const now = getNow();
    const day = now.getDay();
    const friday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    friday.setDate(friday.getDate() + ((5 - day + 7) % 7));
    const diff = friday - now;
    if (day !== 0 && day !== 6 && diff > 0 && diff < 7 * 86400000) {
      const hoursTotal = Math.floor(diff / 3600000);
      const days = Math.floor(hoursTotal / 24);
      const hours = hoursTotal % 24;
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      parts.push(`${hours.toString().padStart(2, "0")}h`);
      parts.push(`${minutes.toString().padStart(2, "0")}m`);
      parts.push(`${seconds.toString().padStart(2, "0")}s`);
      return `${parts.join(" ")} left for weekend delivery`;
    }
    return "";
  }

  function refresh() {
    countdownText = getCountdownText();
    bannerEl.classList.remove("hidden");
    if (!countdownText) {
      showDiscount = true;
      setDiscountMessage();
    } else if (!showDiscount) {
      bannerEl.textContent = countdownText;
    }
  }

  function scheduleCycle() {
    scheduleTimeout(cycle, 7000);
  }

  function cycle() {
    if (!countdownText) {
      scheduleCycle();
      return;
    }
    bannerEl.style.opacity = "0";
    scheduleTimeout(() => {
      showDiscount = !showDiscount;
      if (showDiscount) {
        setDiscountMessage();
      } else {
        bannerEl.textContent = countdownText;
      }
      bannerEl.style.opacity = "1";
    }, 1000);
    scheduleCycle();
  }

  refresh();
  scheduleInterval(refresh, 1000);
  scheduleCycle();
}

export { initDiscountDeliveryBanner };
export default initDiscountDeliveryBanner;

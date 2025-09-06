const API_BASE = (window.API_ORIGIN || "") + "/api";
const TZ = "America/New_York";

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
  try {
    const key = getCycleKey();
    if (localStorage.getItem("slotCycle") !== key) {
      localStorage.setItem("slotCycle", key);
      localStorage.setItem("slotPurchases", "0");
    }
  } catch {
    /* ignore storage errors */
  }
}

function getPurchaseCount() {
  try {
    resetPurchaseCount();
    const n = parseInt(localStorage.getItem("slotPurchases"), 10);
    return Number.isInteger(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function recordSlotPurchase() {
  resetPurchaseCount();
  const n = getPurchaseCount();
  localStorage.setItem("slotPurchases", String(n + 1));
}

export function adjustedSlots(base) {
  const n = getPurchaseCount();
  return Math.max(0, base - n);
}

export function computeSlotsByTime() {
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

function computePrintRunHours() {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour12: false,
    hour: "numeric",
  });
  const hour = parseInt(dtf.format(new Date()), 10);
  const remain = 6 - (hour % 6);
  return remain === 0 ? 6 : remain;
}

export async function updatePrintRunInfo() {
  const hoursEl = document.getElementById("print-run-hours");
  const hoursLabelEl = document.getElementById("print-run-hours-label");
  const slotsEl = document.getElementById("print-run-slots");
  const info = document.getElementById("print-run-info");
  if (!hoursEl || !slotsEl) return computeSlotsByTime();
  let baseSlots = computeSlotsByTime();
  slotsEl.textContent = `${adjustedSlots(baseSlots)}`;
  try {
    const resp = await fetch(`${API_BASE}/print-slots`);
    if (resp.ok) {
      const data = await resp.json();
      if (typeof data.slots === "number") {
        baseSlots = data.slots;
        slotsEl.textContent = `${adjustedSlots(baseSlots)}`;
      }
    }
  } catch {
    /* ignore */
  }
  const hours = computePrintRunHours();
  hoursEl.textContent = hours;
  if (hoursLabelEl) hoursLabelEl.textContent = hours === 1 ? "hour" : "hours";

  if (info) info.classList.remove("invisible");
  if (typeof window.positionQuote === "function") {
    requestAnimationFrame(() => window.positionQuote());
  }
  return baseSlots;
}

export async function initPrintSlots() {
  const base = await updatePrintRunInfo();
  const slotEl = document.getElementById("slot-count");
  if (slotEl) {
    let baseSlots = typeof base === "number" ? base : computeSlotsByTime();
    try {
      const resp = await fetch(`${API_BASE}/print-slots`);
      if (resp.ok) {
        const data = await resp.json();
        if (typeof data.slots === "number") {
          baseSlots = data.slots;
        }
      }
    } catch {}
    slotEl.textContent = adjustedSlots(baseSlots);
    slotEl.style.visibility = "visible";
  }
}

void initPrintSlots();

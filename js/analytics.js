const API_BASE =
  (typeof window !== "undefined" && window.API_ORIGIN
    ? window.API_ORIGIN
    : "") + "/api";

export function track(event, data = {}) {
  if (typeof window !== "undefined" && window.__TEST_HOOKS__?.trackEvent) {
    try {
      window.__TEST_HOOKS__.trackEvent(event, data);
    } catch {}
  } else if (global.__TEST_HOOKS__?.trackEvent) {
    try {
      global.__TEST_HOOKS__.trackEvent(event, data);
    } catch {}
  }
  if (typeof fetch !== "function") return Promise.resolve();
  return fetch(`${API_BASE}/track/${event}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

if (typeof module !== "undefined") {
  module.exports = { track };
}

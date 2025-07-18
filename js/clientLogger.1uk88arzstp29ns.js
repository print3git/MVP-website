// Lightweight client logging plugin
// Hooks into navigation, performance metrics, errors and optionally clicks.

const defaultLogger = (event, data) => {
  if (typeof console !== "undefined") {
    console.log(`[log] ${event}`, data);
  }
};

export function createClientLogger(options = {}) {
  const { onLog = defaultLogger, trackClicks = false } = options;

  function log(event, data = {}) {
    try {
      onLog(event, data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Logging plugin error", err);
    }
  }

  function logPerformance() {
    const nav = performance.getEntriesByType("navigation")[0];
    if (nav) {
      log("performance", {
        type: "navigation",
        ttfb: nav.responseStart,
      });
    }
  }

  function observeMetrics() {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          log("performance", { type: "fcp", value: entry.startTime });
        } else if (entry.entryType === "largest-contentful-paint") {
          log("performance", { type: "lcp", value: entry.startTime });
        }
      }
    });
    try {
      po.observe({ type: "paint", buffered: true });
      po.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {}
  }

  function hookNavigation() {
    const handler = () => log("navigation", { url: location.href });
    ["pushState", "replaceState"].forEach((type) => {
      const orig = history[type];
      history[type] = function (...args) {
        const res = orig.apply(this, args);
        handler();
        return res;
      };
    });
    window.addEventListener("popstate", handler);
  }

  function hookErrors() {
    window.addEventListener("error", (e) => {
      log("error", { message: e.message, stack: e.error?.stack });
    });
    window.addEventListener("unhandledrejection", (e) => {
      log("error", {
        message: e.reason?.message || String(e.reason),
        stack: e.reason?.stack,
      });
    });
  }

  function hookClicks() {
    if (!trackClicks) return;
    document.addEventListener("click", (e) => {
      const target = e.target.closest("[data-log-click]");
      if (target) {
        log("click", { id: target.id, text: target.textContent?.trim() });
      }
    });
  }

  function init() {
    if (typeof window === "undefined") return;
    logPerformance();
    observeMetrics();
    hookNavigation();
    hookErrors();
    hookClicks();
  }

  return { init };
}

export default { createClientLogger };

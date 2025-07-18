/** @jest-environment node */
const { JSDOM } = require("jsdom");

// Minimal copy of ensureModelViewerLoaded from js/index.js
function ensureModelViewerLoaded() {
  if (global.window.customElements?.get("model-viewer")) {
    return Promise.resolve();
  }
  if (
    typeof navigator !== "undefined" &&
    (navigator.userAgent?.includes("Node.js") ||
      navigator.userAgent?.includes("jsdom"))
  ) {
    return Promise.resolve();
  }
  const cdnUrl =
    "https://cdn.jsdelivr.net/npm/@google/model-viewer@1.12.0/dist/model-viewer.min.js";
  const localUrl = "js/model-viewer.min.js";
  return new Promise((resolve) => {
    const s = global.document.createElement("script");
    s.type = "module";
    s.src = cdnUrl;
    const done = () => clearTimeout(timer);
    s.onload = () => {
      done();
      global.window.modelViewerSource = "cdn";
      resolve();
    };
    s.onerror = () => {
      done();
      s.remove();
      global.window.modelViewerSource = "local";
      const fallback = global.document.createElement("script");
      fallback.type = "module";
      fallback.src = localUrl;
      fallback.onload = resolve;
      fallback.onerror = resolve;
      global.document.head.appendChild(fallback);
    };
    global.document.head.appendChild(s);
    const timer = setTimeout(() => {
      if (!global.window.customElements?.get("model-viewer")) {
        s.onerror();
      }
    }, 3000);
  });
}

test("falls back to local script when CDN script fails", async () => {
  const dom = new JSDOM(
    "<!doctype html><html><head></head><body></body></html>",
    {
      runScripts: "dangerously",
      resources: "usable",
      url: "https://localhost/",
    },
  );
  global.window = dom.window;
  global.document = dom.window.document;

  const loaded = [];
  const origAppend = global.document.head.appendChild.bind(
    global.document.head,
  );
  global.document.head.appendChild = (el) => {
    loaded.push(el.src);
    const host = (() => {
      try {
        return new URL(el.src).hostname;
      } catch {
        return "";
      }
    })();
    if (host === "cdn.jsdelivr.net") {
      setImmediate(() => el.onerror && el.onerror());
    } else {
      global.window.customElements.define("model-viewer", class {});
      setImmediate(() => el.onload && el.onload());
    }
    return origAppend(el);
  };

  await ensureModelViewerLoaded();

  expect(loaded.some((s) => s.includes("model-viewer.min.js"))).toBe(true);
  expect(global.window.modelViewerSource).toBe("local");
  expect(global.window.customElements.get("model-viewer")).toBeDefined();
});

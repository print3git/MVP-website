const { JSDOM } = require("jsdom");

// Minimal copy of the ensureModelViewerLoaded helper from js/index.js
function ensureModelViewerLoaded() {
  if (global.window.customElements?.get("model-viewer")) {
    return Promise.resolve();
  }
  const cdnUrl =
    "https://cdn.jsdelivr.net/npm/@google/model-viewer@1.12.0/dist/model-viewer.min.js";
  const localUrl = "js/model-viewer.min.js";
  return new Promise((resolve) => {
    const script = global.document.createElement("script");
    script.type = "module";
    script.src = cdnUrl;
    script.onload = resolve;
    script.onerror = () => {
      script.remove();
      const fallback = global.document.createElement("script");
      fallback.type = "module";
      fallback.src = localUrl;
      fallback.onload = resolve;
      fallback.onerror = resolve;
      global.document.head.appendChild(fallback);
    };
    global.document.head.appendChild(script);
    setTimeout(() => {
      if (!global.window.customElements?.get("model-viewer")) {
        script.onerror();
      }
    }, 3000);
  });
}

test("falls back to local script when CDN fails", async () => {
  const dom = new JSDOM(
    "<!doctype html><html><head></head><body></body></html>",
    {
      runScripts: "dangerously",
      resources: "usable",
      url: "http://localhost/",
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
    // Simulate CDN failure
    if (el.src.includes("cdn.jsdelivr.net")) {
      setImmediate(() => el.onerror && el.onerror());
    } else {
      // Define the custom element and resolve
      global.window.customElements.define("model-viewer", class {});
      setImmediate(() => el.onload && el.onload());
    }
    return origAppend(el);
  };

  await ensureModelViewerLoaded();

  expect(loaded.some((s) => s.includes("model-viewer.min.js"))).toBe(true);
  expect(global.window.customElements.get("model-viewer")).toBeDefined();
});

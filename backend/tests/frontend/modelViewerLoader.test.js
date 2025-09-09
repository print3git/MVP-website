const { JSDOM } = require("jsdom");

// Minimal copy of the ensureModelViewerLoaded helper from js/index.js
function ensureModelViewerLoaded() {
  if (global.window.customElements?.get("model-viewer")) {
    return Promise.resolve();
  }

  const cdnUrl =
    "https://cdn.jsdelivr.net/npm/@google/model-viewer@1.12.0/dist/model-viewer.min.js";
  const localUrl = "js/model-viewer.min.js";

  return new Promise((resolve, reject) => {
    const finalize = () => {
      if (global.window.customElements?.get("model-viewer")) {
        resolve();
      } else {
        reject(new Error("model-viewer failed to load"));
      }
    };

    const s = global.document.createElement("script");
    s.type = "module";
    s.src = cdnUrl;
    let timer;
    s.onload = () => {
      clearTimeout(timer);
      finalize();
    };
    s.onerror = () => {
      clearTimeout(timer);
      s.remove();
      const fallback = global.document.createElement("script");
      fallback.type = "module";
      fallback.src = localUrl;
      fallback.onload = finalize;
      fallback.onerror = () => reject(new Error("model-viewer failed to load"));
      global.document.head.appendChild(fallback);
    };
    global.document.head.appendChild(s);
    timer = setTimeout(() => {
      if (!global.window.customElements?.get("model-viewer")) {
        s.onerror();
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
  expect(global.window.customElements.get("model-viewer")).toBeDefined();
});

test("rejects when both CDN and local scripts fail", async () => {
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

  global.document.head.appendChild = (el) => {
    setImmediate(() => el.onerror && el.onerror());
    return el;
  };

  await expect(ensureModelViewerLoaded()).rejects.toThrow(
    /model-viewer failed to load/,
  );
});

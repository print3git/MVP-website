const { JSDOM } = require("jsdom");

// Minimal copy of the ensureModelViewerLoaded helper from js/index.js
function ensureModelViewerLoaded() {
  if (global.window.customElements?.get("model-viewer")) {
    return Promise.resolve();
  }

  const cdnUrl =
    "https://cdn.jsdelivr.net/npm/@google/model-viewer@1.12.0/dist/model-viewer.min.js";
  const localUrl = "js/model-viewer.min.js";

  function loadScript(src, done) {
    const s = global.document.createElement("script");
    s.type = "module";
    s.src = src;
    s.onload = done;
    s.onerror = done;
    global.document.head.appendChild(s);
  }

  return new Promise((resolve, reject) => {
    const finalize = (attemptedLocal) => {
      if (global.window.customElements?.get("model-viewer")) {
        resolve();
      } else if (!attemptedLocal) {
        loadScript(localUrl, () => finalize(true));
      } else {
        reject(new Error("model-viewer failed to load"));
      }
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    global
      .fetch(cdnUrl, {
        method: "HEAD",
        mode: "no-cors",
        signal: controller.signal,
      })
      .then(() => {
        clearTimeout(timer);
        loadScript(cdnUrl, () => finalize(false));
      })
      .catch(() => {
        clearTimeout(timer);
        loadScript(localUrl, () => finalize(true));
      });
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

  global.fetch = jest.fn().mockResolvedValue({});

  await ensureModelViewerLoaded();

  expect(global.fetch).toHaveBeenCalled();
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

  global.fetch = jest.fn().mockResolvedValue({});

  await expect(ensureModelViewerLoaded()).rejects.toThrow(
    /model-viewer failed to load/,
  );
});

test("falls back when HEAD request fails", async () => {
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
    if (el.src.includes("model-viewer.min.js")) {
      global.window.customElements.define("model-viewer", class {});
      setImmediate(() => el.onload && el.onload());
    }
    return origAppend(el);
  };

  global.fetch = jest.fn().mockRejectedValue(new Error("offline"));

  await ensureModelViewerLoaded();

  expect(global.fetch).toHaveBeenCalled();
  expect(loaded.some((s) => s.includes("model-viewer.min.js"))).toBe(true);
  expect(global.window.customElements.get("model-viewer")).toBeDefined();
});

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { JSDOM } = require("jsdom");

function loadModule(file, context) {
  const code = fs.readFileSync(file, "utf8").replace(/export\s+/g, "");
  const timers = { setTimeout, clearTimeout };
  vm.createContext(Object.assign(context, timers));
  vm.runInContext(code, context);
  return context;
}

describe("index.html structure", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "../..", "index.html"),
    "utf8",
  );
  const dom = new JSDOM(html);
  const document = dom.window.document;

  test("contains model-viewer element", () => {
    expect(document.querySelector("model-viewer")).not.toBeNull();
  });

  test("model-viewer has data-testid", () => {
    const el = document.querySelector("model-viewer");
    expect(el.getAttribute("data-testid")).toBe("model-viewer");
  });

  test("includes modelLoader script", () => {
    const script = Array.from(document.querySelectorAll("script")).find((s) =>
      s.src.includes("modelLoader.js"),
    );
    expect(script).toBeTruthy();
  });

  test("includes modelViewerFallback script", () => {
    const script = Array.from(document.querySelectorAll("script")).find((s) =>
      s.src.includes("modelViewerFallback.js"),
    );
    expect(script).toBeTruthy();
  });

  test("preconnect to modelviewer.dev", () => {
    const link = Array.from(document.querySelectorAll("link")).find((l) =>
      l.href.includes("modelviewer.dev"),
    );
    expect(link).toBeTruthy();
  });

  test("preload neutral.hdr", () => {
    const link = Array.from(document.querySelectorAll("link")).find((l) =>
      l.href.includes("neutral.hdr"),
    );
    expect(link).toBeTruthy();
  });

  test("preload default model", () => {
    const link = Array.from(document.querySelectorAll("link")).find((l) =>
      l.getAttribute("data-model-href"),
    );
    expect(link).toBeTruthy();
  });

  test("preconnect cdn.jsdelivr.net", () => {
    const link = Array.from(document.querySelectorAll("link")).find((l) =>
      l.href.includes("cdn.jsdelivr.net"),
    );
    expect(link).toBeTruthy();
  });

  test("preconnect cdn.tailwindcss.com", () => {
    const link = Array.from(document.querySelectorAll("link")).find((l) =>
      l.href.includes("cdn.tailwindcss.com"),
    );
    expect(link).toBeTruthy();
  });

  test("preconnect cdnjs.cloudflare.com", () => {
    const link = Array.from(document.querySelectorAll("link")).find((l) =>
      l.href.includes("cdnjs.cloudflare.com"),
    );
    expect(link).toBeTruthy();
  });
});

describe("payment.html structure", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "../..", "payment.html"),
    "utf8",
  );
  const dom = new JSDOM(html);
  const document = dom.window.document;

  test("contains model-viewer element", () => {
    expect(document.querySelector("model-viewer")).not.toBeNull();
  });

  test("model-viewer has data-testid", () => {
    const el = document.querySelector("model-viewer");
    expect(el.getAttribute("data-testid")).toBe("model-viewer");
  });

  test("includes modelLoader script", () => {
    const script = Array.from(document.querySelectorAll("script")).find((s) =>
      s.src.includes("modelLoader.js"),
    );
    expect(script).toBeTruthy();
  });

  test("includes modelViewerFallback script", () => {
    const script = Array.from(document.querySelectorAll("script")).find((s) =>
      s.src.includes("modelViewerFallback.js"),
    );
    expect(script).toBeTruthy();
  });

  test("preconnect to modelviewer.dev", () => {
    const link = Array.from(document.querySelectorAll("link")).find((l) =>
      l.href.includes("modelviewer.dev"),
    );
    expect(link).toBeTruthy();
  });

  test("preload neutral.hdr", () => {
    const link = Array.from(document.querySelectorAll("link")).find((l) =>
      l.href.includes("neutral.hdr"),
    );
    expect(link).toBeTruthy();
  });

  test("preload default model", () => {
    const link = Array.from(document.querySelectorAll("link")).find((l) =>
      l.getAttribute("data-model-href"),
    );
    expect(link).toBeTruthy();
  });

  test("preconnect cdn.jsdelivr.net", () => {
    const link = Array.from(document.querySelectorAll("link")).find((l) =>
      l.href.includes("cdn.jsdelivr.net"),
    );
    expect(link).toBeTruthy();
  });

  test("preconnect cdn.tailwindcss.com", () => {
    const link = Array.from(document.querySelectorAll("link")).find((l) =>
      l.href.includes("cdn.tailwindcss.com"),
    );
    expect(link).toBeTruthy();
  });

  test("preconnect cdnjs.cloudflare.com", () => {
    const link = Array.from(document.querySelectorAll("link")).find((l) =>
      l.href.includes("cdnjs.cloudflare.com"),
    );
    expect(link).toBeTruthy();
  });
});

describe("modelLoader.js behaviour", () => {
  function setup() {
    const dom = new JSDOM(
      '<model-viewer data-testid="model-viewer"></model-viewer>',
    );
    const document = dom.window.document;
    const context = { document };
    loadModule(path.join(__dirname, "../..", "js", "modelLoader.js"), context);
    return {
      document,
      setModelSrc: context.setModelSrc,
      DEFAULT_SRC: context.DEFAULT_SRC,
    };
  }

  test("DEFAULT_SRC is defined", () => {
    const { DEFAULT_SRC } = setup();
    expect(DEFAULT_SRC).toMatch(/Astronaut\.glb$/);
  });

  test("sets default src when no argument", () => {
    const { document, setModelSrc, DEFAULT_SRC } = setup();
    const viewer = document.querySelector("model-viewer");
    setModelSrc();
    expect(viewer.getAttribute("src")).toBe(DEFAULT_SRC);
  });

  test("does nothing when viewer missing", () => {
    const dom = new JSDOM("<div></div>");
    const document = dom.window.document;
    const context = { document };
    loadModule(path.join(__dirname, "../..", "js", "modelLoader.js"), context);
    expect(() => context.setModelSrc()).not.toThrow();
    expect(document.querySelector("model-viewer")).toBeNull();
  });

  const urls = [
    "https://example.com/a.glb",
    "https://example.com/b.glb",
    "https://example.com/c.glb",
    "https://example.com/d.glb",
    "https://example.com/e.glb",
  ];

  test.each(urls)("sets custom url %s", (u) => {
    const { document, setModelSrc } = setup();
    const viewer = document.querySelector("model-viewer");
    setModelSrc(u);
    expect(viewer.getAttribute("src")).toBe(u);
  });

  const fallbacks = [undefined, null, "", false, 0];
  test.each(fallbacks)("falls back to default for %p", (val) => {
    const { document, setModelSrc, DEFAULT_SRC } = setup();
    const viewer = document.querySelector("model-viewer");
    setModelSrc(val);
    expect(viewer.getAttribute("src")).toBe(DEFAULT_SRC);
  });

  test("overrides existing src", () => {
    const { document, setModelSrc } = setup();
    const viewer = document.querySelector("model-viewer");
    viewer.setAttribute("src", "old.glb");
    setModelSrc("new.glb");
    expect(viewer.getAttribute("src")).toBe("new.glb");
  });

  test("DOMContentLoaded triggers default src", () => {
    const dom = new JSDOM(
      '<model-viewer data-testid="model-viewer"></model-viewer>',
      { runScripts: "outside-only" },
    );
    const document = dom.window.document;
    const window = dom.window;
    const context = { document, window };
    loadModule(path.join(__dirname, "../..", "js", "modelLoader.js"), context);
    window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
    const viewer = document.querySelector("model-viewer");
    expect(viewer.getAttribute("src")).toBe(context.DEFAULT_SRC);
  });
});

describe("modelViewerFallback.js behaviour", () => {
  const file = path.join(__dirname, "../..", "js", "modelViewerFallback.js");

  test("MODEL_SRC constant is astronaut glb", () => {
    const context = { document: {}, window: { customElements: {} } };
    loadModule(file, context);
    expect(context.MODEL_SRC).toMatch(/Astronaut\.glb$/);
  });

  test("ENV_SRC constant is neutral hdr", () => {
    const context = { document: {}, window: { customElements: {} } };
    loadModule(file, context);
    expect(context.ENV_SRC).toMatch(/neutral\.hdr$/);
  });

  test("ensureModelViewerLoaded resolves when custom element exists", async () => {
    const window = { customElements: { get: () => true } };
    const context = { document: {}, window };
    loadModule(file, context);
    await expect(context.ensureModelViewerLoaded()).resolves.toBeUndefined();
  });

  test("ensureModelViewerLoaded loads cdn script then resolves", async () => {
    const scripts = [];
    const document = {
      createElement: () => ({
        set src(v) {
          this._src = v;
        },
        set onload(fn) {
          this._onload = fn;
        },
        set onerror(fn) {
          this._onerror = fn;
        },
      }),
      head: { appendChild: (s) => scripts.push(s) },
    };
    const window = { customElements: { get: () => undefined } };
    const context = { document, window };
    loadModule(file, context);
    const promise = context.ensureModelViewerLoaded();
    scripts[0]._onload();
    await expect(promise).resolves.toBeUndefined();
    expect(scripts[0]._src).toMatch(/model-viewer.min.js/);
  });

  test("ensureModelViewerLoaded falls back to local script", async () => {
    const scripts = [];
    const document = {
      createElement: () => ({
        set src(v) {
          this._src = v;
        },
        set onload(fn) {
          this._onload = fn;
        },
        set onerror(fn) {
          this._onerror = fn;
        },
      }),
      head: { appendChild: (s) => scripts.push(s) },
    };
    const window = { customElements: { get: () => undefined } };
    const context = { document, window };
    loadModule(file, context);
    const promise = context.ensureModelViewerLoaded();
    scripts[0]._onerror();
    scripts[1]._onload();
    await expect(promise).resolves.toBeUndefined();
    expect(scripts[1]._src).toBe("js/model-viewer.min.js");
  });

  test.each([1, 2, 3, 4, 5])(
    "DOMContentLoaded sets src for %i element(s)",
    (count) => {
      const dom = new JSDOM(
        "<div></div>"
          .repeat(count)
          .replace(/<div><\/div>/g, "<model-viewer></model-viewer>"),
      );
      const document = dom.window.document;
      const window = dom.window;
      const originalDescriptor = Object.getOwnPropertyDescriptor(
        window,
        "customElements",
      );
      Object.defineProperty(window, "customElements", {
        value: { get: () => true },
        configurable: true,
      });
      try {
        loadModule(file, { document, window });
        window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
        const viewers = document.querySelectorAll("model-viewer");
        viewers.forEach((v) =>
          expect(v.getAttribute("src")).toMatch(/Astronaut\.glb$/),
        );
      } finally {
        if (originalDescriptor) {
          Object.defineProperty(window, "customElements", originalDescriptor);
        } else {
          delete window.customElements;
        }
      }
    },
  );

  test.each([1, 2, 3, 4, 5])(
    "environment-image set when missing (%i element(s))",
    (count) => {
      const dom = new JSDOM(
        "<div></div>"
          .repeat(count)
          .replace(/<div><\/div>/g, "<model-viewer></model-viewer>"),
      );
      const document = dom.window.document;
      const window = dom.window;
      const originalDescriptor = Object.getOwnPropertyDescriptor(
        window,
        "customElements",
      );
      Object.defineProperty(window, "customElements", {
        value: { get: () => true },
        configurable: true,
      });
      try {
        loadModule(file, { document, window });
        window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
        const viewers = document.querySelectorAll("model-viewer");
        viewers.forEach((v) =>
          expect(v.getAttribute("environment-image")).toMatch(/neutral\.hdr$/),
        );
      } finally {
        if (originalDescriptor) {
          Object.defineProperty(window, "customElements", originalDescriptor);
        } else {
          delete window.customElements;
        }
      }
    },
  );
});

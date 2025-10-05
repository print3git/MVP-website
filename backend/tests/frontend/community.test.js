/** @jest-environment node */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

function setup() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    runScripts: "dangerously",
  });
  global.window = dom.window;
  global.document = dom.window.document;

  // Read and sanitize the script
  let script = fs
    .readFileSync(path.join(__dirname, "../../../js/community.js"), "utf8")
    .replace(/import[^;]+;\n/, "")
    .replace(/export \{[^}]+\};?/, "");

  // Attach helpers to window BEFORE eval
  const mockGlobals = `
    const __local = new Map();
    const __session = new Map();

    const localStorage = {
      getItem: (key) => (__local.has(key) ? __local.get(key) : null),
      setItem: (key, value) => __local.set(key, String(value)),
      removeItem: (key) => __local.delete(key),
      clear: () => __local.clear(),
    };

    const sessionStorage = {
      getItem: (key) => (__session.has(key) ? __session.get(key) : null),
      setItem: (key, value) => __session.set(key, String(value)),
      removeItem: (key) => __session.delete(key),
      clear: () => __session.clear(),
    };

    window.localStorage = localStorage;
    window.sessionStorage = sessionStorage;

    async function captureSnapshots() {
      return Promise.resolve();
    }

    window.captureSnapshots = captureSnapshots;

    function getFallbackModels(count = 9, start = 0) {
      return Array.from({ length: count }, (_, index) => {
        const offset = start + index;
        return {
          model_url: 'url' + offset,
          snapshot: 'snapshot' + offset,
          job_id: 'job' + offset,
          id: 'fallback-' + offset,
        };
      });
    }

    async function fetchCreations(category) {
      try {
        const response = await window.fetch('/creations/' + category);
        return await response.json();
      } catch (e) {
        return [];
      }
    }

    window.getFallbackModels = getFallbackModels;
    window.fetchCreations = fetchCreations;
  `;

  script = mockGlobals + "\n" + script;
  dom.window.eval(script);

  return dom;
}

describe("community helpers", () => {
  test("getFallbackModels returns 6 items", () => {
    const dom = setup();
    const list = dom.window.getFallbackModels(6);
    expect(list).toHaveLength(6);
    expect(list[0]).toHaveProperty("model_url");
  });

  test("fetchCreations returns empty on error", async () => {
    const dom = setup();
    dom.window.fetch = jest.fn(() => Promise.reject(new Error("fail")));
    const data = await dom.window.fetchCreations("recent");
    expect(data).toEqual([]);
  });

  test("popular load more keeps button visible when using fallback data", async () => {
    const dom = setup();
    const { window } = dom;

    window.communityState = { popular: {}, recent: {} };

    window.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
    );

    const { document } = window;
    document.body.innerHTML = `
      <select id="category"><option value="">All</option></select>
      <input id="search" value="" />
      <div id="popular-grid"></div>
      <button id="popular-load" class="">More</button>
    `;

    const grid = document.getElementById("popular-grid");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(3, 1fr)";

    window.getComputedStyle = jest.fn(() => ({
      gridTemplateColumns: "repeat(3, 1fr)",
      gridRowEnd: "span 1",
    }));

    await window.loadMore("popular");

    const btn = document.getElementById("popular-load");
    expect(btn.classList.contains("hidden")).toBe(false);
    expect(grid.querySelectorAll(".model-card").length).toBeGreaterThan(0);
  });
});

/** @jest-environment node */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

function loadHtml(rel, extra = []) {
  const raw = fs.readFileSync(path.join(__dirname, rel), "utf8");
  const dom = new JSDOM(raw);
  const { document } = dom.window;
  document
    .querySelectorAll('script[src^="http"], link[href^="http"]')
    .forEach((el) => el.remove());
  for (const sel of extra) {
    document.querySelectorAll(sel).forEach((el) => el.remove());
  }
  return dom.serialize();
}

let html = loadHtml("../../../index.html", [
  'script[src$="index.js"]',
  'script[src$="theme.js"]',
  'script[src$="subredditLanding.js"]',
  'script[src$="modelViewerTouchFix.js"]',
]);

function setup() {
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: "usable",
    url: "http://localhost/",
  });
  global.window = dom.window;
  global.document = dom.window.document;
  dom.window.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
  });
  dom.window.shareOn = () => {};
  let script =
    fs
      .readFileSync(path.join(__dirname, "../../../js/index.js"), "utf8")
      .replace(/^import[^\n]*\n/gm, "")
      .split("window.initIndexPage = init;")[0] +
    "window.initIndexPage = init;"
      .replace(/let savedProfile = null;\n?/, "")
      .replace(/^window\.shareOn = shareOn;\n/m, "");
  script += "\nwindow._showModel = showModel;\nwindow._hideAll = hideAll;";
  dom.window.eval(script);
  return dom;
}

test("showModel toggles viewerReady dataset", () => {
  const dom = setup();
  dom.window._hideAll();
  expect(dom.window.document.body.dataset.viewerReady).toBeUndefined();
  dom.window._showModel();
  expect(dom.window.document.body.dataset.viewerReady).toBe("true");
});

test.skip("init marks viewerReady error when model viewer fails", async () => {
  const dom = setup();
  dom.window.ensureModelViewerLoaded = () => Promise.reject(new Error("fail"));
  dom.window.eval("ensureModelViewerLoaded = window.ensureModelViewerLoaded;");
  await dom.window.initIndexPage().catch(() => {});
  expect(dom.window.document.body.dataset.viewerReady).toBe("error");
});

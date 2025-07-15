/** @jest-environment node */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

let html = fs.readFileSync(path.join(__dirname, "../../../index.html"), "utf8");
html = html
  .replace(/<script[^>]+src="https?:\/\/[^>]+><\/script>/g, "")
  .replace(/<link[^>]+href="https?:\/\/[^>]+>/g, "")
  .replace(
    /<script[^>]+src="js\/(?:index|theme|subredditLanding|modelViewerTouchFix)\.js"[^>]*><\/script>/g,
    "",
  );

function setup() {
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: "usable",
    url: "http://localhost/",
  });
  global.window = dom.window;
  global.document = dom.window.document;
  let script = fs
    .readFileSync(path.join(__dirname, "../../../js/index.js"), "utf8")
    .replace(/import[^;]+;\n/g, "")
    .replace(/window\.addEventListener\(['"]DOMContentLoaded['"][\s\S]+$/, "")
    .replace(/let savedProfile = null;\n?/, "");
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

test("init marks viewerReady error when model viewer fails", async () => {
  const dom = setup();
  dom.window.ensureModelViewerLoaded = () => Promise.reject(new Error("fail"));
  await dom.window.initIndexPage().catch(() => {});
  expect(dom.window.document.body.dataset.viewerReady).toBe("error");
});

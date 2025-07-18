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

function loadDom() {
  const html = loadHtml("../../../payment.html", [
    'script[src$="modelViewerTouchFix.js"]',
  ]);
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: "usable",
    url: "https://localhost/payment.html",
  });
  global.window = dom.window;
  global.document = dom.window.document;
  const script = fs
    .readFileSync(path.join(__dirname, "../../../js/payment.js"), "utf8")
    .replace(/^import[^\n]*\n/gm, "");
  dom.window.eval(script);
  return dom;
}

test("single item defaults quantity to 2", async () => {
  const dom = loadDom();
  dom.window.localStorage.setItem(
    "print3Basket",
    JSON.stringify([{ modelUrl: "m", jobId: "j" }]),
  );
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  await new Promise((r) => setTimeout(r, 0));
  expect(dom.window.document.getElementById("print-qty").value).toBe("2");
});

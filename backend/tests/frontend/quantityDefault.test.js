/** @jest-environment node */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const loadScript = require("../utils/loadScript.js");

function loadDom() {
  const html = fs
    .readFileSync(path.join(__dirname, "../../../payment.html"), "utf8")
    .replace(/<script[^>]+src="https?:\/\/[^>]+><\/script>/g, "")
    .replace(/<link[^>]+href="https?:\/\/[^>]+>/g, "")
    .replace(
      /<script[^>]+src="js\/modelViewerTouchFix.js"[^>]*><\/script>/,
      "",
    );
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: "usable",
    url: "http://localhost/payment.html",
  });
  global.window = dom.window;
  global.document = dom.window.document;
  const script = loadScript("js/payment.js");
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

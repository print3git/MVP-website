/** @jest-environment node */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

function load() {
  const html = fs
    .readFileSync(path.join(__dirname, "../../../payment.html"), "utf8")
    .replace(/<script[^>]+src="https?:\/\/[^>]+><\/script>/g, "")
    .replace(/<link[^>]+href="https?:\/\/[^>]+>/g, "")
    .replace(/<script[^>]+src="js\/payment.js"[^>]*><\/script>/, "");
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: "usable",
    url: "http://localhost/",
  });
  global.window = dom.window;
  global.document = dom.window.document;
  let script = fs
    .readFileSync(path.join(__dirname, "../../../js/payment.js"), "utf8")
    .replace(/import[^;]+;\n/, "");
  script += "\nwindow._computeBulkDiscount = computeBulkDiscount;";
  dom.window.eval(script);
  return dom;
}

test("bulk discount for 2 prints", () => {
  const dom = load();
  const items = [{ qty: 2, material: "single" }];
  expect(dom.window._computeBulkDiscount(items)).toBe(700);
});

test("bulk discount for 3 prints", () => {
  const dom = load();
  const items = [{ qty: 3, material: "single" }];
  expect(dom.window._computeBulkDiscount(items)).toBe(2200);
});

test("bulk discount capped after 3 prints", () => {
  const dom = load();
  const items = [{ qty: 5, material: "single" }];
  expect(dom.window._computeBulkDiscount(items)).toBe(2200);
});

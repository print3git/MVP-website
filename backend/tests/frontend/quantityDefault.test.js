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
  const html = loadHtml("../../../payment.html", []);
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: "usable",
    url: "http://localhost/payment.html",
  });
  global.window = dom.window;
  global.document = dom.window.document;
  const script = fs
    .readFileSync(path.join(__dirname, "../../../js/payment.js"), "utf8")
    .replace(/^import[^\n]*\n/gm, "");
  dom.window.eval(script);
  return dom;
}

test("single item quantity and pricing reflect input", async () => {
  const dom = loadDom();
  dom.window.localStorage.setItem(
    "print2Basket",
    JSON.stringify([{ modelUrl: "m", jobId: "j" }]),
  );
  dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  await new Promise((r) => setTimeout(r, 0));
  const qtyEl = dom.window.document.getElementById("print-qty");
  expect(qtyEl.value).toBe("2");
  qtyEl.value = "3";
  qtyEl.dispatchEvent(new dom.window.Event("change"));
  await new Promise((r) => setTimeout(r, 0));
  const payBtn = dom.window.document.getElementById("submit-payment");
  expect(payBtn.textContent).toBe("Pay £67.97 (3 prints)");
  const breakdown = dom.window.document.getElementById("price-breakdown");
  expect(breakdown.textContent).toContain("3 single-colour");
  expect(breakdown.textContent).toContain("£22.00");
  expect(breakdown.textContent).toContain("£67.97");
});

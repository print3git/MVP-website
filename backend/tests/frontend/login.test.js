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

let html = loadHtml("../../../login.html", [
  'script[src*="tailwind"]',
  'link[href*="font-awesome"]',
]);

describe("login form", () => {
  test("shows error on failed login", async () => {
    const dom = new JSDOM(html, {
      runScripts: "dangerously",
      resources: "usable",
      url: "http://localhost/login.html",
    });
    dom.window.document
      .querySelectorAll('script[src*="tailwind"]')
      .forEach((s) => s.remove());
    global.window = dom.window;
    global.document = dom.window.document;
    const scriptSrc = fs.readFileSync(
      path.join(__dirname, "../../../js/login.js"),
      "utf8",
    );
    dom.window.eval(scriptSrc);
    // DOMContentLoaded has already fired in JSDOM when using runScripts,
    // so no need to wait for it here.
    const fetchMock = jest.fn(() =>
      Promise.resolve({ json: () => ({ error: "fail" }) }),
    );
    dom.window.fetch = fetchMock;
    global.fetch = fetchMock;
    dom.window.document.getElementById("li-name").value = "u";
    dom.window.document.getElementById("li-pass").value = "p";
    dom.window.document
      .getElementById("loginForm")
      .dispatchEvent(new dom.window.Event("submit"));
    await new Promise((r) => setTimeout(r, 0));
    expect(dom.window.document.getElementById("error").textContent).toBe(
      "fail",
    );
  });
});

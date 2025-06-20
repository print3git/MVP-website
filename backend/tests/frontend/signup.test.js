/** @jest-environment node */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

let html = fs.readFileSync(
  path.join(__dirname, "../../../signup.html"),
  "utf8",
);
html = html
  .replace(/<script[^>]+tailwind[^>]*><\/script>/, "")
  .replace(/<link[^>]+font-awesome[^>]+>/, "");

describe("signup form", () => {
  test("shows error on failed signup", async () => {
    const dom = new JSDOM(html, {
      runScripts: "dangerously",
      resources: "usable",
      url: "http://localhost/signup.html",
    });
    dom.window.document
      .querySelectorAll('script[src*="tailwind"]')
      .forEach((s) => s.remove());
    global.window = dom.window;
    global.document = dom.window.document;
    const scriptSrc = fs.readFileSync(
      path.join(__dirname, "../../../js/signup.js"),
      "utf8",
    );
    dom.window.eval(scriptSrc);
    const fetchMock = jest.fn(() =>
      Promise.resolve({ json: () => ({ error: "fail" }) }),
    );
    dom.window.fetch = fetchMock;
    global.fetch = fetchMock;
    dom.window.document.getElementById("su-name").value = "u";
    dom.window.document.getElementById("su-email").value = "e";
    dom.window.document.getElementById("su-pass").value = "p";
    dom.window.document
      .getElementById("signupForm")
      .dispatchEvent(new dom.window.Event("submit"));
    await new Promise((r) => setTimeout(r, 0));
    expect(dom.window.document.getElementById("error").textContent).toBe(
      "Invalid email format",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

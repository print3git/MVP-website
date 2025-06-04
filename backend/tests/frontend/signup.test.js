const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

let html = fs.readFileSync(
  path.join(__dirname, "../../../signup.html"),
  "utf8",
);
html = html.replace(/<script[^>]+tailwind[^>]*><\/script>/, "");

describe("signup form", () => {
  test.skip("shows error on failed signup", async () => {
    const dom = new JSDOM(html, {
      runScripts: "dangerously",
      resources: "usable",
    });
    dom.window.document
      .querySelectorAll("script[src]")
      .forEach((s) => s.remove());
    await new Promise((r) =>
      dom.window.document.addEventListener("DOMContentLoaded", r),
    );
    const fetchMock = jest.fn(() =>
      Promise.resolve({ json: () => ({ error: "fail" }) }),
    );
    dom.window.fetch = fetchMock;
    dom.window.document.getElementById("su-name").value = "u";
    dom.window.document.getElementById("su-email").value = "e";
    dom.window.document.getElementById("su-pass").value = "p";
    dom.window.document
      .getElementById("signupForm")
      .dispatchEvent(new dom.window.Event("submit"));
    await Promise.resolve();
    expect(dom.window.document.getElementById("error").textContent).toBe(
      "fail",
    );
  });
});

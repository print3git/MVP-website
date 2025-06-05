const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

function loadPage(protocol = "http:") {
  const html = `<!doctype html><body>
    <div id="loader" hidden></div>
    <model-viewer id="viewer"></model-viewer>
  </body>`;
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: "usable",
    url: `${protocol}//localhost`,
  });

  dom.window.customElements = {
    whenDefined: () => Promise.resolve(),
  };

  const scriptContent = fs.readFileSync(
    path.join(__dirname, "../js/payment.js"),
    "utf8",
  );
  dom.window.eval(scriptContent);
  return new Promise((resolve) => {
    dom.window.document.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => resolve(dom), 0);
    });
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
  });
}

test("shows warning on file protocol", async () => {
  const dom = await loadPage("file:");
  const first = dom.window.document.body.firstElementChild;
  expect(first.textContent).toMatch(/npm run serve/);
});

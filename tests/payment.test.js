const fs = require("fs");
const path = require("path");
const vm = require("vm");

function runScript(protocol) {
  const body = { prepend: jest.fn() };
  const document = {
    body,
    createElement: () => ({ className: "", textContent: "" }),
    getElementById: () => ({ addEventListener: jest.fn() }),
    addEventListener: (_, cb) => cb(),
  };
  const window = {
    location: { protocol },
    customElements: { whenDefined: () => Promise.resolve() },
    document,
  };
  const sandbox = {
    window,
    document,
    location: window.location,
    localStorage: { getItem: () => null },
    console,
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "../js/payment.js"), "utf8"),
    sandbox,
  );
  return body.prepend.mock.calls[0][0].textContent;
}

test("shows warning on file protocol", () => {
  const text = runScript("file:");
  expect(text).toMatch(/npm run serve/);
});

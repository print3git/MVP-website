/** @jest-environment node */
jest.useFakeTimers();

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

function setupDom() {
  const html = loadHtml("../../../payment.html", [
    'script[src$="modelViewerTouchFix.js"]',
  ]);
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: "usable",
    url: "http://localhost/",
  });
  global.window = dom.window;
  global.document = dom.window.document;
  dom.window.setTimeout = setTimeout;
  dom.window.clearTimeout = clearTimeout;
  dom.window.setInterval = setInterval;
  dom.window.clearInterval = clearInterval;
  dom.window.Date = Date;
  let script = fs
    .readFileSync(path.join(__dirname, "../../../js/payment.js"), "utf8")
    .replace(/import \{[^}]+\} from ['"]\.\/analytics.js['"];?/, "")
    .replace(
      /if \(document\.readyState === "loading"\)[^}]+}\s*else \{[^}]+}\s*/,
      "",
    );
  dom.window.eval(script);
  return dom;
}

describe("flash banner", () => {
  test("hides after countdown ends", async () => {
    const dom = setupDom();
    dom.window.sessionStorage.setItem("flashDiscountShow", "1");
    dom.window.localStorage.setItem(
      "flashDiscountEnd",
      String(Date.now() + 1000),
    );
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
    dom.window.startFlashDiscount();
    await jest.runOnlyPendingTimersAsync();
    const banner = dom.window.document.getElementById("flash-banner");
    expect(banner.hidden).toBe(true);
    expect(dom.window.localStorage.getItem("flashDiscountEnd")).toBe("0");
  });

  test("does not restart after expiration", () => {
    const dom = setupDom();
    dom.window.sessionStorage.setItem("flashDiscountShow", "1");
    dom.window.localStorage.setItem("flashDiscountEnd", "0");
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
    dom.window.startFlashDiscount();
    const banner = dom.window.document.getElementById("flash-banner");
    expect(banner.hidden).toBe(true);
    expect(dom.window.localStorage.getItem("flashDiscountEnd")).toBe("0");
  });

  test("countdown shows 4:59 after one second", async () => {
    const dom = setupDom();
    dom.window.sessionStorage.setItem("flashDiscountShow", "1");
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
    dom.window.startFlashDiscount();
    const timerEl = dom.window.document.getElementById("flash-timer");
    expect(timerEl.textContent).toBe("5:00");
    await jest.advanceTimersByTimeAsync(1100);
    expect(timerEl.textContent).toBe("4:59");
  });

  test("banner hidden when chance disabled", () => {
    const dom = setupDom();
    dom.window.sessionStorage.setItem("flashDiscountShow", "0");
    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
    dom.window.startFlashDiscount();
    const banner = dom.window.document.getElementById("flash-banner");
    expect(banner.hidden).toBe(true);
    expect(dom.window.localStorage.getItem("flashDiscountEnd")).toBe(null);
  });
});

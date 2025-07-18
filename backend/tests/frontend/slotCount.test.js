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

let html = loadHtml("../../../payment.html", ['script[src^="js/"]']);

function cycleKey() {
  const tz = "America/New_York";
  const now = new Date();
  const df = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const tf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    hour12: false,
  });
  const date = df.format(now);
  const hour = parseInt(tf.format(now), 10);
  if (hour < 1) {
    const prev = new Date(now.getTime() - 86400000);
    return df.format(prev);
  }
  return date;
}

describe("slot count", () => {
  test("adjusts after purchase", async () => {
    const dom = new JSDOM(html, {
      runScripts: "dangerously",
      resources: "usable",
      url: "https://localhost/payment.html?session_id=1",
    });
    global.window = dom.window;
    global.document = dom.window.document;
    dom.window.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => ({ slots: 5 }) }),
    );
    const scriptSrc = fs
      .readFileSync(path.join(__dirname, "../../../js/payment.js"), "utf8")
      .replace(/^import[^\n]*\n/gm, "");
    dom.window.eval(scriptSrc);
    await new Promise((r) => setTimeout(r, 50));
    expect(dom.window.document.getElementById("slot-count").textContent).toBe(
      "4",
    );
    expect(
      dom.window.document.getElementById("bulk-slot-count").textContent,
    ).toBe("4");
    expect(dom.window.localStorage.getItem("slotPurchases")).toBe("1");
  });

  test("uses stored purchase count", async () => {
    const dom = new JSDOM(html, {
      runScripts: "dangerously",
      resources: "usable",
      url: "https://localhost/payment.html",
    });
    global.window = dom.window;
    global.document = dom.window.document;
    dom.window.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => ({ slots: 6 }) }),
    );
    const scriptSrc = fs
      .readFileSync(path.join(__dirname, "../../../js/payment.js"), "utf8")
      .replace(/^import[^\n]*\n/gm, "");
    dom.window.eval(scriptSrc);
    dom.window.localStorage.setItem("slotCycle", cycleKey());
    dom.window.localStorage.setItem("slotPurchases", "2");
    await new Promise((r) => setTimeout(r, 50));
    expect(dom.window.document.getElementById("slot-count").textContent).toBe(
      "4",
    );
    expect(
      dom.window.document.getElementById("bulk-slot-count").textContent,
    ).toBe("4");
  });
});

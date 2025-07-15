/** @jest-environment node */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

describe("shareOn", () => {
  function load() {
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {
      runScripts: "dangerously",
      url: "https://example.com/",
    });
    global.window = dom.window;
    global.document = dom.window.document;
    dom.window.navigator.share = undefined;
    const src = fs
      .readFileSync(path.join(__dirname, "../../../js/share.js"), "utf8")
      .replace(/^import[^\n]*\n/gm, "")
      .replace(/export \{[^}]+\};?/, "");
    dom.window.eval(src);
    return dom.window.shareOn;
  }

  const cases = [
    ["facebook", "facebook.com"],
    ["twitter", "twitter.com"],
    ["reddit", "reddit.com"],
    ["linkedin", "linkedin.com"],
    ["tiktok", "tiktok.com"],
    ["instagram", "instagram.com"],
  ];

  test.each(cases)("opens %s share URL", async (net, domain) => {
    const shareOn = load();
    global.window.open = jest.fn();
    await shareOn(net);
    expect(global.window.open).toHaveBeenCalledTimes(1);
    const [url, target, features] = global.window.open.mock.calls[0];
    expect(url).toContain(domain);
    expect(target).toBe("_blank");
    expect(features).toBe("noopener");
  });
});

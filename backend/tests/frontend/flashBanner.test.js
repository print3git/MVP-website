/** @jest-environment node */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

let html = fs.readFileSync(

  
path.join(\_\_dirname, "../../../payment.html"),
"utf8",
);
html = html
.replace(/<script[^>]+tailwind[^>]*><\/script>/, "")
.replace(/<link[^>]*font-awesome[^>]_>/, "")
.replace(/<script[^>]+model-viewer[^>]_><\/script>/g, "")
.replace(/<script[^>]+stripe[^>]\*><\/script>/, "");

describe("flash discount", () => {
beforeEach(() => {
jest.useFakeTimers();
});

test.skip("banner hides when timer expires", () => {
const dom = new JSDOM(html, {
runScripts: "dangerously",
resources: "usable",
url: "http://localhost/payment.html",
});
dom.window.document
.querySelectorAll('script[src*="tailwind"]')
.forEach((s) => s.remove());
global.window = dom.window;
global.document = dom.window.document;
const scriptSrc = fs.readFileSync(
path.join(\_\_dirname, "../../../js/payment.js"),
"utf8",
);
dom.window.eval(scriptSrc);
dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));
(dom.window.resetFlashDiscount || dom.window.startFlashDiscount)();
jest.advanceTimersByTime(5 _ 60 _ 1000 + 1000);
expect(dom.window.document.getElementById("flash-banner").hidden).toBe(
true,
);
});
});

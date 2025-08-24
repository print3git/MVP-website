const { JSDOM } = require("jsdom");
const {
  escapeHtml,
  setSafeInnerHTML,
} = require("../../../js/dom-utils-securityfix-79d3fa.ts");

beforeEach(() => {
  const { window } = new JSDOM("<body></body>");
  global.document = window.document;
});

describe("escapeHtml", () => {
  const cases = [
    ["&", "&amp;"],
    ["<", "&lt;"],
    [">", "&gt;"],
    ['"', "&quot;"],
    ["'", "&#39;"],
    ["plain", "plain"],
    ["a<b>&c", "a&lt;b&gt;&amp;c"],
  ];
  test.each(cases)("escapes %s", (input, expected) => {
    expect(escapeHtml(input)).toBe(expected);
  });
});

describe("setSafeInnerHTML", () => {
  test("sets sanitized HTML content", () => {
    const el = global.document.createElement("div");
    setSafeInnerHTML(el, ["<span>", "</span>"], "test & <b>bold</b>");
    expect(el.innerHTML).toBe(
      "<span>test &amp; &lt;b&gt;bold&lt;/b&gt;</span>",
    );
  });
});

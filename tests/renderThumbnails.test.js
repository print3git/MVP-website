const { JSDOM } = require("jsdom");

describe("renderThumbnails", () => {
  let renderThumbnails;
  let document;

  beforeEach(() => {
    jest.resetModules();
    const dom = new JSDOM(
      '<div id="image-preview-area"></div><textarea id="promptInput"></textarea>',
      { url: "https://example.com" },
    );
    const { document: doc } = dom.window;
    const realGet = doc.getElementById.bind(doc);
    doc.getElementById = (id) =>
      realGet(id) || {
        addEventListener: () => {},
        click: () => {},
        getBoundingClientRect: () => ({ height: 0 }),
        classList: { add: () => {}, remove: () => {}, toggle: () => {} },
        style: {},
      };
    Object.defineProperty(doc, "readyState", {
      value: "loading",
      configurable: true,
    });
    dom.window.addEventListener = () => {};
    global.window = dom.window;
    global.document = doc;
    global.localStorage = dom.window.localStorage;
    global.navigator = dom.window.navigator;
    global.fetch = () => Promise.resolve({});
    ({ renderThumbnails } = require("../js/index.js"));
    document = doc;
  });

  test.each(["data:", "vbscript:"])("rejects %s protocol", (proto) => {
    renderThumbnails([`${proto}alert(1)`]);
    const img = document.querySelector("img");
    expect(img.getAttribute("src")).toBe("");
  });
});

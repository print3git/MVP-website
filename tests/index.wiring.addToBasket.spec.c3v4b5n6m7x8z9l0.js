import { buildDOM } from "./helpers/dom.js";
import { memoryStorage } from "./helpers/storage.js";

describe("index add-to-basket wiring", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("click adds item and persists across reload", async () => {
    const html = `
      <model-viewer id="viewer" src="https://example.com/m.glb"></model-viewer>
      <img id="preview-img" src="https://example.com/i.png" />
      <button id="add-basket-button"></button>
      <button id="basket-button"><span id="basket-count"></span></button>
    `;
    const storage = memoryStorage();
    const fetchFn = () =>
      Promise.resolve({ ok: false, json: async () => ({}) });

    const dom = buildDOM(html);
    global.window = dom.window;
    global.document = dom.window.document;
    const basket = (await import("../js/basket.js")).createBasket(storage);
    global.addToBasket = basket.addToBasket;
    global.getBasket = basket.getBasket;
    const { initBasketUI } = await import("../js/index.js");
    await initBasketUI({ doc: dom.window.document, storage, fetchFn });
    dom.window.document.getElementById("add-basket-button").click();
    expect(JSON.parse(storage.getItem("print2Basket")).length).toBe(1);
    expect(dom.window.document.getElementById("basket-count").textContent).toBe(
      "1",
    );

    const dom2 = buildDOM(html);
    global.window = dom2.window;
    global.document = dom2.window.document;
    const basket2 = (await import("../js/basket.js")).createBasket(storage);
    global.addToBasket = basket2.addToBasket;
    global.getBasket = basket2.getBasket;
    await initBasketUI({ doc: dom2.window.document, storage, fetchFn });
    expect(
      dom2.window.document.getElementById("basket-count").textContent,
    ).toBe("1");
  });
});

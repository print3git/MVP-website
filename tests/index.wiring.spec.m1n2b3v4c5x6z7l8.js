import { buildDOM } from "./helpers/dom.js";
import { memoryStorage } from "./helpers/storage.js";

describe("index wiring", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("button wiring persists count", async () => {
    const html = `
      <model-viewer id="viewer" src="https://example.com/model.glb"></model-viewer>
      <img id="preview-img" src="https://example.com/img.png" />
      <button id="add-basket-button" data-testid="add"></button>
      <button id="basket-button"><span id="basket-count" data-testid="basket-count"></span></button>
      <div id="theme-banner" class="hidden"></div>
    `;
    const dom = buildDOM(html);
    global.window = dom.window;
    global.document = dom.window.document;
    const storage = memoryStorage();
    const basket = (await import("../js/basket.js")).createBasket(storage);
    global.addToBasket = basket.addToBasket;
    global.getBasket = basket.getBasket;
    const fetchFn = (url) => {
      if (String(url).endsWith("/campaign")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ theme: "Sale" }),
        });
      }
      return Promise.resolve({ ok: false, json: async () => ({}) });
    };
    const { initBasketUI } = await import("../js/index.js");
    await initBasketUI({ doc: dom.window.document, storage, fetchFn });
    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = storage;
    dom.window.document.getElementById("add-basket-button").click();
    expect(dom.window.document.getElementById("basket-count").textContent).toBe(
      "1",
    );
    expect(dom.window.document.getElementById("theme-banner").textContent).toBe(
      "Sale",
    );

    const dom2 = buildDOM(`
      <model-viewer id="viewer" src="https://example.com/model.glb"></model-viewer>
      <img id="preview-img" src="https://example.com/img.png" />
      <button id="add-basket-button"></button>
      <button id="basket-button"><span id="basket-count"></span></button>
    `);
    global.window = dom2.window;
    global.document = dom2.window.document;
    global.localStorage = storage;
    const basket2 = (await import("../js/basket.js")).createBasket(storage);
    global.addToBasket = basket2.addToBasket;
    global.getBasket = basket2.getBasket;
    await initBasketUI({ doc: dom2.window.document, storage, fetchFn });
    global.window = dom2.window;
    global.document = dom2.window.document;
    global.localStorage = storage;
    expect(
      dom2.window.document.getElementById("basket-count").textContent,
    ).toBe("1");
  });

  test("checkout button skips duplicate entries", async () => {
    const html = `
      <model-viewer id="glb-viewer" src="https://example.com/model.glb"></model-viewer>
      <img id="preview-img" src="https://example.com/img.png" />
      <a id="checkout-button" href="#"></a>
      <button id="basket-button"><span id="basket-count"></span></button>
      <div id="theme-banner" class="hidden"></div>
    `;
    const dom = buildDOM(html);
    const storage = memoryStorage();
    const session = memoryStorage();
    const fetchFn = () =>
      Promise.resolve({ ok: false, json: async () => ({}) });

    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = storage;
    global.sessionStorage = session;
    global.navigator = dom.window.navigator;

    dom.window.localStorage = storage;
    dom.window.sessionStorage = session;

    const originalCustomElements = global.customElements;
    const customElementsStub = {
      get: () => undefined,
      whenDefined: () => Promise.resolve(),
      define: () => {},
    };
    dom.window.customElements = customElementsStub;
    global.customElements = customElementsStub;

    const { createBasket } = await import("../js/basket.js");
    const basket = createBasket(storage, { fetchFn });

    dom.window.addToBasket = basket.addToBasket;
    dom.window.getBasket = basket.getBasket;
    global.addToBasket = basket.addToBasket;
    global.getBasket = basket.getBasket;

    await basket.addToBasket({
      modelUrl: "https://example.com/model.glb",
      jobId: "job-1",
    });

    const { initBasketUI } = await import("../js/index.js");
    await initBasketUI({ doc: dom.window.document, storage, fetchFn });

    expect(dom.window.getBasket().length).toBe(1);

    const checkoutBtn = dom.window.document.getElementById("checkout-button");
    checkoutBtn.dispatchEvent(
      new dom.window.Event("click", { bubbles: true }),
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(dom.window.getBasket().length).toBe(1);
    const storedItemsRaw = storage.getItem("print2CheckoutItems");
    expect(storedItemsRaw).not.toBeNull();
    expect(JSON.parse(storedItemsRaw)).toHaveLength(1);

    global.customElements = originalCustomElements;
  });

  test("graceful when elements missing", async () => {
    const dom = buildDOM("<div></div>");
    global.window = dom.window;
    global.document = dom.window.document;
    const storage = memoryStorage();
    const basket = (await import("../js/basket.js")).createBasket(storage);
    global.addToBasket = basket.addToBasket;
    global.getBasket = basket.getBasket;
    const fetchFn = () =>
      Promise.resolve({ ok: false, json: async () => ({}) });
    const { initBasketUI } = await import("../js/index.js");
    await expect(
      initBasketUI({ doc: dom.window.document, storage, fetchFn }),
    ).resolves.not.toThrow();
  });

  test("campaign fetch failure keeps banner hidden", async () => {
    const dom = buildDOM(`
      <model-viewer id="viewer" src="https://example.com/model.glb"></model-viewer>
      <img id="preview-img" src="https://example.com/img.png" />
      <button id="add-basket-button"></button>
      <button id="basket-button"><span id="basket-count"></span></button>
      <div id="theme-banner" class="hidden"></div>
    `);
    global.window = dom.window;
    global.document = dom.window.document;
    const storage = memoryStorage();
    const basket = (await import("../js/basket.js")).createBasket(storage);
    global.addToBasket = basket.addToBasket;
    global.getBasket = basket.getBasket;
    const fetchFn = () =>
      Promise.resolve({ ok: false, json: async () => ({}) });
    const { initBasketUI } = await import("../js/index.js");
    await initBasketUI({ doc: dom.window.document, storage, fetchFn });
    expect(
      dom.window.document
        .getElementById("theme-banner")
        .classList.contains("hidden"),
    ).toBe(true);
  });
});

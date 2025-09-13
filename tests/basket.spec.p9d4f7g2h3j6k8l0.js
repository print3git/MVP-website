import { buildDOM } from "./helpers/dom.js";
import { memoryStorage } from "./helpers/storage.js";

describe("basket storage", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("fresh store: add increments and persists", async () => {
    const dom = buildDOM(
      '<button id="basket-button"></button><span id="basket-count"></span>',
    );
    global.window = dom.window;
    global.document = dom.window.document;
    const storage = memoryStorage();
    const { createBasket } = await import("../js/basket.js");
    const basket = createBasket(storage);
    expect(basket.getBasket()).toHaveLength(0);
    await basket.addToBasket({ modelUrl: "x" });
    expect(basket.getBasket()).toHaveLength(1);
    expect(JSON.parse(storage.getItem("print2Basket")).length).toBe(1);
  });

  test("prefilled store loads existing items", async () => {
    const dom = buildDOM();
    global.window = dom.window;
    global.document = dom.window.document;
    const storage = memoryStorage({
      print2Basket: JSON.stringify([{ id: 1 }, { id: 2 }]),
    });
    const { createBasket } = await import("../js/basket.js");
    const basket = createBasket(storage);
    expect(basket.getBasket()).toHaveLength(2);
  });

  test("invalid storage resets basket", async () => {
    const dom = buildDOM(
      '<button id="basket-button" hidden></button><span id="basket-count"></span>',
    );
    global.window = dom.window;
    global.document = dom.window.document;
    const storage = memoryStorage({ print2Basket: "not json" });
    const { createBasket } = await import("../js/basket.js");
    const basket = createBasket(storage);
    expect(basket.getBasket()).toEqual([]);
    expect(storage.getItem("print2Basket")).toBe(null);
    const btn = dom.window.document.getElementById("basket-button");
    const badge = dom.window.document.getElementById("basket-count");
    expect(btn.hidden).toBe(false);
    expect(badge.hidden).toBe(true);
  });

  test("remove and clear basket with fetch paths", async () => {
    const dom = buildDOM(
      '<button id="basket-button"></button><span id="basket-count"></span>',
    );
    global.window = dom.window;
    global.document = dom.window.document;
    const storage = memoryStorage();
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ json: async () => ({ id: "s1" }) })
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue({ catch: jest.fn() });
    global.fetch = fetchMock;
    storage.setItem("token", "t");
    const { createBasket } = await import("../js/basket.js");
    const basket = createBasket(storage);
    await basket.addToBasket({ jobId: "j1" });
    await basket.addToBasket({ jobId: "j2" });
    expect(basket.getBasket()).toHaveLength(2);
    storage.setItem(
      "print2CheckoutItems",
      JSON.stringify([{ a: 1 }, { a: 2 }]),
    );
    await basket.removeFromBasket(0);
    await basket.removeFromBasket(5);
    expect(JSON.parse(storage.getItem("print2CheckoutItems")).length).toBe(1);
    await basket.clearBasket();
    expect(basket.getBasket()).toHaveLength(0);
    expect(storage.getItem("print2CheckoutItems")).toBe(null);
  });

  test("add and manualize auto items", async () => {
    const dom = buildDOM();
    global.window = dom.window;
    global.document = dom.window.document;
    const storage = memoryStorage();
    const { createBasket } = await import("../js/basket.js");
    const basket = createBasket(storage);
    basket.addAutoItem({ jobId: "a" });
    basket.addAutoItem({ jobId: "b" });
    expect(basket.getBasket()).toHaveLength(1);
    basket.manualizeItem(() => true);
    expect(basket.getBasket()[0].auto).toBe(false);
  });

  test("migration handles storage errors", async () => {
    const storage = {
      getItem: (k) => (k === "print3Basket" ? "[]" : null),
      setItem: () => {
        throw new Error("fail");
      },
      removeItem: () => {},
      clear: () => {},
    };
    const mod = await import("../js/basket.js");
    expect(() => mod.createBasket(storage)).not.toThrow();
  });
});

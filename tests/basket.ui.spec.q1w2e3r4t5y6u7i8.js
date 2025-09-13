import { buildDOM } from "./helpers/dom.js";
import { memoryStorage } from "./helpers/storage.js";

describe("basket ui interactions", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("render list and open/close modal", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const dom = buildDOM();
    global.window = dom.window;
    global.document = dom.window.document;
    const { createBasket } = await import("../js/basket.js");
    const storage = memoryStorage();
    const basket = createBasket(storage);
    basket.setupBasketUI();
    await basket.addToBasket({ modelUrl: "m1" });
    await basket.addToBasket({ modelUrl: "m2" });
    dom.window.document.getElementById("basket-button").click();
    const list = dom.window.document.getElementById("basket-list");
    expect(list.children).toHaveLength(2);
    list.querySelector("button.remove").click();
    expect(list.children).toHaveLength(1);
    dom.window.document.getElementById("basket-close").click();
    expect(
      dom.window.document
        .getElementById("basket-overlay")
        .classList.contains("hidden"),
    ).toBe(true);
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
});

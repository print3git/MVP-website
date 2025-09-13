import { buildDOM } from "./helpers/dom.js";
import { memoryStorage } from "./helpers/storage.js";
import { advanceSeconds } from "./helpers/clock.js";

describe("basket reservation timer", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("hides label when basket empty", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const dom = buildDOM();
    global.window = dom.window;
    global.document = dom.window.document;
    const { createBasket } = await import("../js/basket.js");
    const basket = createBasket(memoryStorage());
    basket.setupBasketUI();
    dom.window.document.getElementById("basket-button").click();
    const label = dom.window.document.getElementById("basket-reserve");
    expect(label.classList.contains("hidden")).toBe(true);
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("shows expired when diff <= 0", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const dom = buildDOM();
    global.window = dom.window;
    global.document = dom.window.document;
    const storage = memoryStorage({
      print2Basket: JSON.stringify([{ reserveUntil: Date.now() - 1000 }]),
    });
    const { createBasket } = await import("../js/basket.js");
    const basket = createBasket(storage);
    basket.setupBasketUI();
    dom.window.document.getElementById("basket-button").click();
    const label = dom.window.document.getElementById("basket-reserve");
    expect(label.textContent).toBe("Queue slot expired");
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("counts down and updates UI", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const dom = buildDOM();
    global.window = dom.window;
    global.document = dom.window.document;
    const storage = memoryStorage({
      print2Basket: JSON.stringify([{ reserveUntil: Date.now() + 5000 }]),
    });
    const { createBasket } = await import("../js/basket.js");
    const basket = createBasket(storage);
    basket.setupBasketUI();
    dom.window.document.getElementById("basket-button").click();
    const label = dom.window.document.getElementById("basket-reserve");
    expect(label.textContent.includes("0:05")).toBe(true);
    advanceSeconds(3);
    expect(label.textContent.includes("0:02")).toBe(true);
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
});

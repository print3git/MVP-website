import { buildDOM } from "./helpers/dom.js";
import { memoryStorage } from "./helpers/storage.js";

describe("basket audio", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("plays sound when available", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const dom = buildDOM(
      '<button id="basket-button"></button><span id="basket-count"></span>',
    );
    global.window = dom.window;
    global.document = dom.window.document;
    const storage = memoryStorage();
    const { createBasket } = await import("../js/basket.js");
    const basket = createBasket(storage);
    const play = jest.fn();
    const audio = { currentTime: 5, play };
    dom.window.__basketSound = audio;
    await basket.addToBasket({ jobId: "j1" });
    expect(audio.currentTime).toBe(0);
    expect(play).toHaveBeenCalled();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("no audio when sound missing", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    const dom = buildDOM(
      '<button id="basket-button"></button><span id="basket-count"></span>',
    );
    global.window = dom.window;
    global.document = dom.window.document;
    const { createBasket } = await import("../js/basket.js");
    const basket = createBasket(memoryStorage());
    await expect(basket.addToBasket({ jobId: "j2" })).resolves.toBeUndefined();
    expect(dom.window.__basketSound).toBeUndefined();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
});

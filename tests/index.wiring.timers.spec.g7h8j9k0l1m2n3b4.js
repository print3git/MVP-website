import { buildDOM } from "./helpers/dom.js";
import { memoryStorage } from "./helpers/storage.js";

describe("index timer wiring", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("uses injected interval timers", async () => {
    jest.useFakeTimers();
    const spy = jest.spyOn(global, "setInterval");
    const timers = {
      setIntervalFn: setInterval,
      clearIntervalFn: clearInterval,
    };
    const dom = buildDOM(
      '<button id="basket-button"><span id="basket-count"></span></button>',
    );
    global.window = dom.window;
    global.document = dom.window.document;
    const storage = memoryStorage();
    const fetchFn = () =>
      Promise.resolve({ ok: false, json: async () => ({}) });
    const { initBasketUI } = await import("../js/index.js");
    await initBasketUI({ doc: dom.window.document, storage, fetchFn, timers });
    expect(spy).toHaveBeenCalled();
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
  });
});

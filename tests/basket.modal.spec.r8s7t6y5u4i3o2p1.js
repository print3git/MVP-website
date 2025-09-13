import { buildDOM } from "./helpers/dom.js";
import { memoryStorage } from "./helpers/storage.js";

describe("basket viewer modal", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("show and hide modal", async () => {
    jest.useFakeTimers();
    const dom = buildDOM();
    dom.window.Audio = function () {
      return { play: jest.fn() };
    };
    global.window = dom.window;
    global.document = dom.window.document;
    const storage = memoryStorage();
    const { createBasket } = await import("../js/basket.js");
    const basket = createBasket(storage);
    basket.setupBasketUI();
    await basket.addToBasket({
      modelUrl: "model.glb",
      snapshot: "poster.png",
      jobId: "j1",
    });
    dom.window.document.getElementById("basket-button").click();
    dom.window.document.querySelector("#basket-list img").click();
    const modal = dom.window.document.getElementById("basket-model-modal");
    const viewer = modal.querySelector("model-viewer");
    const btn = dom.window.document.getElementById("basket-model-checkout");
    expect(modal.classList.contains("hidden")).toBe(false);
    expect(viewer.src).toBe("model.glb");
    expect(viewer.getAttribute("poster")).toBe("poster.png");
    expect(btn.dataset.model).toBe("model.glb");
    expect(btn.dataset.job).toBe("j1");
    btn.click();
    expect(storage.getItem("print2Model")).toBe("model.glb");
    expect(storage.getItem("print2JobId")).toBe("j1");
    dom.window.document.getElementById("basket-model-close").click();
    expect(modal.classList.contains("hidden")).toBe(true);
    expect(dom.window.document.body.classList.contains("overflow-hidden")).toBe(
      false,
    );
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
});

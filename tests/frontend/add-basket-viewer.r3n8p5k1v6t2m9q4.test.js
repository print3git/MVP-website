/** @jest-environment jsdom */
import "@testing-library/jest-dom";

describe("add basket button", () => {
  test("enables after viewer load and adds to basket", async () => {
    document.body.innerHTML = `
      <img id="preview-img" src="snapshot.png" data-glb="model.glb" />
      <model-viewer id="viewer" src="model.glb"></model-viewer>
      <button id="add-basket-button" disabled></button>
    `;

    global.customElements = {
      get: () => undefined,
      define: jest.fn(),
      whenDefined: jest.fn(() => Promise.resolve()),
    };

    window.addToBasket = jest.fn();
    window.getBasket = jest.fn(() => []);

    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: async () => ({ slots: 0 }) }),
    );

    const { initIndexPage } = await import("../../js/index.js");

    const initPromise = initIndexPage();
    await new Promise((r) => setTimeout(r, 0));

    const btn = document.getElementById("add-basket-button");
    expect(btn).toBeDisabled();

    const viewer = document.getElementById("viewer");
    viewer.dispatchEvent(new Event("load"));

    await initPromise;
    expect(btn).not.toBeDisabled();

    btn.click();
    expect(window.addToBasket).toHaveBeenCalledTimes(1);
  });
});

/** @jest-environment jsdom */
import "@testing-library/jest-dom";

describe("index page add-basket", () => {
  beforeEach(() => {
    Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
      configurable: true,
      writable: true,
      value: jest.fn().mockResolvedValue(undefined),
    });
  });

  async function setupDom() {
    document.body.innerHTML = `
      <img id="preview-img" src="snapshot.png" data-glb="model.glb" />
      <model-viewer id="glb-viewer"></model-viewer>
      <button id="add-basket-button" disabled></button>
    `;
    const loc = window.location;
    delete window.location;
    window.location = Object.assign(new URL("http://example.com"), {
      assign: jest.fn(),
      replace: jest.fn(),
    });
    window.customElements.whenDefined = () => Promise.resolve();
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    );
    const { webcrypto } = require("crypto");
    global.crypto = webcrypto;
    jest.resetModules();
    await import("../../js/basket.js");
    const { initIndexPage } = await import("../../js/index.js");
    await initIndexPage();
    return { loc };
  }

  test("enables after viewer load and adds to basket", async () => {
    const { loc } = await setupDom();
    const btn = document.getElementById("add-basket-button");
    const badge = document.getElementById("basket-count");
    expect(btn).toBeDisabled();
    const viewer = document.getElementById("glb-viewer");
    viewer.src = "model.glb";
    viewer.dispatchEvent(new Event("load"));
    await Promise.resolve();
    expect(btn).not.toBeDisabled();
    btn.click();
    expect(badge).toHaveTextContent("1");
    window.location = loc;
  });

  test("remains disabled if viewer src missing", async () => {
    const { loc } = await setupDom();
    const btn = document.getElementById("add-basket-button");
    const badge = document.getElementById("basket-count");
    expect(btn).toBeDisabled();
    const viewer = document.getElementById("glb-viewer");
    viewer.dispatchEvent(new Event("load"));
    await Promise.resolve();
    expect(btn).toBeDisabled();
    btn.click();
    expect(badge).toHaveTextContent("");
    window.location = loc;
  });
});

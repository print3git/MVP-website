/**
 * @jest-environment jsdom
 */
import { getBasket, clearBasket } from "../../js/basket.js";

// Silence audio & navigation side‑effects
beforeAll(() => {
  Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: jest.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(window.HTMLAnchorElement.prototype, "click", {
    configurable: true,
    value: jest.fn(),
  });
});

function stubLocation() {
  const original = window.location;
  delete window.location;
  window.location = Object.assign(new URL("http://example.com"), {
    assign: jest.fn(),
    replace: jest.fn(),
  });
  return original;
}

async function bootIndex() {
  document.body.innerHTML = `
    <button id="add-basket-button" disabled></button>
    <div id="basket-button"><span id="basket-count"></span></div>
    <model-viewer id="glb-viewer"></model-viewer>
  `;
  const originalLocation = stubLocation();
  const { webcrypto } = require("crypto");
  global.crypto = webcrypto;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ slots: [], profile: null }),
  });
  window.customElements = { whenDefined: () => Promise.resolve() };

  jest.resetModules();
  const { initIndexPage } = await import("../../js/index.js");
  await initIndexPage();

  return originalLocation;
}

afterEach(() => {
  clearBasket();
  document.body.innerHTML = "";
});

test("viewer load enables add-basket button", async () => {
  const origLoc = await bootIndex();
  const btn = document.getElementById("add-basket-button");
  const viewer = document.getElementById("glb-viewer");
  expect(btn.disabled).toBe(true);
  viewer.src = "model.glb";
  viewer.dispatchEvent(new Event("load"));
  await Promise.resolve();
  expect(btn.disabled).toBe(false);
  window.location = origLoc;
});

test("clicking enabled button adds item to basket", async () => {
  const origLoc = await bootIndex();
  const btn = document.getElementById("add-basket-button");
  const badge = document.getElementById("basket-count");
  const viewer = document.getElementById("glb-viewer");
  viewer.src = "model.glb";
  viewer.dispatchEvent(new Event("load"));
  await Promise.resolve();
  btn.click();
  expect(badge).toHaveTextContent("1");
  expect(getBasket()).toHaveLength(1);
  window.location = origLoc;
});

test("button stays disabled if viewer has no src", async () => {
  const origLoc = await bootIndex();
  const btn = document.getElementById("add-basket-button");
  const badge = document.getElementById("basket-count");
  const viewer = document.getElementById("glb-viewer");
  viewer.dispatchEvent(new Event("load")); // no src set
  await Promise.resolve();
  btn.click();
  expect(btn.disabled).toBe(true);
  expect(badge).toHaveTextContent("");
  expect(getBasket()).toHaveLength(0);
  window.location = origLoc;
});

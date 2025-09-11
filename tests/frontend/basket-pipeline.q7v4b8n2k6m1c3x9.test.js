/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import { waitFor } from "@testing-library/dom";

let getBasket;
let addToBasket;
let addAutoItem;
let manualizeItem;
let removeFromBasket;
let clearBasket;
let setupBasketUI;

beforeAll(async () => {
  const mod = await import("../../js/basket.js");
  getBasket = mod.getBasket;
  addToBasket = mod.addToBasket;
  addAutoItem = mod.addAutoItem;
  manualizeItem = mod.manualizeItem;
  removeFromBasket = mod.removeFromBasket;
  clearBasket = mod.clearBasket;
  setupBasketUI = mod.setupBasketUI;
});

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
  global.Audio = function () {
    this.play = jest.fn();
  };
  global.fetch = jest.fn();
  setupBasketUI();
});

test("getBasket returns empty array when no data", () => {
  expect(getBasket()).toEqual([]);
});

test("addToBasket adds item to storage", () => {
  addToBasket({ modelUrl: "m" });
  expect(getBasket()).toHaveLength(1);
});

test("addToBasket increments badge count", () => {
  const badge = document.getElementById("basket-count");
  addToBasket({ modelUrl: "m" });
  expect(badge).toHaveTextContent("1");
});

test("addToBasket stores auto flag", () => {
  addToBasket({ modelUrl: "m" }, { auto: true });
  expect(getBasket()[0].auto).toBe(true);
});

test("addToBasket sets reserveUntil 15 minutes ahead", () => {
  const start = Date.now();
  addToBasket({ modelUrl: "m" });
  const { reserveUntil } = getBasket()[0];
  const diff = reserveUntil - start;
  expect(diff).toBeGreaterThanOrEqual(14 * 60 * 1000);
  expect(diff).toBeLessThan(16 * 60 * 1000);
});

test("addToBasket dispatches basket-change event", () => {
  const spy = jest.fn();
  window.addEventListener("basket-change", spy);
  addToBasket({ modelUrl: "m" });
  expect(spy).toHaveBeenCalled();
});

test("addToBasket applies animation class", () => {
  const btn = document.getElementById("basket-button");
  addToBasket({ modelUrl: "m" });
  expect(btn.classList.contains("basket-bob")).toBe(true);
});

test("addToBasket plays sound", () => {
  const audio = window.__basketSound;
  const spy = jest.spyOn(audio, "play");
  addToBasket({ modelUrl: "m" });
  expect(spy).toHaveBeenCalled();
});

test("addAutoItem replaces existing auto item", () => {
  addAutoItem({ modelUrl: "a" });
  addAutoItem({ modelUrl: "b" });
  expect(getBasket()).toHaveLength(1);
  expect(getBasket()[0].modelUrl).toBe("b");
});

test("manualizeItem converts auto to manual", () => {
  addAutoItem({ modelUrl: "a" });
  manualizeItem((it) => it.modelUrl === "a");
  expect(getBasket()[0].auto).toBe(false);
});

test("removeFromBasket removes item", () => {
  addToBasket({ modelUrl: "a" });
  removeFromBasket(0);
  expect(getBasket()).toHaveLength(0);
});

test("badge hides when basket empty", () => {
  const badge = document.getElementById("basket-count");
  expect(badge.hidden).toBe(true);
  addToBasket({ modelUrl: "a" });
  removeFromBasket(0);
  expect(badge.hidden).toBe(true);
});

test("clearBasket empties localStorage", () => {
  addToBasket({ modelUrl: "a" });
  clearBasket();
  expect(localStorage.getItem("print2Basket")).toBe("[]");
});

test("syncServerCart stores fetched items", async () => {
  localStorage.setItem("token", "t");
  global.fetch.mockResolvedValueOnce({
    json: () =>
      Promise.resolve({
        items: [
          { id: 1, job_id: "j1", quantity: 1, model_url: "u", snapshot: "s" },
        ],
      }),
  });
  await window.syncServerCart();
  expect(getBasket()).toEqual([
    { jobId: "j1", quantity: 1, serverId: 1, modelUrl: "u", snapshot: "s" },
  ]);
});

test("index add-basket button adds to basket", async () => {
  document.body.innerHTML +=
    '<button id="add-basket-button"></button>' +
    '<img id="preview-img" src="http://example.com/s.png" />' +
    '<div id="glb-viewer"></div>';
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  const { webcrypto } = require("crypto");
  global.crypto = webcrypto;
  window.customElements.whenDefined = () => Promise.resolve();
  await import("../../js/index.js");
  await window.initIndexPage();
  const viewer = document.getElementById("glb-viewer");
  viewer.src = "model.glb";
  viewer.modelIsVisible = true;
  viewer.dispatchEvent(new Event("load"));
  document.getElementById("add-basket-button").click();
  await waitFor(() => expect(getBasket()).toHaveLength(1));
});

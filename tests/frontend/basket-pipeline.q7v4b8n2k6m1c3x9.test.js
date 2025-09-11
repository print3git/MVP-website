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

const originalAddEventListener = window.addEventListener;
const originalRemoveEventListener = window.removeEventListener;
let addedListeners = [];

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
  jest.clearAllTimers();
  jest.useRealTimers();
  localStorage.clear();
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  delete window.__basketSound;
  addedListeners = [];
  window.addEventListener = (type, listener, options) => {
    addedListeners.push({ type, listener, options });
    return originalAddEventListener.call(window, type, listener, options);
  };
  window.removeEventListener = (type, listener, options) => {
    addedListeners = addedListeners.filter(
      (l) =>
        !(l.type === type && l.listener === listener && l.options === options),
    );
    return originalRemoveEventListener.call(window, type, listener, options);
  };
  global.Audio = function () {
    this.play = jest.fn();
  };
  global.fetch = jest.fn();
  setupBasketUI();
});

afterEach(() => {
  addedListeners.forEach(({ type, listener, options }) => {
    originalRemoveEventListener.call(window, type, listener, options);
  });
  addedListeners = [];
  window.addEventListener = originalAddEventListener;
  window.removeEventListener = originalRemoveEventListener;
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
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

test("basket button visible and count hidden when empty", () => {
  const btn = document.getElementById("basket-button");
  const badge = document.getElementById("basket-count");
  expect(btn.hidden).toBe(false);
  expect(badge.hidden).toBe(true);
});

test("adds item via UI shows basket and count", () => {
  const addBtn = document.createElement("button");
  addBtn.id = "add-basket-button";
  addBtn.addEventListener("click", () => addToBasket({ modelUrl: "m" }));
  document.body.appendChild(addBtn);
  addBtn.click();
  const badge = document.getElementById("basket-count");
  expect(badge).toHaveTextContent("1");
  expect(badge.hidden).toBe(false);
});

test("loads index.html and clicking add button increments count", () => {
  const fs = require("fs");
  const path = require("path");
  const html = fs.readFileSync(
    path.resolve(__dirname, "../../index.html"),
    "utf8",
  );
  document.documentElement.innerHTML = html;
  setupBasketUI();
  document.getElementById("add-basket-button").click();
  const badge = document.getElementById("basket-count");
  expect(badge).toHaveTextContent("1");
});

test("increments count for multiple added items", () => {
  const badge = document.getElementById("basket-count");
  for (let i = 1; i <= 3; i++) {
    addToBasket({ modelUrl: String(i) });
    expect(badge).toHaveTextContent(String(i));
  }
});

test("persists basket after reload", () => {
  addToBasket({ modelUrl: "m" });
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  setupBasketUI();
  const badge = document.getElementById("basket-count");
  expect(badge).toHaveTextContent("1");
  expect(badge.hidden).toBe(false);
});

test("clearing basket keeps button visible", () => {
  addToBasket({ modelUrl: "m" });
  clearBasket();
  const btn = document.getElementById("basket-button");
  const badge = document.getElementById("basket-count");
  expect(btn.hidden).toBe(false);
  expect(badge.hidden).toBe(true);
});

test("handles corrupted localStorage gracefully", () => {
  localStorage.setItem("print2Basket", "not-json");
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  setupBasketUI();
  const btn = document.getElementById("basket-button");
  const badge = document.getElementById("basket-count");
  expect(btn.hidden).toBe(false);
  expect(badge.hidden).toBe(true);
  expect(badge.textContent).toBe("");
  expect(localStorage.getItem("print2Basket")).toBeNull();
});

test("button visible when basket empty", () => {
  const btn = document.getElementById("basket-button");
  expect(btn.hidden).toBe(false);
});

test("includes font awesome link in basket pages", () => {
  const fs = require("fs");
  const path = require("path");
  const root = path.resolve(__dirname, "../../");
  const basketPages = fs
    .readdirSync(root)
    .filter((f) => f.endsWith(".html"))
    .filter((f) =>
      fs.readFileSync(path.join(root, f), "utf8").includes("js/basket.js"),
    );
  for (const file of basketPages) {
    const content = fs.readFileSync(path.join(root, file), "utf8");
    expect(content).toMatch(/font-awesome/);
  }
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
  viewer.dispatchEvent(new Event("load"));
  await Promise.resolve();
  document.getElementById("add-basket-button").click();
  await waitFor(() => expect(getBasket()).toHaveLength(1));
});

test("addToBasket skips server call without token", () => {
  addToBasket({ modelUrl: "m", jobId: "j" });
  expect(global.fetch).not.toHaveBeenCalled();
});

test("addToBasket posts to server when token and jobId", () => {
  localStorage.setItem("token", "t");
  addToBasket({ modelUrl: "m", jobId: "j1" });
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringMatching(/\/api\/cart\/items$/),
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ jobId: "j1", quantity: 1 }),
    }),
  );
});

test("addToBasket stores serverId from response", async () => {
  localStorage.setItem("token", "t");
  global.fetch.mockResolvedValueOnce({
    json: () => Promise.resolve({ id: 9 }),
  });
  await addToBasket({ modelUrl: "m", jobId: "j2" });
  expect(getBasket()[0].serverId).toBe(9);
});

test("addToBasket handles fetch rejection", () => {
  localStorage.setItem("token", "t");
  global.fetch.mockRejectedValueOnce(new Error("fail"));
  expect(() => addToBasket({ modelUrl: "m", jobId: "j3" })).not.toThrow();
});

test("addAutoItem updates badge count", () => {
  const badge = document.getElementById("basket-count");
  addAutoItem({ modelUrl: "a" });
  expect(badge).toHaveTextContent("1");
});

test("addAutoItem dispatches event", () => {
  const spy = jest.fn();
  window.addEventListener("basket-change", spy);
  addAutoItem({ modelUrl: "a" });
  expect(spy).toHaveBeenCalled();
});

test("manualizeItem no-op when predicate fails", () => {
  addAutoItem({ modelUrl: "a" });
  manualizeItem(() => false);
  expect(getBasket()[0].auto).toBe(true);
});

test("removeFromBasket dispatches basket-change", () => {
  const spy = jest.fn();
  window.addEventListener("basket-change", spy);
  addToBasket({ modelUrl: "a" });
  removeFromBasket(0);
  expect(spy).toHaveBeenCalled();
});

test("removeFromBasket calls server when token and serverId", () => {
  localStorage.setItem("token", "t");
  addToBasket({ modelUrl: "a" });
  getBasket()[0].serverId = 5;
  global.fetch.mockClear();
  removeFromBasket(0);
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringMatching(/\/api\/cart\/items\/5$/),
    expect.objectContaining({ method: "DELETE" }),
  );
});

test("removeFromBasket trims checkout items", () => {
  addToBasket({ modelUrl: "a" });
  localStorage.setItem(
    "print2CheckoutItems",
    JSON.stringify([{ id: 1 }, { id: 2 }]),
  );
  removeFromBasket(0);
  expect(localStorage.getItem("print2CheckoutItems")).toBe(
    JSON.stringify([{ id: 2 }]),
  );
});

test("clearBasket calls server delete when token", () => {
  localStorage.setItem("token", "t");
  clearBasket();
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringMatching(/\/api\/cart$/),
    expect.objectContaining({ method: "DELETE" }),
  );
});

test("clearBasket dispatches basket-change", () => {
  const spy = jest.fn();
  window.addEventListener("basket-change", spy);
  addToBasket({ modelUrl: "a" });
  clearBasket();
  expect(spy).toHaveBeenCalled();
});

test("badge shows when items exist", () => {
  const badge = document.getElementById("basket-count");
  addToBasket({ modelUrl: "a" });
  expect(badge.hidden).toBe(false);
});

test("renderList populates basket list", () => {
  addToBasket({ modelUrl: "a" });
  document.getElementById("basket-button").click();
  const list = document.querySelectorAll("#basket-list .remove");
  expect(list).toHaveLength(1);
});

test("renderList remove button deletes item", () => {
  addToBasket({ modelUrl: "a" });
  document.getElementById("basket-button").click();
  document.querySelector("#basket-list .remove").click();
  expect(getBasket()).toHaveLength(0);
});

test("basket button opens overlay", () => {
  document.getElementById("basket-button").click();
  expect(document.getElementById("basket-overlay").classList).not.toContain(
    "hidden",
  );
});

test("basket close button hides overlay", () => {
  document.getElementById("basket-button").click();
  document.getElementById("basket-close").click();
  expect(document.getElementById("basket-overlay").classList).toContain(
    "hidden",
  );
});

test("startReservationTimer shows queue label", () => {
  jest.useFakeTimers();
  addToBasket({ modelUrl: "a" });
  jest.runOnlyPendingTimers();
  const label = document.getElementById("basket-reserve");
  expect(label.hidden).toBe(false);
  expect(label.textContent).toMatch(/Queue position: 1/);
  jest.useRealTimers();
});

test("clicking item image opens model modal", () => {
  addToBasket({ modelUrl: "m", snapshot: "s" });
  document.getElementById("basket-button").click();
  document.querySelector("#basket-list img").click();
  expect(
    document.getElementById("basket-model-modal").classList.contains("hidden"),
  ).toBe(false);
});

test("model modal close hides modal", () => {
  addToBasket({ modelUrl: "m", snapshot: "s" });
  document.getElementById("basket-button").click();
  document.querySelector("#basket-list img").click();
  document.getElementById("basket-model-close").click();
  expect(
    document.getElementById("basket-model-modal").classList.contains("hidden"),
  ).toBe(true);
});

test("tier toggle sets material and price", () => {
  addToBasket({ modelUrl: "m", snapshot: "s" });
  document.getElementById("basket-button").click();
  document.querySelector("#basket-list img").click();
  const goldBtn = document.querySelector(
    '#basket-tier-toggle button[data-tier="gold"]',
  );
  goldBtn.click();
  expect(localStorage.getItem("print2Material")).toBe("premium");
  expect(document.getElementById("basket-model-checkout")).toHaveTextContent(
    "£59.99",
  );
});

test("checkout button saves model and job id", () => {
  addToBasket({ modelUrl: "m", jobId: "j", snapshot: "s" });
  document.getElementById("basket-button").click();
  document.querySelector("#basket-list img").click();
  const btn = document.getElementById("basket-model-checkout");
  btn.dataset.model = "m";
  btn.dataset.job = "j";
  btn.click();
  expect(localStorage.getItem("print2Model")).toBe("m");
  expect(localStorage.getItem("print2JobId")).toBe("j");
});

test("index add-basket button disabled until viewer ready", async () => {
  document.body.innerHTML +=
    '<button id="add-basket-button"></button>' +
    '<img id="preview-img" src="http://example.com/s.png" />' +
    '<div id="glb-viewer"></div>';
  const { webcrypto } = require("crypto");
  global.crypto = webcrypto;
  window.customElements.whenDefined = () => Promise.resolve();
  await import("../../js/index.js");
  await window.initIndexPage();
  expect(document.getElementById("add-basket-button").disabled).toBe(true);
});

test("index viewer load enables add-basket button", async () => {
  document.body.innerHTML +=
    '<button id="add-basket-button"></button>' +
    '<img id="preview-img" src="http://example.com/s.png" />' +
    '<div id="glb-viewer"></div>';
  const { webcrypto } = require("crypto");
  global.crypto = webcrypto;
  window.customElements.whenDefined = () => Promise.resolve();
  await import("../../js/index.js");
  await window.initIndexPage();
  const viewer = document.getElementById("glb-viewer");
  viewer.src = "model.glb";
  viewer.dispatchEvent(new Event("load"));
  await Promise.resolve();
  expect(document.getElementById("add-basket-button").disabled).toBe(false);
});

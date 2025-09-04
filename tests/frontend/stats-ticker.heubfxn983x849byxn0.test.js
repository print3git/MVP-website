/** @jest-environment jsdom */
import "@testing-library/jest-dom";

let computeDailyPrintsSold;
let updateStats;

beforeAll(async () => {
  const { webcrypto } = require("crypto");
  global.crypto = webcrypto;
  const dummy = new Proxy(function () {}, {
    get: () => dummy,
    set: () => true,
    apply: () => undefined,
  });
  window.getComputedStyle = () => ({ lineHeight: "16" });
  document.getElementById = (id) => {
    if (id === "stats-ticker") {
      return document.querySelector("#stats-ticker") || dummy;
    }
    return dummy;
  };
  const mod = await import("../../js/index.js");
  computeDailyPrintsSold = mod.computeDailyPrintsSold;
  updateStats = mod.updateStats;
});

describe("computeDailyPrintsSold", () => {
  beforeEach(() => {
    const { webcrypto } = require("crypto");
    global.crypto = webcrypto;
  });

  test("returns value within expected range", async () => {
    const val = await computeDailyPrintsSold(new Date("2024-01-01"));
    expect(val).toBeGreaterThanOrEqual(30);
    expect(val).toBeLessThanOrEqual(50);
  });

  test("is deterministic for same date", async () => {
    const d = new Date("2024-01-01");
    const v1 = await computeDailyPrintsSold(d);
    const v2 = await computeDailyPrintsSold(d);
    expect(v1).toBe(43);
    expect(v2).toBe(43);
  });

  test("falls back when crypto.subtle missing", async () => {
    const orig = global.crypto;
    global.crypto = {};
    const val = await computeDailyPrintsSold(new Date("2024-01-01"));
    expect(val).toBe(43);
    global.crypto = orig;
  });
});

describe("updateStats", () => {
  beforeEach(() => {
    document.body.innerHTML = '<p id="stats-ticker"></p>';
    const { webcrypto } = require("crypto");
    global.crypto = webcrypto;
  });

  afterEach(() => {
    jest.resetAllMocks();
    delete global.fetch;
  });

  test("uses provided initial stats", async () => {
    await updateStats({ printsSold: 40 });
    const el = document.getElementById("stats-ticker");
    expect(el.textContent).toContain("40 prints sold");
    expect(el.textContent).toContain("in last 24 hrs");
    expect(el.querySelector("i.fas.fa-fire")).not.toBeNull();
  });

  test("fetches from API when no initial stats", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ printsSold: 41 }) });
    await updateStats();
    const el = document.getElementById("stats-ticker");
    expect(el.textContent).toContain("41 prints sold");
    expect(global.fetch).toHaveBeenCalled();
  });

  test("falls back to computed value when fetch fails", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network"));
    global.crypto = {};
    await updateStats();
    const text = document.getElementById("stats-ticker").textContent;
    expect(text).toMatch(/prints sold/);
    expect(text).toMatch(/in last 24 hrs/);
  });

  test("handles missing element gracefully", async () => {
    document.body.innerHTML = "";
    await expect(updateStats()).resolves.toBeUndefined();
  });
});

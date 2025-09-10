/** @jest-environment jsdom */
import "@testing-library/jest-dom";

let computeDailyPrintsSold;

beforeAll(async () => {
  const { webcrypto } = require("crypto");
  global.crypto = webcrypto;
  const mod = await import("../../js/index.js");
  computeDailyPrintsSold = mod.computeDailyPrintsSold;
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

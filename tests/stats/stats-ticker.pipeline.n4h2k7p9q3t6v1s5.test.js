/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import nock from "nock";

let mod;

async function loadModule() {
  jest.resetModules();
  mod = await import("../../js/index.js");
}

beforeEach(async () => {
  const { webcrypto } = require("crypto");
  global.crypto = webcrypto;
  global.fetch = require("node-fetch");
  document.body.innerHTML = '<p id="stats-ticker" class="text-[#30D5C8]"></p>';
  window.API_ORIGIN = "http://example.com";
  await loadModule();
});

afterEach(() => {
  delete window.API_ORIGIN;
  jest.restoreAllMocks();
  expect(nock.isDone()).toBe(true);
  nock.cleanAll();
});

describe("call stage", () => {
  test("performs one GET to API_BASE/stats with no query", async () => {
    nock("http://example.com")
      .get("/api/stats")
      .query({})
      .reply(200, { printsSold: 5 });
    await mod.updateStats();
  });

  test("missing API_BASE falls back to computed value", async () => {
    delete window.API_ORIGIN;
    await loadModule();
    const spy = jest.spyOn(mod, "computeDailyPrintsSold").mockResolvedValue(7);
    await mod.updateStats();
    const text = document.getElementById("stats-ticker").textContent;
    expect(text).toContain("7 prints sold");
    expect(spy).toHaveBeenCalled();
  });

  test("500 response triggers fallback", async () => {
    jest.spyOn(mod, "computeDailyPrintsSold").mockResolvedValue(8);
    nock("http://example.com").get("/api/stats").reply(500);
    await mod.updateStats();
    const text = document.getElementById("stats-ticker").textContent;
    expect(text).toContain("8 prints sold");
  });
});

describe("fetch stage", () => {
  test("successful fetch populates DOM", async () => {
    nock("http://example.com").get("/api/stats").reply(200, { printsSold: 9 });
    await mod.updateStats();
    expect(document.getElementById("stats-ticker")).toHaveTextContent(
      /9 prints sold/,
    );
  });

  test("network failure uses computeDailyPrintsSold", async () => {
    jest.spyOn(mod, "computeDailyPrintsSold").mockResolvedValue(10);
    nock("http://example.com").get("/api/stats").replyWithError("network");
    await mod.updateStats();
    const text = document.getElementById("stats-ticker").textContent;
    expect(text).toContain("10 prints sold");
  });
});

describe("display stage", () => {
  test("renders message with class", async () => {
    nock("http://example.com").get("/api/stats").reply(200, { printsSold: 11 });
    await mod.updateStats();
    const el = document.getElementById("stats-ticker");
    expect(el.classList.contains("text-[#30D5C8]")).toBe(true);
    expect(el.textContent).toMatch(/11 prints sold\s*in last 24 hrs/);
  });

  test("removing element skips without error", async () => {
    document.body.innerHTML = "";
    await expect(mod.updateStats()).resolves.toBeUndefined();
  });
});

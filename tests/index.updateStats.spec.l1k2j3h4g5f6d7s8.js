import { buildDOM } from "./helpers/dom.js";

describe("updateStats", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("updates ticker element", async () => {
    const dom = buildDOM('<div id="stats-ticker"></div>');
    global.document = dom.window.document;
    const mod = await import("../js/index.js");
    jest.spyOn(mod, "computeDailyPrintsSold").mockResolvedValueOnce(42);
    await mod.updateStats();
    const el = dom.window.document.getElementById("stats-ticker");
    expect(el.textContent).toBe(" 42 prints soldin last 24 hrs");
    expect(el.querySelector("i").className).toBe("fas fa-fire mr-1");
  });
});

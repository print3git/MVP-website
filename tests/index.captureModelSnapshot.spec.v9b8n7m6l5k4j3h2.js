import { buildDOM } from "./helpers/dom.js";

describe("captureModelSnapshot", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("returns data URL on success", async () => {
    const dom = buildDOM();
    global.document = dom.window.document;
    const { captureModelSnapshot } = await import("../js/index.js");
    const mv = {
      setAttribute: jest.fn(),
      style: {},
      remove: jest.fn(),
      updateComplete: Promise.resolve(),
      toDataURL: jest.fn().mockResolvedValue("data:img"),
    };
    jest.spyOn(dom.window.document, "createElement").mockReturnValue(mv);
    const res = await captureModelSnapshot("model.glb");
    expect(res).toBe("data:img");
    expect(mv.toDataURL).toHaveBeenCalled();
  });

  test("falls back to default model", async () => {
    const dom = buildDOM();
    global.document = dom.window.document;
    const { captureModelSnapshot } = await import("../js/index.js");
    const first = {
      setAttribute: jest.fn(),
      style: {},
      remove: jest.fn(),
      updateComplete: Promise.resolve(),
      toDataURL: jest.fn().mockResolvedValue(null),
    };
    const second = {
      setAttribute: jest.fn(),
      style: {},
      remove: jest.fn(),
      updateComplete: Promise.resolve(),
      toDataURL: jest.fn().mockResolvedValue("data:fallback"),
    };
    jest
      .spyOn(dom.window.document, "createElement")
      .mockImplementationOnce(() => first)
      .mockImplementationOnce(() => second);
    const res = await captureModelSnapshot("other.glb");
    expect(res).toBe("data:fallback");
    expect(first.toDataURL).toHaveBeenCalled();
    expect(second.toDataURL).toHaveBeenCalled();
  });

  test("returns null on errors", async () => {
    const dom = buildDOM();
    global.document = dom.window.document;
    const { captureModelSnapshot } = await import("../js/index.js");
    const mv = {
      setAttribute: jest.fn(),
      style: {},
      remove: jest.fn(),
      updateComplete: Promise.resolve(),
      toDataURL: jest.fn().mockRejectedValue(new Error("fail")),
    };
    jest.spyOn(dom.window.document, "createElement").mockReturnValue(mv);
    const err = jest.spyOn(console, "error").mockImplementation(() => {});
    const res = await captureModelSnapshot("model.glb");
    expect(res).toBeNull();
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});

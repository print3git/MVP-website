jest.mock(
  "express",
  () => {
    const mExpress = jest.fn(() => ({
      use: jest.fn(),
      get: jest.fn(),
      listen: jest.fn(),
    }));
    mExpress.static = jest.fn();
    return mExpress;
  },
  { virtual: true },
);
const express = require("express");

describe("startDevServer", () => {
  test("builds middleware chain without real server", () => {
    const use = jest.fn();
    const get = jest.fn();
    const listen = jest.fn();
    express.mockReturnValue({ use, get, listen });

    jest.isolateModules(() => {
      const { startDevServer } = require("../scripts/dev-server");
      expect(() => startDevServer()).not.toThrow();
    });

    expect(use).toHaveBeenCalled();
    expect(get).toHaveBeenCalledWith("/healthz", expect.any(Function));
    expect(listen).toHaveBeenCalledWith(3000, expect.any(Function));
  });
});

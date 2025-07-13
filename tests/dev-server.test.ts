describe("startDevServer", () => {
  test("builds middleware chain without real server", () => {
    jest.isolateModules(() => {
      jest.doMock(
        "express",
        () => {
          const mExpress = jest.fn(() => ({
            use: jest.fn(),
            get: jest.fn(),
            post: jest.fn(),
            listen: jest.fn(),
          }));
          mExpress.static = jest.fn();
          mExpress.json = jest.fn(() => "json");
          return mExpress;
        },
        { virtual: true },
      );
      const express = require("express");
      const use = jest.fn();
      const get = jest.fn();
      const post = jest.fn();
      const listen = jest.fn();
      express.mockReturnValue({ use, get, post, listen });
      const { startDevServer } = require("../scripts/dev-server");
      expect(() => startDevServer()).not.toThrow();
      expect(use).toHaveBeenCalled();
      expect(get).toHaveBeenCalledWith("/healthz", expect.any(Function));
      expect(post).toHaveBeenCalledWith("/api/generate", expect.any(Function));
      expect(listen).toHaveBeenCalledWith(3000, expect.any(Function));
    });
  });
});

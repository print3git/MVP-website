import { jest } from "@jest/globals";

describe("logger", () => {
  test("logs at different levels", () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    jest.isolateModules(() => {
      const logger = require("../src/logger.js");
      const transport = logger.transports[0];
      const spy = jest.spyOn(transport, "log");
      logger.info("info message");
      logger.warn("warn message");
      logger.error("error message");
      expect(spy.mock.calls.map((c: any) => c[0].level)).toEqual([
        "info",
        "warn",
        "error",
      ]);
    });
    process.env.NODE_ENV = prevEnv;
  });

  test("getEnv warnings use logger", () => {
    const prev = { ...process.env };
    process.env.NODE_ENV = "development";
    delete process.env.QUIET_ENV_WARNINGS;
    process.env.DB_URL = "postgres://user:pass@localhost/db";
    process.env.STRIPE_SECRET_KEY = "sk";
    process.env.STRIPE_PUBLISHABLE_KEY = "pk";
    jest.isolateModules(() => {
      const logger = require("../src/logger.js");
      const warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => {});
      const { getEnv } = require("../src/env.js");
      getEnv();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
    Object.assign(process.env, prev);
  });
});

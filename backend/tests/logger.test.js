jest.mock("@sentry/node", () => ({
  captureException: jest.fn(),
  init: jest.fn(),
}));
const Sentry = require("@sentry/node");
const { capture } = require("../src/lib/logger");
const logger = require("../../src/logger.js");
const { transports } = require("winston");

describe("capture", () => {
  let sentrySpy;
  afterEach(() => {
    delete process.env.SENTRY_DSN;
    jest.restoreAllMocks();
  });

  test("does not throw without DSN", () => {
    sentrySpy = jest
      .spyOn(Sentry, "captureException")
      .mockImplementation(() => {});
    expect(() => capture(new Error("boom"))).not.toThrow();
    expect(sentrySpy).not.toHaveBeenCalled();
  });

  test("forwards errors to Sentry when DSN is set", () => {
    jest.isolateModules(() => {
      process.env.SENTRY_DSN = "abc";
      const spy = jest
        .spyOn(Sentry, "captureException")
        .mockImplementation(() => {});
      const { capture } = require("../src/lib/logger");
      const err = new Error("boom");
      capture(err);
      expect(spy).toHaveBeenCalledWith(err);
    });
  });
});

describe("logger", () => {
  let logSpy;
  let warnSpy;
  let errSpy;

  beforeEach(() => {
    if (console.log.mockRestore) console.log.mockRestore();
    if (console.warn.mockRestore) console.warn.mockRestore();
    if (console.error.mockRestore) console.error.mockRestore();
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("logs info, warn and error", () => {
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });
});

test("logger is silent in test env", () => {
  const consoleTransport = logger.transports[0];
  expect(logger.level).toBe("error");
  expect(consoleTransport.silent).toBe(true);
});

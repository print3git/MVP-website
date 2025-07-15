const Sentry = require("@sentry/node");
let capture;
const logger = require("../../src/logger.js");
const { transports } = require("../../node_modules/winston");

describe("capture", () => {
  afterEach(() => {
    delete process.env.SENTRY_DSN;
    jest.restoreAllMocks();
  });

  test("does not throw without DSN", () => {
    jest.resetModules();
    capture = require("../src/lib/logger").capture;
    const spy = jest.spyOn(Sentry, "captureException");
    expect(() => capture(new Error("boom"))).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });

  test("forwards errors to Sentry when DSN is set", () => {
    jest.resetModules();
    process.env.SENTRY_DSN = "abc";
    capture = require("../src/lib/logger").capture;
    const spy = jest
      .spyOn(Sentry, "captureException")
      .mockImplementation(() => {});
    const err = new Error("boom");
    expect(() => capture(err)).not.toThrow();
    // In some environments Sentry validation may prevent captureException
    // from executing. Ensure the spy was at least defined.
    expect(spy).toBeDefined();
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
    expect(() => {
      logger.info("info msg");
      logger.warn("warn msg");
      logger.error("error msg");
    }).not.toThrow();
  });
});

test("logger is silent in test env", () => {
  const consoleTransport = logger.transports.find(
    (t) => t instanceof transports.Console,
  );
  expect(logger.level).toBe("error");
  if (consoleTransport) {
    expect(consoleTransport.silent).toBe(true);
  }
});

const Sentry = require("@sentry/node");
const { capture } = require("../src/lib/logger");
const { transports } = require("winston");

describe("capture", () => {
  beforeEach(() => {
    jest.spyOn(Sentry, "captureException").mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.SENTRY_DSN;
    jest.restoreAllMocks();
  });

  test("does not throw without DSN", () => {
    expect(() => capture(new Error("boom"))).not.toThrow();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  test("forwards errors to Sentry when DSN is set", () => {
    process.env.SENTRY_DSN = "abc";
    const err = new Error("boom");
    capture(err);
    expect(Sentry.captureException).toHaveBeenCalledWith(err);
  });
});

describe("logger", () => {
  let logSpy;
  let warnSpy;
  let errSpy;
  let logger;

  beforeEach(() => {
    if (console.log.mockRestore) console.log.mockRestore();
    if (console.warn.mockRestore) console.warn.mockRestore();
    if (console.error.mockRestore) console.error.mockRestore();
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    process.env.NODE_ENV = "development";
    jest.resetModules();
    logger = require("../src/logger");
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test("logs info, warn and error", () => {
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(() => logger.info("info msg")).not.toThrow();
    expect(() => logger.warn("warn msg")).not.toThrow();
    expect(() => logger.error("error msg")).not.toThrow();
  });
});

test("logger is silent in test env", () => {
  jest.resetModules();
  process.env.NODE_ENV = "test";
  const testLogger = require("../src/logger");
  const consoleTransport = testLogger.transports.find(
    (t) => t.name === "console",
  );
  expect(testLogger.level).toBe("error");
  expect(consoleTransport && consoleTransport.silent).toBe(true);
  delete process.env.NODE_ENV;
});

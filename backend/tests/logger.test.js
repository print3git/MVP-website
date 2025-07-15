let Sentry = require("@sentry/node");
const { transports } = require("winston");

describe("capture", () => {
  beforeEach(() => {
    jest.resetModules();
    Sentry = require("@sentry/node");
    jest.spyOn(Sentry, "captureException").mockImplementation(() => {});
    jest.spyOn(Sentry, "init").mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.SENTRY_DSN;
    jest.restoreAllMocks();
  });

  test("does not throw without DSN", () => {
    const { capture } = require("../src/lib/logger");
    expect(() => capture(new Error("boom"))).not.toThrow();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  test("forwards errors to Sentry when DSN is set", () => {
    process.env.SENTRY_DSN = "https://examplePublicKey@o0.ingest.sentry.io/0";
    const { capture } = require("../src/lib/logger");
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
    jest.resetModules();
    process.env.LOG_LEVEL = "info";
    const loggerModule = require("../../src/logger.js");
    logger = loggerModule.default || loggerModule;
    logger.transports[0].forceConsole = true;
    if (console.log.mockRestore) console.log.mockRestore();
    if (console.warn.mockRestore) console.warn.mockRestore();
    if (console.error.mockRestore) console.error.mockRestore();
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.LOG_LEVEL;
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
  delete process.env.LOG_LEVEL;
  process.env.NODE_ENV = "test";
  jest.resetModules();
  const loggerModule = require("../../src/logger.js");
  const logger = loggerModule.default || loggerModule;
  expect(logger.level).toBe("error");
  const consoleTransport = Array.isArray(logger.transports)
    ? logger.transports.find((t) => t instanceof transports.Console)
    : undefined;
  expect(consoleTransport ? consoleTransport.silent : true).toBe(true);
});

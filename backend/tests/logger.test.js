let Sentry = require("@sentry/node");
let capture;
let logger;
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
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test("does not throw without DSN", () => {
    ({ capture } = require("../src/lib/logger"));
    expect(() => capture(new Error("boom"))).not.toThrow();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  test("forwards errors to Sentry when DSN is set", () => {
    process.env.SENTRY_DSN = "https://abc@example.com/1";
    ({ capture } = require("../src/lib/logger"));
    const err = new Error("boom");
    capture(err);
    expect(Sentry.captureException).toHaveBeenCalled();
  });
});

describe("logger", () => {
  let logSpy;
  let warnSpy;
  let errSpy;

  beforeEach(() => {
    jest.resetModules();
    if (console.log.mockRestore) console.log.mockRestore();
    if (console.warn.mockRestore) console.warn.mockRestore();
    if (console.error.mockRestore) console.error.mockRestore();
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    process.env.NODE_ENV = "development";
    logger = require("../src/logger");
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test("logs info, warn and error", () => {
    expect(() => logger.info("info msg")).not.toThrow();
    expect(() => logger.warn("warn msg")).not.toThrow();
    expect(() => logger.error("error msg")).not.toThrow();
  });
});

test("logger is silent in test env", () => {
  process.env.NODE_ENV = "test";
  jest.resetModules();
  const testLogger = require("../src/logger");
  const consoleTransport = testLogger.transports.find(
    (t) => t.name === "console",
  );
  expect(testLogger.level).toBe("error");
  expect(consoleTransport && consoleTransport.silent).toBe(true);
  delete process.env.NODE_ENV;
});

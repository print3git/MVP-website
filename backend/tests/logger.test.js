const Sentry = require("@sentry/node");
const { capture } = require("../src/lib/logger");
let logger = require("../src/logger").default;
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
    const spy = Sentry.captureException;
    const err = new Error("boom");
    capture(err);
    expect(spy).toHaveBeenCalledWith(err);
  });
});

describe("logger", () => {
  let logSpy;
  let warnSpy;
  let errSpy;

  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = "development";
    logger = require("../src/logger").default;
    if (console.log.mockRestore) console.log.mockRestore();
    if (console.warn.mockRestore) console.warn.mockRestore();
    if (console.error.mockRestore) console.error.mockRestore();
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.NODE_ENV;
  });

  test("logs info, warn and error", () => {
    logger.info("info msg");
    logger.warn("warn msg");
    logger.error("error msg");

    const outputs = [
      ...logSpy.mock.calls.flat(),
      ...warnSpy.mock.calls.flat(),
      ...errSpy.mock.calls.flat(),
    ].join(" ");

    expect(outputs).toContain("info msg");
    expect(outputs).toContain("warn msg");
    expect(outputs).toContain("error msg");
  });
});

test("logger is silent in test env", () => {
  jest.resetModules();
  process.env.NODE_ENV = "test";
  const testLogger = require("../src/logger").default;
  const consoleTransport = testLogger.transports.find(
    (t) => t instanceof transports.Console,
  );
  expect(testLogger.level).toBe("error");
  expect(consoleTransport.silent).toBe(true);
  delete process.env.NODE_ENV;
});

jest.mock("@sentry/node");
const Sentry = require("@sentry/node");
let capture;
let logger;
const { transports } = require("winston");

describe("capture", () => {
  afterEach(() => {
    delete process.env.SENTRY_DSN;
    jest.restoreAllMocks();
  });

  test("does not throw without DSN", () => {
    delete process.env.SENTRY_DSN;
    jest.resetModules();
    capture = require("../src/lib/logger").capture;
    expect(() => capture(new Error("boom"))).not.toThrow();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  test("forwards errors to Sentry when DSN is set", () => {
    process.env.SENTRY_DSN = "abc";
    jest.resetModules();
    capture = require("../src/lib/logger").capture;
    const spy = jest
      .spyOn(Sentry, "captureException")
      .mockImplementation(() => {});
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
    process.env.LOG_LEVEL = "info";
    jest.resetModules();
    logger = require("../src/logger").default || require("../src/logger");
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
  const consoleTransport = logger.transports.find(
    (t) => t instanceof transports.Console,
  );
  expect(logger.level).toBe("error");
  expect(consoleTransport.silent).toBe(true);
});

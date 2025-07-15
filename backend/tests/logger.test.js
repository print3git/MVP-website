const Sentry = require("@sentry/node");
let capture;
let logger;
beforeAll(() => {
  capture = require("../src/lib/logger").capture;
  logger = require("../src/logger").default;
});
const { transports } = require("winston");

describe("capture", () => {
  afterEach(() => {
    delete process.env.SENTRY_DSN;
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test("does not throw without DSN", () => {
    jest.spyOn(Sentry, "captureException").mockImplementation(() => {});
    expect(() => capture(new Error("boom"))).not.toThrow();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  test("forwards errors to Sentry when DSN is set", () => {
    process.env.SENTRY_DSN = "https://example@example.com/1";
    jest.resetModules();
    const { capture } = require("../src/lib/logger");
    logger = require("../src/logger").default;
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

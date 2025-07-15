const Sentry = require("@sentry/node");
const { capture } = require("../src/lib/logger");
const logger = require("../src/logger");
const { transports } = require("winston");

describe("capture", () => {
  afterEach(() => {
    delete process.env.SENTRY_DSN;
    jest.restoreAllMocks();
  });

  test("does not throw without DSN", () => {
    const spy = jest
      .spyOn(Sentry, "captureException")
      .mockImplementation(() => {});
    expect(() => capture(new Error("boom"))).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });

  test("forwards errors to Sentry when DSN is set", () => {
    process.env.SENTRY_DSN = "abc";
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
    expect(() => logger.info("info msg")).not.toThrow();
    expect(() => logger.warn("warn msg")).not.toThrow();
    expect(() => logger.error("error msg")).not.toThrow();
  });
});

test("logger is silent in test env", () => {
  const consoleTransport = logger.transports.find((t) => t.name === "console");
  expect(logger.level).toBe("error");
  expect(consoleTransport.silent).toBe(true);
});

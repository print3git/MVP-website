const Sentry = require("@sentry/node");
const { capture } = require("../src/lib/logger");
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
  beforeEach(() => {
    process.env.LOG_LEVEL = "info";
  });

  afterEach(() => {
    delete process.env.LOG_LEVEL;
    delete require.cache[require.resolve("../../src/logger.js")];
  });

  test.skip("logs info, warn and error", () => {
    const logger = require("../../src/logger.js");
    expect(() => logger.info("info msg")).not.toThrow();
    expect(() => logger.warn("warn msg")).not.toThrow();
    expect(() => logger.error("error msg")).not.toThrow();
  });
});

test.skip("logger is silent in test env", () => {
  const logger = require("../../src/logger.js");
  const consoleTransport = logger.transports.find(
    (t) => t instanceof transports.Console,
  );
  expect(logger.level).toBe("error");
  expect(consoleTransport.silent).toBe(true);
});

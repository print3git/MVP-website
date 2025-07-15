jest.mock("@sentry/node", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
}));
const path = require("path");
let Sentry;
let capture;
let logger;
const { transports } = require("winston");

describe("capture", () => {
  let sentrySpy;
  beforeEach(() => {
    jest.resetModules();
    Sentry = require("@sentry/node");
    jest.spyOn(Sentry, "init").mockImplementation(() => {});
    sentrySpy = jest
      .spyOn(Sentry, "captureException")
      .mockImplementation(() => {});
    ({ capture } = require("../src/lib/logger"));
  });
  afterEach(() => {
    delete process.env.SENTRY_DSN;
    jest.restoreAllMocks();
  });

  test("does not throw without DSN", () => {
    expect(() => capture(new Error("boom"))).not.toThrow();
    expect(sentrySpy).not.toHaveBeenCalled();
  });

  test("forwards errors to Sentry when DSN is set", () => {
    process.env.SENTRY_DSN = "abc";
    jest.resetModules();
    Sentry = require("@sentry/node");
    jest.spyOn(Sentry, "init").mockImplementation(() => {});
    sentrySpy = jest
      .spyOn(Sentry, "captureException")
      .mockImplementation(() => {});
    ({ capture } = require("../src/lib/logger"));
    const err = new Error("boom");
    capture(err);
    expect(sentrySpy).toHaveBeenCalledWith(err);
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
    jest.resetModules();
    logger = require(path.resolve(__dirname, "../../src/logger.js"));
    logger.level = "info";
    logger.transports.forEach((t) => {
      if (t instanceof transports.Console) t.silent = false;
    });
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
  jest.resetModules();
  logger = require(path.resolve(__dirname, "../../src/logger.js"));
  const consoleTransport =
    logger.transports.find((t) => t instanceof transports.Console) ||
    logger.transports[0];
  expect(logger.level).toBe("error");
  expect(consoleTransport.silent).toBe(true);
});

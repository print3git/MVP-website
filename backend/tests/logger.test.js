const Sentry = require("@sentry/node");
let capture;
let logger;
const { transports } = require("winston");

describe("capture", () => {
  afterEach(() => {
    delete process.env.SENTRY_DSN;
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test("does not throw without DSN", () => {
    jest.resetModules();
    const S = require("@sentry/node");
    capture = require("../src/lib/logger").capture;
    const spy = jest.spyOn(S, "captureException").mockImplementation(() => {});
    expect(() => capture(new Error("boom"))).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });

  test("forwards errors to Sentry when DSN is set", () => {
    process.env.SENTRY_DSN = "https://public@o0.ingest.sentry.io/0";
    jest.resetModules();
    const S = require("@sentry/node");
    const sentryInitSpy = jest.spyOn(S, "init").mockImplementation(() => {});
    capture = require("../src/lib/logger").capture;
    const spy = jest.spyOn(S, "captureException").mockImplementation(() => {});
    const err = new Error("boom");
    capture(err);
    expect(spy).toHaveBeenCalledWith(err);
    sentryInitSpy.mockRestore();
  });
});

describe("logger", () => {
  let transportSpy;
  let messages;

  beforeEach(() => {
    process.env.NODE_ENV = "test";
    jest.resetModules();
    logger = require("../../src/logger.js");
    messages = [];
    const consoleTransport = logger.transports.find(
      (t) => t instanceof transports.Console,
    );
    expect(consoleTransport).toBeDefined();
    transportSpy = jest
      .spyOn(consoleTransport, "log")
      .mockImplementation((info, next) => {
        messages.push(info.message);
        if (next) next();
      });
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
    transportSpy.mockRestore();
    jest.restoreAllMocks();
  });

  test("logs info, warn and error", () => {
    logger.info("info msg");
    logger.warn("warn msg");
    logger.error("error msg");

    expect(messages.join(" ")).toContain("info msg");
    expect(messages.join(" ")).toContain("warn msg");
    expect(messages.join(" ")).toContain("error msg");
  });
});

test("logger is silent in test env", () => {
  process.env.NODE_ENV = "test";
  jest.resetModules();
  logger = require("../../src/logger.js");
  const consoleTransport = logger.transports.find(
    (t) => t instanceof transports.Console,
  );
  expect(logger.level).toBe("error");
  expect(consoleTransport.silent).toBe(true);
  delete process.env.NODE_ENV;
});

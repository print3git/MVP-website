jest.mock("@sentry/node", () => ({
  captureException: jest.fn(),
  init: jest.fn(),
}));
const Sentry = require("@sentry/node");
const { capture } = require("../src/lib/logger");
const logger = require("../src/logger").default || require("../src/logger");
const { transports } = require("winston");

describe("capture", () => {
  afterEach(() => {
    delete process.env.SENTRY_DSN;
    jest.restoreAllMocks();
  });

  test("does not throw without DSN", () => {
    expect(() => capture(new Error("boom"))).not.toThrow();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  test("forwards errors to Sentry when DSN is set", () => {
    process.env.SENTRY_DSN = "http://public@localhost:123/1";
    jest.resetModules();
    jest.mock("@sentry/node", () => ({
      captureException: jest.fn(),
      init: jest.fn(),
    }));
    const { capture: captureWithDsn } = require("../src/lib/logger");
    const err = new Error("boom");
    captureWithDsn(err);
    expect(Sentry.captureException).toHaveBeenCalledWith(err);
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
    delete process.env.LOG_LEVEL;
    jest.resetModules();
  });

  test("logs info, warn and error", () => {
    process.env.LOG_LEVEL = "info";
    jest.resetModules();
    const log = require("../src/logger").default || require("../src/logger");
    log.info("info msg");
    log.warn("warn msg");
    log.error("error msg");

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
  const log = require("../src/logger").default || require("../src/logger");
  const consoleTransport = log.transports.find(
    (t) => t instanceof transports.Console,
  );
  expect(log.level).toBe("error");
  expect(consoleTransport.silent).toBe(true);
});

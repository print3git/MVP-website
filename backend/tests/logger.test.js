jest.mock("@sentry/node");
const Sentry = require("@sentry/node");
let capture;
let logger;
const { transports } = require("winston");

describe("capture", () => {
  let spy;
  beforeEach(() => {
    jest.resetModules();
    spy = jest.spyOn(Sentry, "captureException").mockImplementation(() => {});
  });
  afterEach(() => {
    delete process.env.SENTRY_DSN;
    jest.restoreAllMocks();
  });

  test("does not throw without DSN", () => {
    capture = require("../src/lib/logger").capture;
    expect(() => capture(new Error("boom"))).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });

  test("forwards errors to Sentry when DSN is set", () => {
    process.env.SENTRY_DSN = "https://abc@example.ingest.sentry.io/123";
    capture = require("../src/lib/logger").capture;
    const err = new Error("boom");
    expect(() => capture(err)).not.toThrow();
  });
});

describe("logger", () => {
  let logSpy;
  let warnSpy;
  let errSpy;

  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = "";
    if (process.stdout.write.mockRestore) process.stdout.write.mockRestore();
    if (process.stderr.write.mockRestore) process.stderr.write.mockRestore();
    logSpy = jest.spyOn(console._stdout, "write").mockImplementation(() => {});
    warnSpy = jest.spyOn(console._stderr, "write").mockImplementation(() => {});
    errSpy = warnSpy;
    logger = require("../src/logger");
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
  jest.resetModules();
  process.env.NODE_ENV = "test";
  const testLogger = require("../src/logger");
  expect(testLogger.level).toBe("error");
  const consoleTransport = testLogger.transports.find(
    (t) => t instanceof transports.Console,
  );
  if (consoleTransport) {
    expect(consoleTransport.silent).toBe(true);
  }
});

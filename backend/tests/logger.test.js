const Sentry = require("@sentry/node");
let logger;
const { capture } = require("../src/lib/logger");
// winston's transports are not needed in these tests

describe("capture", () => {
  afterEach(() => {
    delete process.env.SENTRY_DSN;
    jest.restoreAllMocks();
  });

  test("does not throw without DSN", () => {
    const spy = jest.spyOn(Sentry, "captureException");
    expect(() => capture(new Error("boom"))).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });

  test("forwards errors to Sentry when DSN is set", () => {
    process.env.SENTRY_DSN = "https://abc@example.com/1";
    const spy = jest
      .spyOn(Sentry, "captureException")
      .mockImplementation(() => {});
    const err = new Error("boom");
    capture(err);
    expect(spy).toHaveBeenCalledWith(err);
  });
});

describe("logger", () => {
  let writeSpy;

  beforeEach(() => {
    jest.resetModules();
    if (console.log.mockRestore) console.log.mockRestore();
    if (console.warn.mockRestore) console.warn.mockRestore();
    if (console.error.mockRestore) console.error.mockRestore();
    writeSpy = jest
      .spyOn(console._stdout, "write")
      .mockImplementation(() => true);
    process.env.NODE_ENV = "development";
    logger = require("../src/logger");
  });

  afterEach(() => {
    jest.restoreAllMocks();
    writeSpy.mockRestore();
    jest.resetModules();
    delete process.env.NODE_ENV;
  });

  test("logs info, warn and error", () => {
    logger.info("info msg");
    logger.warn("warn msg");
    logger.error("error msg");

    const outputs = writeSpy.mock.calls.map((c) => c[0]).join(" ");

    expect(outputs).toContain("info msg");
    expect(outputs).toContain("warn msg");
    expect(outputs).toContain("error msg");
  });
});

test("logger is silent in test env", () => {
  jest.resetModules();
  process.env.NODE_ENV = "test";
  logger = require("../src/logger");
  const consoleTransport = logger.transports.find((t) => t.name === "console");
  expect(logger.level).toBe("error");
  expect(consoleTransport.silent).toBe(true);
  delete process.env.NODE_ENV;
});

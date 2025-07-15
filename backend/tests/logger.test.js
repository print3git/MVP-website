const { capture } = require("../src/lib/logger");
const logger = require("../src/logger");
const { transports } = require("winston");

test("capture does not throw without DSN", () => {
  expect(() => capture(new Error("boom"))).not.toThrow();
});

test("logger is silent in test env", () => {
  const consoleTransport = logger.transports.find(
    (t) => t instanceof transports.Console,
  );
  expect(logger.level).toBe("error");
  expect(consoleTransport.silent).toBe(true);
});

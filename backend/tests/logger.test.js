const { capture } = require("../src/lib/logger");

test("capture does not throw without DSN", () => {
  expect(() => capture(new Error("boom"))).not.toThrow();
});

const { env } = require("../scripts/run-smoke.js");

test("run-smoke sets SKIP_DB_CHECK=1 by default", () => {
  expect(env.SKIP_DB_CHECK).toBe("1");
});

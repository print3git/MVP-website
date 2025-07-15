process.env.CLOUDFRONT_MODEL_DOMAIN = "cdn.test";
const app = require("../server");

test("server exports express app", () => {
  expect(typeof app).toBe("function");
  expect(typeof app.use).toBe("function");
});

process.env.STRIPE_TEST_KEY = "test";
const app = require("../src/app");

describe("discountCodes", () => {
  it("should load without error", () => {
    expect(app).toBeTruthy();
  });
});

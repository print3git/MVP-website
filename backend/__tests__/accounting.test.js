process.env.STRIPE_TEST_KEY = "test";
const app = require("../src/app");

describe("accounting", () => {
  it("should load without error", () => {
    expect(app).toBeTruthy();
  });
});

describe("aws credentials", () => {
  test("dummy credentials are set by setupGlobals", () => {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      require("./setupGlobals.js");
    }
    expect(process.env.AWS_ACCESS_KEY_ID).toBeDefined();
    expect(process.env.AWS_SECRET_ACCESS_KEY).toBeDefined();
  });
});

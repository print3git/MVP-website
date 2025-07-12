const axios = require("axios");

describe("network guard", () => {
  test("external requests are blocked", async () => {
    await expect(axios.get("https://example.com")).rejects.toThrow(
      "Nock: Disallowed net connect",
    );
  });
});

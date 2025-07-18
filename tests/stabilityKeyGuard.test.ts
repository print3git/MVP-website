const { textToImage } = require("../backend/src/lib/textToImage.js");

describe("STABILITY_KEY guard", () => {
  const original = process.env.STABILITY_KEY;
  afterEach(() => {
    if (original === undefined) {
      delete process.env.STABILITY_KEY;
    } else {
      process.env.STABILITY_KEY = original;
    }
  });

  test("throws when STABILITY_KEY is not set", async () => {
    delete process.env.STABILITY_KEY;
    await expect(textToImage("hello")).rejects.toThrow(
      "STABILITY_KEY is not set",
    );
  });
});

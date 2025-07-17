const { generateModel } = require("../backend/src/pipeline/generateModel.js");

describe("generateModel no args", () => {
  for (let i = 0; i < 200; i++) {
    test(`missing ${i}`, async () => {
      await expect(generateModel()).rejects.toThrow();
    });
  }
});

describe("generateModel missing endpoint", () => {
  for (let i = 0; i < 200; i++) {
    test(`missing endpoint ${i}`, async () => {
      delete process.env.SPARC3D_ENDPOINT;
      delete process.env.SPARC3D_TOKEN;
      await expect(
        generateModel({ prompt: "p", image: "http://img" }),
      ).rejects.toThrow("SPARC3D_ENDPOINT is not set");
    });
  }
});

describe("generateModel missing token", () => {
  for (let i = 0; i < 100; i++) {
    test(`missing token ${i}`, async () => {
      process.env.SPARC3D_ENDPOINT = "http://example.com";
      delete process.env.SPARC3D_TOKEN;
      await expect(
        generateModel({ prompt: "p", image: "http://img" }),
      ).rejects.toThrow("SPARC3D_TOKEN is not set");
    });
  }
});

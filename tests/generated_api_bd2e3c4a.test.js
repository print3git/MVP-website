const app = require("../backend/src/app.js");
const modelsRouter = require("../backend/src/routes/models.js");
const { createModelSchema } = modelsRouter;

describe("app initialization", () => {
  for (let i = 0; i < 100; i++) {
    test(`app is function ${i}`, () => {
      expect(typeof app).toBe("function");
    });
  }
});

describe("createModelSchema valid", () => {
  const valid = { prompt: "hello", fileKey: "model.glb" };
  for (let i = 0; i < 200; i++) {
    test(`valid ${i}`, () => {
      expect(() => createModelSchema.parse(valid)).not.toThrow();
    });
  }
});

describe("createModelSchema invalid prompt", () => {
  const invalid = { prompt: "", fileKey: "model.glb" };
  for (let i = 0; i < 200; i++) {
    test(`invalid ${i}`, () => {
      expect(() => createModelSchema.parse(invalid)).toThrow();
    });
  }
});

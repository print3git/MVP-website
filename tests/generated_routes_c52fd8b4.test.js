const checkout = require("../backend/src/routes/checkout.js");
const modelsRouter = require("../backend/src/routes/models.js");
const { createModelSchema } = modelsRouter;

describe("orders map empty", () => {
  for (let i = 0; i < 200; i++) {
    test(`empty ${i}`, () => {
      checkout.orders.clear();
      expect(checkout.orders.size).toBe(0);
    });
  }
});

describe("orders map set/get", () => {
  for (let i = 0; i < 200; i++) {
    test(`set ${i}`, () => {
      checkout.orders.clear();
      checkout.orders.set("id" + i, { slug: "s" + i, email: "e" + i });
      expect(checkout.orders.get("id" + i).slug).toBe("s" + i);
    });
  }
});

describe("createModelSchema", () => {
  const valid = { prompt: "hello", fileKey: "file.glb" };
  for (let i = 0; i < 100; i++) {
    test(`valid ${i}`, () => {
      expect(() => createModelSchema.parse(valid)).not.toThrow();
    });
  }
});

const router = require("../routes/models");
const { z } = require("zod");

const schema = router.createModelSchema;

describe("createModelSchema", () => {
  test("accepts valid input", () => {
    const data = { prompt: "hello", fileKey: "foo.glb" };
    expect(schema.parse(data)).toEqual(data);
  });

  test("rejects empty prompt", () => {
    expect(() => schema.parse({ prompt: "", fileKey: "file" })).toThrow(
      z.ZodError,
    );
  });

  test("rejects invalid fileKey characters", () => {
    expect(() => schema.parse({ prompt: "ok", fileKey: "../evil" })).toThrow(
      z.ZodError,
    );
  });

  test("allows hyphen and underscore in fileKey", () => {
    const data = { prompt: "a", fileKey: "my-file_1.glb" };
    expect(schema.parse(data)).toEqual(data);
  });
});

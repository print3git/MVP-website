const router = require("../src/routes/models");
const { z } = require("zod");

const schema = router.createModelSchema;

describe("createModelSchema", () => {
  test("accepts valid input", () => {
    const data = { prompt: "hello", s3_key: "foo.glb" };
    expect(schema.parse(data)).toEqual(data);
  });

  test("rejects empty prompt", () => {
    expect(() => schema.parse({ prompt: "", s3_key: "file" })).toThrow(
      z.ZodError,
    );
  });

  test("rejects invalid s3_key characters", () => {
    expect(() => schema.parse({ prompt: "ok", s3_key: "../evil" })).toThrow(
      z.ZodError,
    );
  });

  test("allows hyphen and underscore in s3_key", () => {
    const data = { prompt: "a", s3_key: "my-file_1.glb" };
    expect(schema.parse(data)).toEqual(data);
  });
});

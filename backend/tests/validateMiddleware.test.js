const validate = require("../middleware/validate");
const { z } = require("zod");

describe("validate middleware", () => {
  const schema = z.object({ name: z.string().min(1) });

  test("calls next when valid", () => {
    const req = { body: { name: "ok" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    validate(schema)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test("responds 400 on invalid data", () => {
    const req = { body: { name: "" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    validate(schema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0]).toHaveProperty("error");
    expect(next).not.toHaveBeenCalled();
  });


  test("calls next on non-Zod errors", () => {
    const badSchema = {
      parse: () => {
        throw new Error("boom");

      },
    };
    const req = { body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    validate(badSchema)(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });

  test("handles null body as invalid", () => {
    const req = { body: null };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    validate(schema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});

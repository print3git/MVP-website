const { healthHandler } = require("../routes/healthz");

test("healthHandler responds with ok and version", () => {
  const json = jest.fn();
  const res = { json };
  healthHandler({}, res);
  expect(json).toHaveBeenCalledWith({ ok: true, version: expect.any(String) });
});

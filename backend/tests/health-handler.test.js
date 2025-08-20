const { healthHandler } = require("../routes/healthz");

test("healthHandler responds with status ok", () => {
  const setHeader = jest.fn();
  const end = jest.fn();
  const res = { setHeader, end, statusCode: 0 };
  healthHandler({}, res);
  expect(res.statusCode).toBe(200);
  expect(setHeader).toHaveBeenCalledWith("Content-Type", "application/json");
  expect(end).toHaveBeenCalledWith(JSON.stringify({ status: "ok" }));
});

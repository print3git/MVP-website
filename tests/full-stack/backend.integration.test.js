jest.mock("../../backend/db.js", () => ({
  query: jest.fn(),
}));

const db = require("../../backend/db.js");
const {
  healthHandler,
  readyHandler,
} = require("../../backend/routes/healthz.js");
const pkg = require("../../backend/package.json");

function createRes() {
  const res = {};
  res.statusCode = 200;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
}

describe("health routes", () => {
  test("healthHandler", () => {
    const res = createRes();
    healthHandler({}, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, version: pkg.version });
  });

  test("readyHandler success", async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = createRes();
    await readyHandler({}, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test("readyHandler failure", async () => {
    db.query.mockRejectedValueOnce(new Error("fail"));
    const res = createRes();
    await readyHandler({}, res);
    expect(res.statusCode).toBe(500);
    expect(res.body.ok).toBe(false);
  });
});

process.env.DB_URL = "postgres://user:pass@localhost/db";
process.env.INVENTORY_ALERT_EMAIL = "ops@example.com";

jest.mock("pg");
const { Client } = require("pg");
const mClient = { connect: jest.fn(), end: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

jest.mock("../mail", () => ({ sendMail: jest.fn() }));
const { sendMail } = require("../mail");

const run = require("../scripts/check-inventory");

beforeEach(() => {
  mClient.connect.mockClear();
  mClient.end.mockClear();
  mClient.query.mockClear();
  sendMail.mockClear();
});

test("sends alert when inventory low", async () => {
  mClient.query.mockResolvedValueOnce({
    rows: [{ name: "Hub", material: "filament", quantity: 5, threshold: 10 }],
  });
  await run();
  expect(sendMail).toHaveBeenCalledWith(
    "ops@example.com",
    "Low inventory alert",
    expect.stringContaining("Hub - filament: 5"),
  );
  expect(mClient.end).toHaveBeenCalled();
});

test("no alert when inventory sufficient", async () => {
  mClient.query.mockResolvedValueOnce({ rows: [] });
  await run();
  expect(sendMail).not.toHaveBeenCalled();
});

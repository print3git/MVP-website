process.env.DB_URL = "postgres://user:pass@localhost/db";
process.env.CAPACITY_WARNING_THRESHOLD = "0.5";
process.env.CAPACITY_ALERT_EMAIL = "ops@test.com";

jest.mock("pg");
const { Client } = require("pg");
const mClient = { connect: jest.fn(), end: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

jest.mock("../mail", () => ({ sendMail: jest.fn() }));
const { sendMail } = require("../mail");

const run = require("../scripts/check-capacity");

beforeEach(() => {
  mClient.connect.mockClear();
  mClient.end.mockClear();
  mClient.query.mockClear();
  sendMail.mockClear();
});

test("sends alert when demand exceeds capacity threshold", async () => {
  // orders query then printers query
  mClient.query
    .mockResolvedValueOnce({ rows: [{ product_type: "single", qty: "30" }] })
    .mockResolvedValueOnce({ rows: [{ count: "2" }] });
  await run();
  expect(sendMail).toHaveBeenCalled();
  expect(mClient.end).toHaveBeenCalled();
});

test("no alert when below threshold", async () => {
  mClient.query
    .mockResolvedValueOnce({ rows: [{ product_type: "single", qty: "1" }] })
    .mockResolvedValueOnce({ rows: [{ count: "5" }] });
  await run();
  expect(sendMail).not.toHaveBeenCalled();
});

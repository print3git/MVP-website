process.env.DB_URL = "postgres://user:pass@localhost/db";
process.env.PROCUREMENT_ALERT_EMAIL = "ops@example.com";

jest.mock("pg");
const { Client } = require("pg");
const mClient = { connect: jest.fn(), end: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

jest.mock("../mail", () => ({ sendMail: jest.fn() }));
const { sendMail } = require("../mail");

const run = require("../scripts/flag-overdue-procurement-orders");

beforeEach(() => {
  mClient.connect.mockClear();
  mClient.end.mockClear();
  mClient.query.mockClear();
  sendMail.mockClear();
});

test("sends alert for overdue orders", async () => {
  mClient.query
    .mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          hub_id: 2,
          vendor: "ACME",
          model: "MVP",
          quantity: 2,
          est_arrival_date: new Date("2024-01-01"),
        },
      ],
    })
    .mockResolvedValueOnce({});
  await run();
  expect(sendMail).toHaveBeenCalledWith(
    "ops@example.com",
    "Overdue printer delivery",
    expect.stringContaining("Order #1"),
  );
  expect(mClient.query).toHaveBeenCalledWith(
    "UPDATE procurement_orders SET flagged_overdue=TRUE WHERE id=$1",
    [1],
  );
});

test("does nothing when none overdue", async () => {
  mClient.query.mockResolvedValueOnce({ rows: [] });
  await run();
  expect(sendMail).not.toHaveBeenCalled();
});

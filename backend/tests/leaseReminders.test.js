process.env.DB_URL = "postgres://user:pass@localhost/db";

jest.mock("pg");
const { Client } = require("pg");
const mClient = { connect: jest.fn(), end: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

jest.mock("../mail", () => ({ sendTemplate: jest.fn() }));
const { sendTemplate } = require("../mail");

const run = require("../scripts/remind-lease-renewals");

beforeEach(() => {
  mClient.connect.mockClear();
  mClient.end.mockClear();
  mClient.query.mockClear();
  sendTemplate.mockClear();
});

test("sends reminders for expiring leases", async () => {
  mClient.query.mockResolvedValueOnce({
    rows: [{ founder_email: "a@a.com", end_date: new Date("2024-05-01") }],
  });
  await run();
  expect(sendTemplate).toHaveBeenCalledWith(
    "a@a.com",
    "Lease Renewal Reminder",
    "lease_renewal.txt",
    {
      end_date: "2024-05-01",
    },
  );
  expect(mClient.end).toHaveBeenCalled();
});

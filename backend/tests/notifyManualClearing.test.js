process.env.DB_URL = "postgres://user:pass@localhost/db";

jest.mock("pg");
const { Client } = require("pg");
const mClient = { connect: jest.fn(), end: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

jest.mock("../mail", () => ({ sendMail: jest.fn() }));
const { sendMail } = require("../mail");

const run = require("../scripts/notify-manual-clearing");

beforeEach(() => {
  mClient.connect.mockClear();
  mClient.end.mockClear();
  mClient.query.mockClear();
  sendMail.mockClear();
});

test("sends alert for printers needing clearing", async () => {
  mClient.query.mockResolvedValueOnce({
    rows: [{ serial: "p1", operator: "op@example.com", error: "needs clear" }],
  });
  await run();
  expect(sendMail).toHaveBeenCalledWith(
    "op@example.com",
    "Printer requires manual clearing",
    expect.stringContaining("p1"),
  );
  expect(mClient.end).toHaveBeenCalled();
});

test("no alert when no printers need clearing", async () => {
  mClient.query.mockResolvedValueOnce({ rows: [] });
  await run();
  expect(sendMail).not.toHaveBeenCalled();
});

process.env.DB_URL = "postgres://user:pass@localhost/db";
process.env.FOUNDER_EMAILS = "boss@test.com";

jest.mock("pg");
const { Client } = require("pg");
const mClient = { connect: jest.fn(), end: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

jest.mock("../mail", () => ({ sendMailWithAttachment: jest.fn() }));
const { sendMailWithAttachment } = require("../mail");

const run = require("../scripts/send-intel-report");

beforeEach(() => {
  mClient.connect.mockClear();
  mClient.end.mockClear();
  mClient.query.mockClear();
  sendMailWithAttachment.mockClear();
});

test("sends weekly report email", async () => {
  mClient.query
    .mockResolvedValueOnce({
      rows: [{ day: new Date(), revenue_cents: "100", cost_cents: "50" }],
    })
    .mockResolvedValueOnce({ rows: [{ day: new Date(), util: "0.8" }] });
  await run();
  expect(mClient.connect).toHaveBeenCalled();
  expect(sendMailWithAttachment).toHaveBeenCalled();
  expect(mClient.end).toHaveBeenCalled();
});

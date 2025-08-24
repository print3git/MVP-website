process.env.DB_URL = "postgres://user:pass@localhost/db";

jest.mock("pg");
const { Client } = require("pg");
const mClient = { connect: jest.fn(), end: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

jest.mock("../mail", () => ({ sendTemplate: jest.fn() }));
const { sendTemplate } = require("../mail");

jest.mock("../shipping", () => ({ getTrackingUrl: jest.fn(() => "url") }));
const { getTrackingUrl } = require("../shipping");

const run = require("../scripts/send-shipping-confirmations");

beforeEach(() => {
  mClient.connect.mockClear();
  mClient.end.mockClear();
  mClient.query.mockClear();
  sendTemplate.mockClear();
  getTrackingUrl.mockClear();
});

test("sends shipping confirmations", async () => {
  mClient.query.mockResolvedValueOnce({
    rows: [
      {
        session_id: "s1",
        tracking_number: "t1",
        carrier: "ups",
        email: "a@a.com",
        username: "alice",
      },
    ],
  });
  mClient.query.mockResolvedValueOnce({});
  await run();
  expect(getTrackingUrl).toHaveBeenCalledWith("ups", "t1");
  expect(sendTemplate).toHaveBeenCalledWith(
    "a@a.com",
    "Your order has shipped",
    "shipping_confirmation.txt",
    { username: "alice", order_id: "s1", tracking_url: "url" },
  );
  expect(mClient.query).toHaveBeenCalledWith(
    expect.stringContaining("UPDATE orders SET shipping_email_sent"),
    ["s1"],
  );
  expect(mClient.end).toHaveBeenCalled();
});

test("does nothing when none pending", async () => {
  mClient.query.mockResolvedValueOnce({ rows: [] });
  await run();
  expect(sendTemplate).not.toHaveBeenCalled();
  expect(mClient.end).toHaveBeenCalled();
});

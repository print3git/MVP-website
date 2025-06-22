process.env.DB_URL = "postgres://user:pass@localhost/db";

jest.mock("pg");
const { Client } = require("pg");
const mClient = { connect: jest.fn(), end: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

jest.mock("../mail", () => ({ sendTemplate: jest.fn() }));
const { sendTemplate } = require("../mail");

jest.mock("../discountCodes", () => ({
  createTimedCode: jest.fn().mockResolvedValue("DISC5"),
}));
const { createTimedCode } = require("../discountCodes");

const run = require("../scripts/send-abandoned-offers");

afterEach(() => {
  jest.clearAllMocks();
});

test("sends offers for abandoned checkouts", async () => {
  mClient.query.mockResolvedValueOnce({
    rows: [{ session_id: "s1", email: "a@a.com" }],
  });
  mClient.query.mockResolvedValueOnce({});
  await run();
  expect(createTimedCode).toHaveBeenCalledWith(500, 48);
  expect(sendTemplate).toHaveBeenCalledWith(
    "a@a.com",
    "Complete Your Purchase",
    "discount_offer.txt",
    { code: "DISC5" },
  );
  expect(mClient.query).toHaveBeenCalledWith(
    expect.stringContaining("UPDATE orders"),
    ["s1"],
  );
  expect(mClient.end).toHaveBeenCalled();
});

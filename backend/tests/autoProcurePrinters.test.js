process.env.DB_URL = "postgres://user:pass@localhost/db";
process.env.HUB_SATURATION_PURCHASE_THRESHOLD = "0.8";
process.env.HUB_SATURATION_DAYS = "3";
process.env.PRINTER_VENDOR_EMAIL = "vendor@example.com";

jest.mock("pg");
const { Client } = require("pg");
const mClient = { connect: jest.fn(), end: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

jest.mock("../procurement", () => ({ emailVendorApproval: jest.fn() }));
const { emailVendorApproval } = require("../procurement");

const run = require("../scripts/auto-procure-printers");

beforeEach(() => {
  mClient.connect.mockClear();
  mClient.end.mockClear();
  mClient.query.mockClear();
  emailVendorApproval.mockClear();
});

test("creates purchase order when saturation high", async () => {
  mClient.query
    .mockResolvedValueOnce({ rows: [{ hub_id: 1, avg_sat: "0.9" }] })
    .mockResolvedValueOnce({ rows: [{ name: "Hub", location: "US" }] })
    .mockResolvedValueOnce({});
  await run();
  expect(emailVendorApproval).toHaveBeenCalled();
  expect(mClient.query).toHaveBeenCalledTimes(3);
});

test("no order when saturation below threshold", async () => {
  mClient.query.mockResolvedValueOnce({
    rows: [{ hub_id: 1, avg_sat: "0.5" }],
  });
  await run();
  expect(emailVendorApproval).not.toHaveBeenCalled();
});

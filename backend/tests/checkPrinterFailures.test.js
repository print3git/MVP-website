process.env.DB_URL = "postgres://user:pass@localhost/db";

jest.mock("pg");
const { Client } = require("pg");
const mClient = { connect: jest.fn(), end: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

const run = require("../scripts/check-printer-failures");

test("logs alert when failure rate too high", async () => {
  mClient.query
    .mockResolvedValueOnce({ rows: [{ id: 1, serial: "p1" }] })
    .mockResolvedValueOnce({
      rows: [{ status: "error" }, { status: "printing" }],
    });
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  await run(0.4, 24);
  expect(mClient.connect).toHaveBeenCalled();
  expect(log).toHaveBeenCalledWith(expect.stringContaining("ALERT p1"));
  expect(mClient.end).toHaveBeenCalled();
  log.mockRestore();
});

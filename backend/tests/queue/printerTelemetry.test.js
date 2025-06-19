process.env.DB_URL = "postgres://user:pass@localhost/db";
process.env.PRINTER_URLS = "http://p";

jest.useFakeTimers();

jest.mock("pg");
const { Client } = require("pg");
const mClient = { connect: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

jest.mock("../../printers/octoprint", () => ({
  getPrinterInfo: jest.fn(),
}));
const { getPrinterInfo } = require("../../printers/octoprint");

const { pollPrinters } = require("../../queue/printerTelemetry");

beforeEach(() => {
  mClient.query.mockReset();
  getPrinterInfo.mockReset();
});

test("inserts utilization metrics", async () => {
  getPrinterInfo.mockResolvedValue({
    status: "printing",
    queueLength: 1,
    error: null,
  });
  mClient.query
    .mockResolvedValueOnce({ rows: [{ avg: 10 }] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ id: 1 }] })
    .mockResolvedValue({});

  await pollPrinters(mClient);

  expect(getPrinterInfo).toHaveBeenCalledWith("http://p", "");
  expect(mClient.query).toHaveBeenCalledWith(
    expect.stringContaining("INSERT INTO printer_metrics"),
    [1, "printing", 1, null, 1, 0, 10],
  );
});

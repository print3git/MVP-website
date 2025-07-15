process.env.DB_URL = "postgres://user:pass@localhost/db";
process.env.OPS_EMAILS = "ops@test.com";
process.env.OPS_REPORT_ARCHIVE = "/tmp";

jest.mock("pg");
const { Client } = require("pg");
const mClient = { connect: jest.fn(), end: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

jest.mock("../mail", () => ({ sendMailWithAttachment: jest.fn() }));
const { sendMailWithAttachment } = require("../mail");

jest.mock("pdfkit", () =>
  jest.fn().mockImplementation(() => {
    return {
      text: jest.fn().mockReturnThis(),
      fontSize: jest.fn().mockReturnThis(),
      moveDown: jest.fn().mockReturnThis(),
      pipe: jest.fn(),
      end: jest.fn(() => {
        if (global.__finish) global.__finish();
      }),
    };
  }),
);
const fs = require("fs");
const run = require("../scripts/send-ops-report");

describe("send ops report", () => {
  beforeEach(() => {
    mClient.connect.mockClear();
    mClient.end.mockClear();
    mClient.query.mockClear();
    sendMailWithAttachment.mockClear();
    global.__finish = undefined;
  });

  test("emails report and archives file", async () => {
    jest.spyOn(fs, "createWriteStream").mockReturnValue({
      on: (event, cb) => {
        if (event === "finish") global.__finish = cb;
        return this;
      },
    });
    mClient.query
      .mockResolvedValueOnce({ rows: [{ id: 1, name: "Hub", printers: "2" }] })
      .mockResolvedValueOnce({ rows: [{ status: "paid", count: "5" }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, errors: "4" }] });
    const copy = jest.spyOn(fs, "copyFileSync").mockImplementation(() => {});
    await run();
    expect(mClient.connect).toHaveBeenCalled();
    expect(sendMailWithAttachment).toHaveBeenCalled();
    expect(copy).toHaveBeenCalled();
    expect(mClient.end).toHaveBeenCalled();
    copy.mockRestore();
  });
});

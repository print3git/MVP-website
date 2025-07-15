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
    const doc = {
      text: jest.fn().mockReturnThis(),
      fontSize: jest.fn().mockReturnThis(),
      moveDown: jest.fn().mockReturnThis(),
      end: jest.fn(),
      pipe: jest.fn(),
    };
    return doc;
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
  });

  test("emails report and archives file", async () => {
    mClient.query
      .mockResolvedValueOnce({ rows: [{ id: 1, name: "Hub", printers: "2" }] })
      .mockResolvedValueOnce({ rows: [{ status: "paid", count: "5" }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, errors: "4" }] });
    const copy = jest.spyOn(fs, "copyFileSync").mockImplementation(() => {});
    jest.spyOn(fs, "createWriteStream").mockImplementation(() => ({
      on: (evt, cb) => {
        if (evt === "finish") cb();
      },
      once: () => {},
      emit: () => {},
      end: () => {},
      write: () => {},
    }));
    await run();
    expect(mClient.connect).toHaveBeenCalled();
    expect(sendMailWithAttachment).toHaveBeenCalled();
    expect(copy).toHaveBeenCalled();
    expect(mClient.end).toHaveBeenCalled();
    copy.mockRestore();
  });
});

process.env.DB_URL = "postgres://user:pass@localhost/db";

jest.mock("../../db", () => ({
  query: jest.fn().mockResolvedValue({}),
}));
const db = require("../../db");

const { enqueuePrint } = require("../../queue/dbPrintQueue");

test("enqueuePrint inserts print job", async () => {
  await enqueuePrint("j1", "o1", {}, 5, "/g.gcode");
  expect(db.query).toHaveBeenCalledWith(
    expect.stringContaining("INSERT INTO print_jobs"),
    ["j1", "o1", {}, 5, "/g.gcode"],
  );
});

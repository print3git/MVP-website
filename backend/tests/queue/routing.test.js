process.env.DB_URL = "postgres://user:pass@localhost/db";

jest.mock("pg");
const { Client } = require("pg");
const mClient = { connect: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

const { selectHub } = require("../../utils/routing");

beforeEach(() => {
  mClient.query.mockReset();
});

test("selects hub matching shipping state", async () => {
  mClient.query
    .mockResolvedValueOnce({
      rows: [
        { id: 1, location: "CA" },
        { id: 2, location: "NY" },
      ],
    })
    .mockResolvedValueOnce({
      rows: [
        { id: 10, hub_id: 1 },
        { id: 11, hub_id: 2 },
      ],
    })
    .mockResolvedValueOnce({
      rows: [{ printer_id: 10, status: "idle", queue_length: 0 }],
    });
  const hub = await selectHub(mClient, { state: "CA" });
  expect(hub.id).toBe(1);
});

test("overflows to secondary hub when queue high", async () => {
  mClient.query
    .mockResolvedValueOnce({
      rows: [
        { id: 1, location: "CA" },
        { id: 2, location: "NY" },
      ],
    })
    .mockResolvedValueOnce({
      rows: [
        { id: 10, hub_id: 1 },
        { id: 11, hub_id: 2 },
      ],
    })
    .mockResolvedValueOnce({
      rows: [
        { printer_id: 10, status: "idle", queue_length: 10 },
        { printer_id: 11, status: "idle", queue_length: 0 },
      ],
    });
  const hub = await selectHub(mClient, { state: "CA" });
  expect(hub.id).toBe(2);
});

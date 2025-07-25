process.env.DB_URL = "postgres://user:pass@localhost/db";
process.env.PRINTER_URLS = "http://printer1,http://printer2";

jest.useFakeTimers();

// Some CI environments occasionally fail this worker test, so retry a few times
const retry = require("jest-retries");

jest.mock("pg");
const { Client } = require("pg");
const mClient = { connect: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

jest.mock("axios");
const axios = require("axios");

jest.mock("../../printers/octoprint", () => ({
  getPrinterStatus: jest.fn().mockResolvedValue("idle"),
}));

const { processNextJob } = require("../../queue/printWorker");

beforeEach(() => {
  mClient.connect.mockReset();
  mClient.query.mockReset();
  mClient.query.mockResolvedValue({ rows: [] });
  axios.post.mockReset();
  require("../../printers/octoprint").getPrinterStatus.mockResolvedValue(
    "idle",
  );
});

retry("worker posts etch name to first available printer", 3, async () => {
  mClient.query
    .mockResolvedValueOnce({ rows: [{ job_id: "j1" }] })
    .mockResolvedValueOnce({
      rows: [
        { model_url: "m", shipping_info: { state: "CA" }, etch_name: "Name" },
      ],
    })
    .mockResolvedValueOnce({ rows: [{ id: 1, location: "CA" }] })
    .mockResolvedValueOnce({ rows: [{ id: 10, hub_id: 1 }] })
    .mockResolvedValueOnce({
      rows: [{ printer_id: 10, status: "idle", queue_length: 0 }],
    })
    .mockResolvedValueOnce({ rows: [{ serial: "http://printer1" }] })
    .mockResolvedValue({ rows: [] });
  axios.post.mockResolvedValue({});

  await processNextJob(mClient);

  expect(axios.post).toHaveBeenCalledWith("http://printer1", {
    modelUrl: "m",
    shipping: { state: "CA" },
    etchName: "Name",
  });
});

retry("retries a backup printer on failure", 3, async () => {
  mClient.query
    .mockResolvedValueOnce({ rows: [{ job_id: "j1" }] })
    .mockResolvedValueOnce({
      rows: [
        { model_url: "m", shipping_info: { state: "CA" }, etch_name: "Name" },
      ],
    })
    .mockResolvedValueOnce({ rows: [{ id: 1, location: "CA" }] })
    .mockResolvedValueOnce({ rows: [{ id: 10, hub_id: 1 }] })
    .mockResolvedValueOnce({
      rows: [{ printer_id: 10, status: "idle", queue_length: 0 }],
    })
    .mockResolvedValueOnce({ rows: [{ serial: "http://printer1" }] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ id: 11, hub_id: 1 }] })
    .mockResolvedValue({ rows: [] });
  axios.post.mockRejectedValueOnce(new Error("fail")).mockResolvedValueOnce({});

  await processNextJob(mClient);

  expect(axios.post).toHaveBeenNthCalledWith(1, "http://printer1", {
    modelUrl: "m",
    shipping: { state: "CA" },
    etchName: "Name",
  });
  expect(axios.post).toHaveBeenNthCalledWith(2, "http://printer2", {
    modelUrl: "m",
    shipping: { state: "CA" },
    etchName: "Name",
  });
});

retry("marks job failed when all printers fail", 3, async () => {
  mClient.query
    .mockResolvedValueOnce({ rows: [{ job_id: "j1" }] })
    .mockResolvedValueOnce({
      rows: [
        { model_url: "m", shipping_info: { state: "CA" }, etch_name: "Name" },
      ],
    })
    .mockResolvedValueOnce({ rows: [{ id: 1, location: "CA" }] })
    .mockResolvedValueOnce({ rows: [{ id: 10, hub_id: 1 }] })
    .mockResolvedValueOnce({
      rows: [{ printer_id: 10, status: "idle", queue_length: 0 }],
    })
    .mockResolvedValueOnce({ rows: [{ serial: "http://printer1" }] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ id: 11, hub_id: 1 }] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValue({ rows: [] });
  axios.post.mockRejectedValue(new Error("fail"));

  await processNextJob(mClient);

  expect(axios.post).toHaveBeenCalledTimes(2);
  const call = mClient.query.mock.calls.find((c) =>
    c[0].includes("UPDATE jobs SET error"),
  );
  expect(call).toEqual([
    expect.stringContaining("UPDATE jobs SET error"),
    ["All printers failed", "j1"],
  ]);
});

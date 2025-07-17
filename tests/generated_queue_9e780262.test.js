const {
  enqueuePrint,
  _getQueue,
  progressEmitter,
} = require("../backend/queue/printQueue.js");

jest.mock("../backend/db", () => ({
  query: jest.fn().mockResolvedValue({}),
}));
const db = require("../backend/db");
const jobQueue = require("../backend/queue/jobQueue.js");

jest.spyOn(jobQueue, "getNextPendingJob");
jest.spyOn(jobQueue, "updateJobStatus");

beforeEach(() => {
  _getQueue().length = 0;
  jest.useFakeTimers();
  jobQueue.getNextPendingJob.mockReset();
  jobQueue.updateJobStatus.mockReset();
  db.query.mockClear();
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.useRealTimers();
  delete global.fetch;
});

describe("dispatch print jobs", () => {
  for (let i = 0; i < 50; i++) {
    test(`enqueue job ${i}`, () => {
      enqueuePrint("j" + i);
      expect(_getQueue()[_getQueue().length - 1]).toBe("j" + i);
    });
  }

  for (let i = 0; i < 50; i++) {
    test(`progress events ${i}`, () => {
      const events = [];
      const handler = (e) => events.push(e.progress);
      progressEmitter.on("progress", handler);
      enqueuePrint("p" + i);
      jest.runAllTimers();
      progressEmitter.off("progress", handler);
      expect(events).toContain(100);
    });
  }
});

describe("jobQueue dispatch", () => {
  for (let i = 0; i < 50; i++) {
    test(`dispatches pending job ${i}`, async () => {
      jobQueue.getNextPendingJob.mockResolvedValue({
        job_id: "id" + i,
        webhook_url: "http://h",
      });
      global.fetch.mockResolvedValue({ ok: true });
      jobQueue.startProcessing(10);
      await jest.runOnlyPendingTimersAsync();
      await Promise.resolve();
      expect(jobQueue.updateJobStatus).toHaveBeenCalledWith("id" + i, "sent");
    });
  }

  for (let i = 0; i < 50; i++) {
    test(`no job ${i} leaves db untouched`, async () => {
      jobQueue.getNextPendingJob.mockResolvedValue(null);
      jobQueue.startProcessing(10);
      await jest.runOnlyPendingTimersAsync();
      await Promise.resolve();
      expect(jobQueue.updateJobStatus).not.toHaveBeenCalled();
    });
  }
});

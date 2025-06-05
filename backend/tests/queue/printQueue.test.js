const {
  enqueuePrint,
  processQueue,
  _getQueue,
} = require("../../queue/printQueue");

jest.useFakeTimers();
const intervalSpy = jest.spyOn(global, "setInterval");

afterEach(() => {
  _getQueue().length = 0;
});

test("enqueuePrint schedules processing", () => {
  enqueuePrint("job1");
  expect(intervalSpy).toHaveBeenCalled();
});

test("processQueue empties queue", () => {
  enqueuePrint("job1");
  jest.runAllTimers();
  expect(_getQueue().length).toBe(0);
});

test("progress reaches 100", () => {
  const { progressEmitter } = require("../../queue/printQueue");
  const events = [];
  const handler = (e) => events.push(e.progress);
  progressEmitter.on("progress", handler);
  enqueuePrint("job1");
  jest.runAllTimers();
  progressEmitter.off("progress", handler);
  expect(events).toContain(100);
});

test("queue processes multiple jobs sequentially", () => {
  const { progressEmitter } = require("../../queue/printQueue");
  const events = [];
  const handler = (e) => events.push(`${e.jobId}:${e.progress}`);
  progressEmitter.on("progress", handler);
  enqueuePrint("job1");
  enqueuePrint("job2");
  jest.runAllTimers();
  progressEmitter.off("progress", handler);
  expect(events.filter((v) => v.endsWith("100")).length).toBe(2);
  expect(_getQueue().length).toBe(0);
});

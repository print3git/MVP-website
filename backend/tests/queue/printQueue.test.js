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

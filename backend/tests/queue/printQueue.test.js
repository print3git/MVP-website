const {
  enqueuePrint,
  processQueue,
  _getQueue,
} = require("../../queue/printQueue");

jest.useFakeTimers();
const spy = jest.spyOn(global, "setTimeout");

afterEach(() => {
  _getQueue().length = 0;
});

test("enqueuePrint schedules processing", () => {
  enqueuePrint("job1");
  expect(spy).toHaveBeenCalled();
});

test("processQueue empties queue", () => {
  enqueuePrint("job1");
  jest.runAllTimers();
  expect(_getQueue().length).toBe(0);
});

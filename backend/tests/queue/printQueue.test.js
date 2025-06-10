// printQueue will be required fresh in each test to reset internal state

let intervalSpy;
let printQueue;

beforeEach(() => {
  jest.useFakeTimers();
  jest.resetModules();
  printQueue = require('../../queue/printQueue');
  intervalSpy = jest.spyOn(global, 'setInterval');
});

afterEach(() => {
  printQueue._getQueue().length = 0;
  intervalSpy.mockRestore();
});

test('enqueuePrint schedules processing', () => {
  printQueue.enqueuePrint('job1');
  expect(intervalSpy).toHaveBeenCalled();
});

test('processQueue empties queue', () => {
  printQueue.enqueuePrint('job1');
  jest.runAllTimers();
  expect(printQueue._getQueue().length).toBe(0);
});

test('progress reaches 100', () => {
  const { progressEmitter } = printQueue;
  const events = [];
  const handler = (e) => events.push(e.progress);
  progressEmitter.on('progress', handler);
  printQueue.enqueuePrint('job1');
  jest.runAllTimers();
  progressEmitter.off('progress', handler);
  expect(events).toContain(100);
});

test('queue processes multiple jobs sequentially', () => {
  const { progressEmitter } = printQueue;
  const events = [];
  const handler = (e) => events.push(`${e.jobId}:${e.progress}`);
  progressEmitter.on('progress', handler);
  printQueue.enqueuePrint('job1');
  printQueue.enqueuePrint('job2');
  jest.runAllTimers();
  progressEmitter.off('progress', handler);
  expect(events.filter((v) => v.endsWith('100')).length).toBe(2);
  expect(printQueue._getQueue().length).toBe(0);
});

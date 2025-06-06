jest.useFakeTimers();

jest.mock('../../db', () => ({
  query: jest.fn().mockResolvedValue({}),
}));
const db = require('../../db');

const queue = require('../../queue/jobQueue');

jest.spyOn(queue, 'getNextPendingJob');
jest.spyOn(queue, 'updateJobStatus');

beforeEach(() => {
  queue.getNextPendingJob.mockReset();
  queue.updateJobStatus.mockReset();
  db.query.mockClear();
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.clearAllTimers();
  delete global.fetch;
});

test('processes pending job and marks sent', async () => {
  queue.getNextPendingJob.mockResolvedValue({ job_id: 'j1', webhook_url: 'http://example.com' });
  global.fetch.mockResolvedValue({ ok: true });
  queue.startProcessing(1000);

  await jest.runOnlyPendingTimersAsync();
  await Promise.resolve();

  expect(queue.updateJobStatus).toHaveBeenCalledWith('j1', 'sent');
});

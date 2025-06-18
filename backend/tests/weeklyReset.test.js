process.env.DB_URL = 'postgres://user:pass@localhost/db';

jest.useFakeTimers().setSystemTime(new Date('2024-05-22T12:00:00Z'));

jest.mock('pg');
const { Client } = require('pg');
const mClient = { connect: jest.fn(), end: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

const reset = require('../scripts/weekly-reset');

beforeEach(() => {
  mClient.connect.mockClear();
  mClient.end.mockClear();
  mClient.query.mockClear();
});

test('inserts credits for active subscriptions', async () => {
  mClient.query.mockResolvedValueOnce({});
  await reset();
  const weekStr = '2024-05-19';
  expect(mClient.query).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO subscription_credits'),
    [weekStr]
  );
  expect(mClient.end).toHaveBeenCalled();
  jest.useRealTimers();
});

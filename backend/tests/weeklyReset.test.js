process.env.DB_URL = 'postgres://user:pass@localhost/db';

jest.mock('pg');
const { Client } = require('pg');
const mClient = { connect: jest.fn(), end: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

const run = require('../scripts/weekly-reset');

beforeEach(() => {
  mClient.connect.mockClear();
  mClient.end.mockClear();
  mClient.query.mockClear();
});

test('inserts weekly credits', async () => {
  mClient.query.mockResolvedValueOnce({});
  await run();
  expect(mClient.connect).toHaveBeenCalled();
  expect(mClient.query).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO subscription_credits'),
    [expect.any(String)]
  );
  expect(mClient.end).toHaveBeenCalled();
});

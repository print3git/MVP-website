process.env.DB_URL = 'postgres://user:pass@localhost/db';

jest.mock('pg');
const { Client } = require('pg');
const mClient = { connect: jest.fn(), end: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

const run = require('../scripts/cleanup-password-resets');

beforeEach(() => {
  mClient.connect.mockClear();
  mClient.end.mockClear();
  mClient.query.mockClear();
});

test('deletes expired password reset tokens', async () => {
  mClient.query.mockResolvedValueOnce({ rowCount: 2 });
  await run();
  expect(mClient.connect).toHaveBeenCalled();
  expect(mClient.query).toHaveBeenCalledWith(
    'DELETE FROM password_resets WHERE expires_at < NOW()'
  );
  expect(mClient.end).toHaveBeenCalled();
});

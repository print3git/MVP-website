process.env.DB_URL = 'postgres://user:pass@localhost/db';

jest.mock('pg');
const { Client } = require('pg');
const mClient = { connect: jest.fn(), end: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

const run = require('../scripts/generate-ops-report');

beforeEach(() => {
  mClient.connect.mockClear();
  mClient.end.mockClear();
  mClient.query.mockClear();
});

test('outputs hub and order summary', async () => {
  mClient.query
    .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Hub A', printers: '3' }] })
    .mockResolvedValueOnce({ rows: [{ status: 'paid', count: '5' }] });
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  await run();
  expect(mClient.connect).toHaveBeenCalled();
  expect(mClient.query).toHaveBeenNthCalledWith(1, expect.stringContaining('FROM printer_hubs'));
  expect(mClient.query).toHaveBeenNthCalledWith(2, expect.stringContaining('FROM orders'));
  expect(log).toHaveBeenCalledWith(expect.stringContaining('"hubs"'));
  expect(mClient.end).toHaveBeenCalled();
  log.mockRestore();
});

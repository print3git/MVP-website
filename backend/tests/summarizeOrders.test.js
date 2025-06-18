process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.PRINTER_HOURS_PER_ORDER = '2';
process.env.DAILY_CAPACITY_HOURS = '5';
process.env.CAPACITY_ALERT_EMAIL = 'ops@test.com';

jest.mock('pg');
const { Client } = require('pg');
const mClient = { connect: jest.fn(), end: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

jest.mock('../mail', () => ({ sendMail: jest.fn() }));
const { sendMail } = require('../mail');

const run = require('../scripts/summarize-orders');

beforeEach(() => {
  mClient.connect.mockClear();
  mClient.end.mockClear();
  mClient.query.mockClear();
  sendMail.mockClear();
});

test('inserts summary and sends alert when capacity exceeded', async () => {
  mClient.query.mockResolvedValueOnce({
    rows: [{ day: '2024-01-01', location: 'US', order_count: 3 }],
  });
  mClient.query.mockResolvedValueOnce({});
  await run();
  expect(mClient.connect).toHaveBeenCalled();
  expect(mClient.query).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO order_summaries'),
    ['2024-01-01', 'US', 3, 6]
  );
  expect(sendMail).toHaveBeenCalled();
  expect(mClient.end).toHaveBeenCalled();
});

test('no alert when under capacity', async () => {
  mClient.query.mockResolvedValueOnce({
    rows: [{ day: '2024-01-01', location: 'US', order_count: 1 }],
  });
  mClient.query.mockResolvedValueOnce({});
  await run();
  expect(sendMail).not.toHaveBeenCalled();
});

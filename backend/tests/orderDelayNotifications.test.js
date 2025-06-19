process.env.DB_URL = 'postgres://user:pass@localhost/db';

jest.mock('pg');
const { Client } = require('pg');
const mClient = { connect: jest.fn(), end: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

jest.mock('../mail', () => ({ sendTemplate: jest.fn() }));
const { sendTemplate } = require('../mail');

const run = require('../scripts/send-delay-notifications');

beforeEach(() => {
  mClient.connect.mockClear();
  mClient.end.mockClear();
  mClient.query.mockClear();
  sendTemplate.mockClear();
});

test('sends delay notices for overdue orders', async () => {
  mClient.query.mockResolvedValueOnce({ rows: [{ session_id: 's1', email: 'a@a.com', username: 'alice' }] });
  mClient.query.mockResolvedValueOnce({});
  await run();
  expect(sendTemplate).toHaveBeenCalledWith('a@a.com', 'Order Update', 'order_delay.txt', { username: 'alice', order_id: 's1' });
  expect(mClient.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE orders SET delay_notified'), ['s1']);
  expect(mClient.end).toHaveBeenCalled();
});

test('does nothing when no overdue orders', async () => {
  mClient.query.mockResolvedValueOnce({ rows: [] });
  await run();
  expect(sendTemplate).not.toHaveBeenCalled();
  expect(mClient.end).toHaveBeenCalled();
});

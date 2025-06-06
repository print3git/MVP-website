process.env.DB_URL = 'postgres://user:pass@localhost/db';

jest.mock('pg');
const { Client } = require('pg');
const mClient = { connect: jest.fn(), end: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

jest.mock('../mail', () => ({ sendMail: jest.fn() }));
const { sendMail } = require('../mail');

const run = require('../scripts/send-purchase-reminders');

beforeEach(() => {
  mClient.connect.mockClear();
  mClient.end.mockClear();
  mClient.query.mockClear();
  sendMail.mockClear();
});

test('sends reminders for unpaid models', async () => {
  mClient.query.mockResolvedValueOnce({ rows: [{ job_id: 'j1', email: 'a@a.com' }] });
  mClient.query.mockResolvedValueOnce({});
  await run();
  expect(sendMail).toHaveBeenCalledWith('a@a.com', 'Complete Your Purchase', expect.any(String));
  expect(mClient.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE jobs'), ['j1']);
  expect(mClient.end).toHaveBeenCalled();
});

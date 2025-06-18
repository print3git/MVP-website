process.env.DB_URL = 'postgres://user:pass@localhost/db';

jest.mock('pg');
const { Client } = require('pg');
const mClient = { connect: jest.fn(), end: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

jest.mock('../mail', () => ({ sendTemplate: jest.fn() }));
const { sendTemplate } = require('../mail');

const run = require('../scripts/send-printclub-reminders');

beforeEach(() => {
  mClient.connect.mockClear();
  mClient.end.mockClear();
  mClient.query.mockClear();
  sendTemplate.mockClear();
});

test('sends reminders when credits unused and near reset', async () => {
  jest.useFakeTimers().setSystemTime(new Date('2024-01-06T12:00:00Z'));
  mClient.query.mockResolvedValueOnce({ rows: [{ email: 'a@a.com', username: 'alice' }] });
  await run();

  expect(sendTemplate).toHaveBeenCalledWith('a@a.com', 'Print Club Reminder', 'reminder.txt', {
    username: 'alice',
  });
  expect(mClient.end).toHaveBeenCalled();
  jest.useRealTimers();
});

test('exits early when reset is far away', async () => {
  jest.useFakeTimers().setSystemTime(new Date('2024-01-02T12:00:00Z'));
  await run();
  expect(mClient.connect).not.toHaveBeenCalled();
  expect(sendTemplate).not.toHaveBeenCalled();
  jest.useRealTimers();
});

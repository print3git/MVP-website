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

test('sends reminders on Saturday when credits remain', async () => {
  const saturday = new Date('2024-06-01T12:00:00Z');
  mClient.query.mockResolvedValueOnce({ rows: [{ email: 'a@a.com', username: 'alice' }] });
  await run(saturday);
  expect(mClient.connect).toHaveBeenCalled();
  expect(sendTemplate).toHaveBeenCalledWith('a@a.com', 'Print Club Reminder', 'reminder.txt', {
    username: 'alice',
  });
  expect(mClient.end).toHaveBeenCalled();
});

test('does nothing on non-Saturday', async () => {
  const friday = new Date('2024-05-31T12:00:00Z');
  await run(friday);
  expect(mClient.connect).not.toHaveBeenCalled();
});

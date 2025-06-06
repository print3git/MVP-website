process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.HUNYUAN_API_KEY = 'test';
process.env.HUNYUAN_SERVER_URL = 'http://localhost:4000';
process.env.BASE_URL = 'http://app';

jest.mock('nodemailer');
const nodemailer = require('nodemailer');

jest.mock('nodemailer-sendgrid', () => () => ({}));

const sendMailMock = jest.fn();
nodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock });

jest.mock('../db', () => ({ query: jest.fn() }));
const db = require('../db');

const { sendMail } = require('../mail');

beforeEach(() => {
  sendMailMock.mockClear();
  db.query.mockClear();
});

test('sendMail appends unsubscribe link', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ token: 'tok1', unsubscribed: false }] });
  await sendMail('a@a.com', 'Sub', 'Body');
  expect(sendMailMock).toHaveBeenCalled();
  const mail = sendMailMock.mock.calls[0][0];
  expect(mail.text).toContain('Unsubscribe: http://app/api/unsubscribe?token=tok1');
});

test('sendMail skips unsubscribed', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ token: 'tok1', unsubscribed: true }] });
  await sendMail('a@a.com', 'Sub', 'Body');
  expect(sendMailMock).not.toHaveBeenCalled();
});

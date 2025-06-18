process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.SENDGRID_API_KEY = 'SG.test';

jest.mock('pg');
const { Client } = require('pg');
const mClient = { connect: jest.fn(), end: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

jest.mock('axios');
const axios = require('axios');

const sync = require('../scripts/sync-mailing-list');

beforeEach(() => {
  mClient.connect.mockClear();
  mClient.end.mockClear();
  mClient.query.mockClear();
  axios.put.mockClear();
});

test('syncs confirmed emails to SendGrid', async () => {
  mClient.query.mockResolvedValueOnce({ rows: [{ email: 'a@a.com' }] });
  await sync();
  expect(axios.put).toHaveBeenCalledWith(
    'https://api.sendgrid.com/v3/marketing/contacts',
    { contacts: [{ email: 'a@a.com' }] },
    expect.objectContaining({ headers: expect.any(Object) })
  );
  expect(mClient.end).toHaveBeenCalled();
});

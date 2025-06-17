process.env.DB_URL = 'postgres://user:pass@localhost/db';

jest.mock('pg');
const { Client } = require('pg');
const mClient = { connect: jest.fn(), end: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

jest.mock('../mail', () => ({ sendTemplate: jest.fn() }));
const { sendTemplate } = require('../mail');

const run = require('../scripts/send-post-purchase-followups');

beforeEach(() => {
  mClient.connect.mockClear();
  mClient.end.mockClear();
  mClient.query.mockClear();
  sendTemplate.mockClear();
});

test('sends follow ups for paid orders', async () => {
  mClient.query.mockResolvedValueOnce({
    rows: [{ session_id: 's1', job_id: 'j1', email: 'a@a.com', username: 'alice' }],
  });
  mClient.query.mockResolvedValueOnce({});
  await run();
  expect(sendTemplate).toHaveBeenCalledWith(
    'a@a.com',
    'Thanks for your order',
    'post_purchase_followup.txt',
    expect.objectContaining({ username: 'alice', reorder_url: expect.stringContaining('j1') })
  );
  expect(mClient.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE orders'), ['s1']);
  expect(mClient.end).toHaveBeenCalled();
});

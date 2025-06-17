
process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.PRINTER_API_URL = 'http://printer';

jest.useFakeTimers();

jest.mock('pg');
const { Client } = require('pg');
const mClient = { connect: jest.fn(), query: jest.fn() };
Client.mockImplementation(() => mClient);

jest.mock('axios');
const axios = require('axios');

const { run } = require('../../queue/printWorker');

beforeEach(() => {
  mClient.connect.mockReset();
  mClient.query.mockReset();
  axios.post.mockReset();
});

test('worker posts etch name to printer API', async () => {
  mClient.query
    .mockResolvedValueOnce({ rows: [{ job_id: 'j1' }] })
    .mockResolvedValueOnce({
      rows: [{ model_url: 'm', shipping_info: { a: 1 }, etch_name: 'Name' }],
    })
    .mockResolvedValueOnce({});
  axios.post.mockResolvedValue({});

  run(10);
  await jest.runOnlyPendingTimersAsync();
  await Promise.resolve();

  expect(axios.post).toHaveBeenCalledWith('http://printer', {
    modelUrl: 'm',
    shipping: { a: 1 },
    etchName: 'Name',

  });
});

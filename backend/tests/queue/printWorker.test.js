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

test('worker posts G-code path to printer API', async () => {
  mClient.query
    .mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          job_id: 'j1',
          gcode_path: '/tmp/j1.gcode',
          api_url: 'http://printer',
          shipping_info: { a: 1 },
        },
      ],
    })
    .mockResolvedValueOnce({});
  axios.post.mockResolvedValue({});

  run(10);
  await jest.runOnlyPendingTimersAsync();
  await Promise.resolve();

  expect(axios.post).toHaveBeenCalledWith('http://printer', {
    gcodePath: '/tmp/j1.gcode',
    shipping: { a: 1 },
  });
});

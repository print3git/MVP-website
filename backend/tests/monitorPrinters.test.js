jest.mock('pg');
const { Client } = require('pg');
const axios = require('axios');
const monitorPrinters = require('../scripts/monitor-printers');

const mClient = { connect: jest.fn(), query: jest.fn(), end: jest.fn() };
Client.mockImplementation(() => mClient);
jest.mock('axios');

test('updates printer status', async () => {
  mClient.query
    .mockResolvedValueOnce({ rows: [{ id: 1, api_url: 'http://p' }] })
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({});
  axios.get.mockResolvedValue({ data: { status: 'idle' } });
  await monitorPrinters();
  expect(axios.get).toHaveBeenCalledWith('http://p/status');
});

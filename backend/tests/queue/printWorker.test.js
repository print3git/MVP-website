jest.useFakeTimers();

jest.mock('axios');
const axios = require('axios');

const mockClient = { connect: jest.fn(), query: jest.fn() };
jest.mock('pg', () => ({ Client: jest.fn(() => mockClient) }));
const { Client } = require('pg');

const { run } = require('../../queue/printWorker');

test('sends etchName in printer request', async () => {
  mockClient.connect.mockResolvedValue();
  mockClient.query
    .mockResolvedValueOnce({ rows: [{ job_id: 'j1' }] })
    .mockResolvedValueOnce({ rows: [{ model_url: 'm', shipping_info: { etchName: 'Bob' } }] })
    .mockResolvedValue({});
  axios.post.mockResolvedValue({});
  jest.spyOn(global, 'setInterval');
  run(1000);
  await jest.runOnlyPendingTimersAsync();
  await Promise.resolve();
  expect(axios.post).toHaveBeenCalledWith(expect.any(String), {
    modelUrl: 'm',
    shipping: { etchName: 'Bob' },
    etchName: 'Bob',
  });
});

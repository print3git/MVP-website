jest.mock('axios');
const axios = require('axios');
const { getPrinterStatus } = require('../../printers/octoprint');

test('returns printing when state text contains printing', async () => {
  axios.get.mockResolvedValue({ data: { state: { text: 'Printing' } } });
  const status = await getPrinterStatus('http://p', 'key');
  expect(axios.get).toHaveBeenCalledWith('http://p/api/printer', {
    headers: { 'X-Api-Key': 'key' },
    timeout: 5000,
  });
  expect(status).toBe('printing');
});

test('returns idle when operational', async () => {
  axios.get.mockResolvedValue({ data: { state: { text: 'Operational' } } });
  const status = await getPrinterStatus('http://p');
  expect(status).toBe('idle');
});

test('returns error on offline', async () => {
  axios.get.mockResolvedValue({ data: { state: { text: 'Error: offline' } } });
  const status = await getPrinterStatus('http://p');
  expect(status).toBe('error');
});

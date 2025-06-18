jest.mock('axios');
const axios = require('axios');
const { getPrinterStatus, getPrinterInfo } = require('../../printers/octoprint');

beforeEach(() => {
  axios.get.mockReset();
});

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

test('getPrinterInfo returns queue length', async () => {
  axios.get
    .mockResolvedValueOnce({ data: { state: { text: 'Printing' } } })
    .mockResolvedValueOnce({ data: { job: { file: { name: 'f.gcode' } } } });
  const info = await getPrinterInfo('http://p', 'k');
  expect(axios.get).toHaveBeenNthCalledWith(1, 'http://p/api/printer', {
    headers: { 'X-Api-Key': 'k' },
    timeout: 5000,
  });
  expect(axios.get).toHaveBeenNthCalledWith(2, 'http://p/api/job', {
    headers: { 'X-Api-Key': 'k' },
    timeout: 5000,
  });
  expect(info).toEqual({ status: 'printing', queueLength: 1, error: null });
});

jest.mock('axios');
const axios = require('axios');

jest.mock('form-data', () => {
  return jest.fn().mockImplementation(() => ({
    append: jest.fn(),
    getHeaders: jest.fn().mockReturnValue({}),
  }));
});
jest.mock('fs');
const fs = require('fs');
const FormData = require('form-data');
const { getPrinterStatus, uploadAndPrint } = require('../../printers/octoprint');


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


test('uploads gcode and starts print', async () => {
  fs.createReadStream.mockReturnValue('stream');
  axios.post.mockResolvedValue({});

  await uploadAndPrint('http://p', '/tmp/file.gcode', 'key');

  const form = FormData.mock.results[0].value;
  expect(form.append).toHaveBeenCalledWith('file', 'stream');
  expect(axios.post).toHaveBeenNthCalledWith(
    1,
    'http://p/api/files/local',
    expect.any(Object),
    expect.objectContaining({ headers: expect.any(Object) })
  );
  expect(axios.post).toHaveBeenNthCalledWith(
    2,
    'http://p/api/job',
    { command: 'select', print: true, file: 'local:file.gcode' },
    { headers: { 'X-Api-Key': 'key' } }
  );
});

jest.mock('axios');
const axios = require('axios');

jest.mock('../db', () => ({
  query: jest.fn(),
  updatePrinterStatus: jest.fn(),
}));
const db = require('../db');

const pollPrinters = require('../scripts/poll-printers');

test('pollPrinters updates printer status', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ id: 1, api_url: 'http://p1' }] });
  axios.get.mockResolvedValueOnce({ data: { state: { text: 'Operational' } } });

  await pollPrinters();

  expect(axios.get).toHaveBeenCalledWith('http://p1/api/printer');
  expect(db.updatePrinterStatus).toHaveBeenCalledWith(1, 'idle');
});

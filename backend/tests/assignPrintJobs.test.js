jest.mock('axios');
const axios = require('axios');

jest.mock('../db', () => ({
  getNextPendingPrintJob: jest.fn(),
  getIdlePrinters: jest.fn(),
  assignJobToPrinter: jest.fn(),
  updatePrinterStatus: jest.fn(),
}));
const db = require('../db');

const assignPrintJobs = require('../scripts/assign-print-jobs');

test('assigns job to idle printer', async () => {
  db.getNextPendingPrintJob.mockResolvedValueOnce({ id: 5, gcode_path: '/p.gcode' });
  db.getIdlePrinters.mockResolvedValueOnce([{ id: 2, api_url: 'http://p1' }]);
  axios.post.mockResolvedValueOnce({});

  await assignPrintJobs();

  expect(axios.post).toHaveBeenCalledWith('http://p1/print', { gcodePath: '/p.gcode' });
  expect(db.assignJobToPrinter).toHaveBeenCalledWith(5, 2);
  expect(db.updatePrinterStatus).toHaveBeenCalledWith(2, 'printing');
});

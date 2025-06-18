jest.mock('pg');
const { Client } = require('pg');
const assignJobs = require('../scripts/assign-print-jobs');

const mClient = { connect: jest.fn(), query: jest.fn(), end: jest.fn() };
Client.mockImplementation(() => mClient);

test('assigns pending job to idle printer', async () => {
  mClient.query
    .mockResolvedValueOnce({ rows: [{ id: 1 }] })
    .mockResolvedValueOnce({ rows: [{ id: 10 }] })
    .mockResolvedValueOnce({});
  await assignJobs();
  expect(mClient.query).toHaveBeenCalledWith(
    'UPDATE print_jobs SET printer_id=$1 WHERE id=$2',
    [1, 10]
  );
});

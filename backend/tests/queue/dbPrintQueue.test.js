const { enqueuePrint } = require('../../queue/dbPrintQueue');
jest.mock('../../db', () => ({
  query: jest.fn().mockResolvedValue({})
}));
const db = require('../../db');

test('enqueuePrint inserts print job', async () => {
  await enqueuePrint('j1', 'o1', {});
  expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO print_jobs'), [
    'j1',
    'o1',
    {},
  ]);
});

process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.HUNYUAN_API_KEY = 'test';

jest.mock('../db', () => ({
  listPrinterHubs: jest.fn(),
  getPrintersByHub: jest.fn(),
  getLatestPrinterMetrics: jest.fn(),
  getAverageJobCompletionSeconds: jest.fn(),
}));
const db = require('../db');

const request = require('supertest');
const app = require('../server');

describe('operations dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('requires admin token', async () => {
    const res = await request(app).get('/api/admin/operations');
    expect(res.status).toBe(401);
  });

  test('returns metrics by hub', async () => {
    db.listPrinterHubs.mockResolvedValueOnce([{ id: 1, name: 'Hub A' }]);
    db.getPrintersByHub.mockResolvedValueOnce([{ id: 2, serial: 'p1' }]);
    db.getLatestPrinterMetrics.mockResolvedValueOnce([
      { printer_id: 2, queue_length: 3, error: null },
    ]);
    db.getAverageJobCompletionSeconds.mockResolvedValueOnce(3600);
    const res = await request(app)
      .get('/api/admin/operations')
      .set('x-admin-token', 'admin');
    expect(res.status).toBe(200);
    expect(res.body.hubs[0].backlog).toBe(3);
    expect(res.body.hubs[0].dailyCapacity).toBe(24);
  });
});

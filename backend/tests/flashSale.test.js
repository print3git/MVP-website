process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.HUNYUAN_API_KEY = 'test';
process.env.HUNYUAN_SERVER_URL = 'http://localhost:4000';

jest.mock('../db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  insertCommission: jest.fn().mockResolvedValue({}),
}));
const db = require('../db');

const request = require('supertest');
const app = require('../server');

beforeEach(() => {
  db.query.mockClear();
});

test('GET /api/flash-sale returns sale', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
  const res = await request(app).get('/api/flash-sale');
  expect(res.status).toBe(200);
  expect(res.body.id).toBe(1);
});

test('GET /api/flash-sale 404 when none', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const res = await request(app).get('/api/flash-sale');
  expect(res.status).toBe(404);
});

test('POST /api/admin/flash-sale requires admin', async () => {
  const res = await request(app).post('/api/admin/flash-sale').send({});
  expect(res.status).toBe(401);
});

test('POST /api/admin/flash-sale creates sale', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ id: 2 }] });
  const body = {
    discount_percent: 5,
    product_type: 'single',
    start_time: '2024-01-01T00:00:00Z',
    end_time: '2024-01-02T00:00:00Z',
  };
  const res = await request(app)
    .post('/api/admin/flash-sale')
    .set('x-admin-token', 'admin')
    .send(body);
  expect(res.status).toBe(200);
  expect(db.query).toHaveBeenNthCalledWith(
    1,
    'UPDATE flash_sales SET active=FALSE WHERE active=TRUE'
  );
  expect(db.query).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO flash_sales'), [
    5,
    'single',
    new Date(body.start_time).toISOString(),
    new Date(body.end_time).toISOString(),
  ]);
});

test('DELETE /api/admin/flash-sale/:id ends sale', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ id: 3 }] });
  const res = await request(app).delete('/api/admin/flash-sale/3').set('x-admin-token', 'admin');
  expect(res.status).toBe(200);
  expect(db.query).toHaveBeenCalledWith(
    'UPDATE flash_sales SET active=FALSE WHERE id=$1 RETURNING *',
    ['3']
  );
});

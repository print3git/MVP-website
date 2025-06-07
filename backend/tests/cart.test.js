process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.HUNYUAN_API_KEY = 'test';
process.env.HUNYUAN_SERVER_URL = 'http://localhost:4000';

jest.mock('../db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  getCartItems: jest.fn().mockResolvedValue([]),
  addCartItem: jest.fn().mockResolvedValue({}),
  updateCartItem: jest.fn().mockResolvedValue({}),
  removeCartItem: jest.fn().mockResolvedValue({}),
}));
const db = require('../db');

const jwt = require('jsonwebtoken');

jest.mock('stripe');
const Stripe = require('stripe');
Stripe.mockImplementation(() => ({}));

const request = require('supertest');
const app = require('../server');

beforeEach(() => {
  db.query.mockClear();
  db.getCartItems.mockClear();
  db.addCartItem.mockClear();
  db.updateCartItem.mockClear();
  db.removeCartItem.mockClear();
});

function auth() {
  return `Bearer ${jwt.sign({ id: 'u1' }, 'secret')}`;
}

test('GET /api/cart returns items', async () => {
  db.getCartItems.mockResolvedValueOnce([{ id: 1 }]);
  const res = await request(app).get('/api/cart').set('authorization', auth());
  expect(res.status).toBe(200);
  expect(res.body[0].id).toBe(1);
});

test('POST /api/cart/items inserts item', async () => {
  db.addCartItem.mockResolvedValueOnce({ id: 2 });
  const res = await request(app)
    .post('/api/cart/items')
    .set('authorization', auth())
    .send({ jobId: 'j1', quantity: 2 });
  expect(res.status).toBe(201);
  expect(db.addCartItem).toHaveBeenCalledWith('u1', 'j1', 2);
});

test('PATCH /api/cart/items/:id updates quantity', async () => {
  db.updateCartItem.mockResolvedValueOnce({ id: 3, quantity: 5 });
  const res = await request(app)
    .patch('/api/cart/items/3')
    .set('authorization', auth())
    .send({ quantity: 5 });
  expect(res.status).toBe(200);
  expect(res.body.quantity).toBe(5);
});

test('DELETE /api/cart/items/:id removes item', async () => {
  db.removeCartItem.mockResolvedValueOnce({});
  const res = await request(app)
    .delete('/api/cart/items/4')
    .set('authorization', auth());
  expect(res.status).toBe(204);
});

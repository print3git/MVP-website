import request from 'supertest';
import express from 'express';
import createRouter from '../src/routes/stripe/create-checkout-session';
import webhookRouter from '../src/routes/stripe/webhook';

jest.mock('../src/db', () => ({ query: jest.fn().mockResolvedValue({}) }));
jest.mock('stripe');
const Stripe = require('stripe');
const stripeMock = {
  checkout: { sessions: { create: jest.fn().mockResolvedValue({ id: 'cs_1', url: 'https://stripe.test' }) } },
  webhooks: { constructEvent: jest.fn(() => ({ type: 'checkout.session.completed', data: { object: { id: 'cs_1', metadata: { jobId: 'j1' } } } })) },
};
Stripe.mockImplementation(() => stripeMock);

jest.mock('../src/queue/printQueue', () => ({ enqueuePrint: jest.fn() }));
jest.mock('../src/queue/dbPrintQueue', () => ({ enqueuePrint: jest.fn() }));

describe('stripe routes', () => {
  const app = express();
  app.use(express.json());
  app.use(createRouter);
  app.use(webhookRouter);

  test('create-checkout-session returns url', async () => {
    const res = await request(app).post('/api/create-checkout-session').send({ price: 100 });
    expect(res.body.url).toBe('https://stripe.test');
  });

  test('webhook bad sig', async () => {
    stripeMock.webhooks.constructEvent.mockImplementationOnce(() => { throw new Error('bad'); });
    const res = await request(app).post('/api/webhook/stripe').set('stripe-signature', 'sig').send('{}');
    expect(res.status).toBe(400);
  });
});

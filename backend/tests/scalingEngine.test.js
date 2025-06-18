process.env.REDDIT_ADS_API_URL = 'http://ads';
process.env.REDDIT_ADS_API_TOKEN = 't';
process.env.PROFIT_PER_SALE_CENTS = '500';

jest.mock('../db', () => ({
  query: jest.fn(),
  insertScalingEvent: jest.fn(),
}));
const db = require('../db');

jest.mock('axios');
const axios = require('axios');

const run = require('../scalingEngine');

beforeEach(() => {
  jest.clearAllMocks();
});

test('increases budget when CAC below threshold', async () => {
  axios.get.mockResolvedValueOnce({
    data: [{ subreddit: 'fun', campaign_id: '1', spend_cents: 100, budget_cents: 1000 }],
  });
  db.query.mockResolvedValueOnce({ rows: [{ count: '10' }] });
  axios.post.mockResolvedValue({});
  await run();
  expect(axios.post).toHaveBeenCalledWith(
    'http://ads/campaigns/1/budget',
    { budget_cents: 1100 },
    expect.any(Object)
  );
  expect(db.insertScalingEvent).toHaveBeenCalledWith('fun', 1000, 1100, 'increase');
});

test('pauses when CAC far above threshold', async () => {
  axios.get.mockResolvedValueOnce({
    data: [{ subreddit: 'fun', campaign_id: '1', spend_cents: 2000, budget_cents: 1000 }],
  });
  db.query.mockResolvedValueOnce({ rows: [{ count: '1' }] });
  axios.post.mockResolvedValue({});
  await run();
  expect(axios.post).toHaveBeenCalledWith('http://ads/campaigns/1/pause', null, expect.any(Object));
  expect(db.insertScalingEvent).toHaveBeenCalledWith('fun', 1000, 0, 'pause');
});

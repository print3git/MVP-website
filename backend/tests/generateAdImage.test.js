process.env.DB_URL = 'postgres://u:p@localhost/db';
process.env.STRIPE_SECRET_KEY = 'sk';
process.env.STRIPE_WEBHOOK_SECRET = 'wh';
process.env.HUNYUAN_API_KEY = 'key';
jest.mock('axios');
const axios = require('axios');
const generateAdImage = require('../scripts/generate-ad-image');

test('calls DALL-E server', async () => {
  axios.post.mockResolvedValue({ data: { image: 'img' } });
  const img = await generateAdImage('prompt');
  expect(img).toBe('img');
  expect(axios.post).toHaveBeenCalled();
});

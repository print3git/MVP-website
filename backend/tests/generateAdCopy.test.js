process.env.OPENAI_API_KEY = 'k';
jest.mock('axios');
const axios = require('axios');
const generateAdCopy = require('../scripts/generate-ad-copy');

test('calls OpenAI with subreddit prompt', async () => {
  axios.post.mockResolvedValue({ data: { choices: [{ text: 'Ad text' }] } });
  const result = await generateAdCopy('funny');
  expect(result).toBe('Ad text');
  expect(axios.post).toHaveBeenCalled();
});

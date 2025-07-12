const request = require('supertest');
const app = require('../../scripts/dev-server');

describe('dev server', () => {
  test('HEAD / responds with 200', async () => {
    await request(app).head('/').expect(200);
  });
});

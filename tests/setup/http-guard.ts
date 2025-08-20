import nock from 'nock';

nock.disableNetConnect();
nock.enableNetConnect((host) => host.includes('127.0.0.1') || host.includes('localhost'));

// Basic mock for stability.ai
nock('https://api.stability.ai')
  .persist()
  .post(/\/v2beta\/stable-image\/generate\/core/)
  .reply(200, { id: 'mock', image_url: 'https://example.com/fake.png' });

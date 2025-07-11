const nock = require('nock');
const { generateGlb } = require('../src/lib/sparc3dClient.js');

describe('generateGlb', () => {
  const endpoint = 'https://api.example.com/generate';
  const token = 't0k';

  beforeEach(() => {
    process.env.SPARC3D_ENDPOINT = endpoint;
    process.env.SPARC3D_TOKEN = token;
    delete process.env.http_proxy;
    delete process.env.https_proxy;
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test('sends prompt and returns buffer', async () => {
    const data = Buffer.from('glbdata');
    nock('https://api.example.com')
      .post('/generate', { prompt: 'hello' })
      .matchHeader('Authorization', `Bearer ${token}`)
      .reply(200, data, { 'Content-Type': 'model/gltf-binary' });

    const buf = await generateGlb({ prompt: 'hello' });
    expect(buf).toEqual(data);
  });

  test('sends prompt and imageURL', async () => {
    const data = Buffer.from('xyz');
    nock('https://api.example.com')
      .post('/generate', { prompt: 'p', imageURL: 'http://img' })
      .matchHeader('Authorization', `Bearer ${token}`)
      .reply(200, data, { 'Content-Type': 'model/gltf-binary' });

    const buf = await generateGlb({ prompt: 'p', imageURL: 'http://img' });
    expect(buf).toEqual(data);
  });

  test('throws on http error', async () => {
    nock('https://api.example.com')
      .post('/generate')
      .reply(400, { error: 'bad' });

    await expect(generateGlb({ prompt: 'x' })).rejects.toThrow('bad');
  });
});

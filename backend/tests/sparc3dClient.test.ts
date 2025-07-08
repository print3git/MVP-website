const nock = require('nock');
const { generateGlb } = require('../src/lib/sparc3dClient.js');

const endpoint = 'http://sparc.test';
const path = '/';
const token = 'secret';

describe('generateGlb', () => {
  beforeEach(() => {
    process.env.http_proxy = '';
    process.env.HTTP_PROXY = '';
    process.env.https_proxy = '';
    process.env.HTTPS_PROXY = '';
    process.env.SPARC3D_ENDPOINT = endpoint + path;
    process.env.SPARC3D_TOKEN = token;
  });

  afterEach(() => {
    delete process.env.SPARC3D_ENDPOINT;
    delete process.env.SPARC3D_TOKEN;
    nock.cleanAll();
  });

  test('sends prompt and image and returns buffer', async () => {
    const reply = Buffer.from('data');
    const scope = nock(endpoint)
      .post(path, { prompt: 'tree', image_url: 'img' })
      .matchHeader('authorization', `Bearer ${token}`)
      .reply(200, reply, { 'Content-Type': 'model/gltf-binary' });

    const buf = await generateGlb({ prompt: 'tree', imageURL: 'img' });
    expect(buf.equals(reply)).toBe(true);
    scope.done();
  });

  test('throws on http error', async () => {
    const scope = nock(endpoint)
      .post(path, { prompt: 'bad' })
      .matchHeader('authorization', `Bearer ${token}`)
      .reply(400, { error: 'invalid prompt' });

    await expect(generateGlb({ prompt: 'bad' })).rejects.toThrow(/status 400/);
    scope.done();
  });
});

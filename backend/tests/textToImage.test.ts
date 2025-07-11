const nock = require('nock');
const { textToImage } = require('../src/lib/textToImage.js');
const s3 = require('../src/lib/uploadS3.js');

describe('textToImage', () => {
  const endpoint = 'https://api.stability.ai';
  const token = 'abc';

  beforeEach(() => {
    process.env.STABILITY_KEY = token;
    process.env.AWS_REGION = 'us-east-1';
    process.env.S3_BUCKET = 'bucket';
    process.env.CLOUDFRONT_DOMAIN = 'cdn.test';
    delete process.env.http_proxy;
    delete process.env.https_proxy;
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
    nock.disableNetConnect();
    jest.spyOn(s3, 'uploadFile').mockResolvedValue('https://cdn.test/image.png');
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
    jest.restoreAllMocks();
  });

  test('uploads generated image and returns url', async () => {
    const png = Buffer.from('png');
    nock(endpoint)
      .post('/v2beta/stable-image/generate/core')
      .reply(200, png, { 'Content-Type': 'image/png' });
    const url = await textToImage('hello');
    expect(url).toBe('https://cdn.test/image.png');
    expect(s3.uploadFile).toHaveBeenCalledWith(expect.any(String), 'image/png');
  });
});

const { storeGlb } = require('../src/lib/storeGlb.js');
const aws = require('@aws-sdk/client-s3');

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(),
  PutObjectCommand: jest.fn(),
}));

describe('storeGlb', () => {
  beforeEach(() => {
    process.env.AWS_REGION = 'us-east-1';
    process.env.S3_BUCKET = 'bucket';
    process.env.CLOUDFRONT_DOMAIN = 'cdn';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('uploads buffer to s3 and returns url', async () => {
    const send = jest.fn().mockResolvedValue({});
    aws.S3Client.mockImplementation(() => ({ send }));
    const data = Buffer.from('glb');

    const url = await storeGlb(data);

    expect(aws.PutObjectCommand).toHaveBeenCalledWith({
      Bucket: 'bucket',
      Key: expect.stringMatching(/^models\/\d+-[a-z0-9]+\.glb$/),
      Body: data,
      ContentType: 'model/gltf-binary',
      ACL: 'public-read',
    });
    expect(url).toMatch(/^https:\/\/cdn\/models\/\d+-[a-z0-9]+\.glb$/);
    expect(send).toHaveBeenCalled();
  });
});

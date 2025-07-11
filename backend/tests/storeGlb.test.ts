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
    process.env.AWS_ACCESS_KEY_ID = 'id';
    process.env.AWS_SECRET_ACCESS_KEY = 'secret';
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
    expect(url).toMatch(
      /^https:\/\/bucket\.s3\.us-east-1\.amazonaws\.com\/models\/\d+-[a-z0-9]+\.glb$/,
    );
    expect(send).toHaveBeenCalled();
  });
});

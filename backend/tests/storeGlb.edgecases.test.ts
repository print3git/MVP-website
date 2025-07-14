const { storeGlb } = require('../src/lib/storeGlb.ts');
const aws = require('@aws-sdk/client-s3');

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(),
  PutObjectCommand: jest.fn(),
}));

describe('storeGlb edge cases', () => {
  const validData = Buffer.alloc(12);
  validData.write('glTF', 0);
  validData.writeUInt32LE(2, 4);
  validData.writeUInt32LE(12, 8);

  beforeEach(() => {
    process.env.AWS_REGION = 'us-east-1';
    process.env.S3_BUCKET = 'bucket';
    process.env.AWS_ACCESS_KEY_ID = 'id';
    process.env.AWS_SECRET_ACCESS_KEY = 'secret';
  });

  afterEach(() => {
    jest.resetAllMocks();
    delete process.env.S3_BUCKET;
  });

  test('throws when bucket env missing', async () => {
    delete process.env.S3_BUCKET;
    await expect(storeGlb(validData)).rejects.toThrow('S3_BUCKET is not set');
  });

  test('retries upload on network error', async () => {
    const send = jest
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('network'), { name: 'NetworkingError' }))
      .mockResolvedValue({});
    aws.S3Client.mockImplementation(() => ({ send }));

    const url = await storeGlb(validData, 2);

    expect(send).toHaveBeenCalledTimes(2);
    expect(url).toMatch(/^https:\/\/bucket\.s3\.us-east-1\.amazonaws\.com\/models\//);
  });

  test('rejects unsupported file extension', async () => {
    const bad = Buffer.from('xxxx');
    await expect(storeGlb(bad)).rejects.toThrow('Invalid GLB');
  });

  test('successful upload returns url', async () => {
    const send = jest.fn().mockResolvedValue({});
    aws.S3Client.mockImplementation(() => ({ send }));

    const url = await storeGlb(validData);

    expect(aws.PutObjectCommand).toHaveBeenCalledWith({
      Bucket: 'bucket',
      Key: expect.stringMatching(/^models\/\d+-[a-z0-9]+\.glb$/),
      Body: validData,
      ContentType: 'model/gltf-binary',
      ACL: 'public-read',
    });
    expect(url).toMatch(
      /^https:\/\/bucket\.s3\.us-east-1\.amazonaws\.com\/models\/\d+-[a-z0-9]+\.glb$/,
    );
  });
});

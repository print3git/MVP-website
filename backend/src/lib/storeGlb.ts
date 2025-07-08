import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * Upload GLB data to S3 and return its public CloudFront URL
 * @param data Buffer containing .glb bytes
 * @returns {Promise<string>} public URL of uploaded model
 */
export async function storeGlb(data: Buffer): Promise<string> {
  const region = process.env.AWS_REGION;
  const bucket = process.env.S3_BUCKET;
  const domain = process.env.CLOUDFRONT_DOMAIN || process.env.CLOUDFRONT_MODEL_DOMAIN;
  if (!region) throw new Error('AWS_REGION is not set');
  if (!bucket) throw new Error('S3_BUCKET is not set');
  if (!domain) throw new Error('CLOUDFRONT_DOMAIN is not set');
  const client = new S3Client({ region });
  const key = `models/${Date.now()}-${Math.random().toString(36).slice(2)}.glb`;
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: data, ContentType: 'model/gltf-binary' }),
  );
  return `https://${domain}/${key}`;
}

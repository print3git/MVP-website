import axios from 'axios';

/**
 * Generate a text prompt from an image URL using an external API.
 * @param imageURL URL of the image stored in S3
 * @returns caption text
 */
export async function imageToText(imageURL: string): Promise<string> {
  const endpoint = process.env.IMAGE2TEXT_ENDPOINT;
  const key = process.env.IMAGE2TEXT_KEY;
  if (!endpoint) throw new Error('IMAGE2TEXT_ENDPOINT is not set');
  const res = await axios.post(
    endpoint,
    { imageURL },
    {
      headers: key ? { Authorization: `Bearer ${key}` } : undefined,
      validateStatus: () => true,
    },
  );
  if (res.status >= 400) {
    const msg = res.data?.error || `request failed with status ${res.status}`;
    throw new Error(msg);
  }
  if (!res.data?.prompt) {
    throw new Error('invalid response from image2text');
  }
  return res.data.prompt as string;
}

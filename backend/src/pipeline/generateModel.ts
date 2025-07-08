import { textToImage } from '../lib/textToImage';
import { generateGlb } from '../lib/sparc3dClient';
import { storeGlb } from '../lib/storeGlb';

export interface GenerateModelParams {
  prompt: string;
  imageURL?: string;
}

/**
 * Generate a model from a prompt and optional image and upload to S3.
 * Returns the public URL of the stored .glb file.
 */
export async function generateModel({ prompt, imageURL }: GenerateModelParams): Promise<string> {
  console.time('pipeline');
  if (!imageURL) {
    imageURL = await textToImage(prompt);
  }
  const glbData = await generateGlb({ prompt, imageURL });
  const url = await storeGlb(glbData);
  console.timeEnd('pipeline');
  return url;
}

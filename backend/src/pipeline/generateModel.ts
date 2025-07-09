import { textToImage } from '../lib/textToImage';
import { imageToText } from '../lib/imageToText';
import { prepareImage } from '../lib/prepareImage';
import { generateGlb } from '../lib/sparc3dClient';
import { storeGlb } from '../lib/storeGlb';
import { capture } from '../lib/logger';

export interface GenerateModelParams {
  prompt?: string;
  image?: string;
}

/**
 * Generate a model from a prompt and optional image and upload to S3.
 * Returns the public URL of the stored .glb file.
 */
export async function generateModel({ prompt, image }: GenerateModelParams): Promise<string> {
  console.time('pipeline');

  let imageURL = image ? await prepareImage(image) : undefined;

  if (!prompt && imageURL) {
    prompt = await imageToText(imageURL);
  }
  if (!imageURL && prompt) {
    imageURL = await textToImage(prompt);
  }

  if (!prompt || !imageURL) {
    throw new Error('prompt or image required');
  }

  const glbData = await generateGlb({ prompt, imageURL });
  const url = await storeGlb(glbData);
  console.timeEnd('pipeline');
  return url;
}

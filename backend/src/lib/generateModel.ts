export interface GenerateInput {
  prompt?: string;
  image?: string | Buffer;
}

/**
 * Deterministically generate a model buffer from a prompt or image.
 * In test mode this is a simple stub that avoids external calls.
 */
export async function generateModel({
  prompt,
  image,
}: GenerateInput): Promise<Buffer> {
  if (!prompt && !image) {
    throw new Error("prompt or image required");
  }
  // Return a tiny deterministic buffer. Real implementation would call ML model.
  return Buffer.from("glb");
}

export default generateModel;

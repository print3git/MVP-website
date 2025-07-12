import axios from "axios";

export interface GenerateGlbParams {
  prompt: string;
  imageURL?: string;
}

/**
 * Generate a GLB model using the Sparc3D API.
 *
 * @param options - generation parameters
 * @param options.prompt - text prompt
 * @param options.imageURL - optional image URL
 * @returns raw .glb bytes as a Buffer
 */
export async function generateGlb({
  prompt,
  imageURL,
}: GenerateGlbParams): Promise<Buffer> {
  const endpoint = process.env.SPARC3D_ENDPOINT;
  const token = process.env.SPARC3D_TOKEN;
  if (!endpoint) {
    throw new Error("SPARC3D_ENDPOINT is not set");
  }
  if (!token) {
    throw new Error("SPARC3D_TOKEN is not set");
  }

  try {
    const res = await axios.post(
      endpoint,
      { prompt, ...(imageURL ? { imageURL } : {}) },
      {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "arraybuffer",
        validateStatus: () => true,
        proxy: false,
      },
    );

    if (res.status >= 400) {
      let errMsg = `SPARC3D request failed with status ${res.status}`;
      try {
        const json = JSON.parse(Buffer.from(res.data).toString("utf8"));
        if (json && json.error) errMsg = json.error;
      } catch {
        // ignore parse errors
      }
      throw new Error(errMsg);
    }

    return Buffer.from(res.data);
  } catch (err: any) {
    throw new Error(`SPARC3D request failed: ${err.message}`);
  }
}

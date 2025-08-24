#!/usr/bin/env node
console.log(
  `⚠️  If this fails, Codex should search:\n- \`backend/server.js\` route for \`/api/generate\`\n- \`generateModel()\` and \`sparc3dClient.ts\`\n- Check \`.env.example\` and validate-env.sh\n- Ensure Cloudflare secrets match\n`,
);

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

const required = [
  "SPARC3D_ENDPOINT",
  "HF_API_KEY",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "S3_BUCKET_NAME",
  "CLOUDFRONT_MODEL_DOMAIN",
];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
}

const placeholderDb = "postgres://user:password@localhost:5432/your_database";
if (process.env.SKIP_DB_CHECK || process.env.DB_URL === placeholderDb) {
  console.log("Skipping /api/generate test due to SKIP_DB_CHECK");
  process.exit(0);
}

async function main() {
  const form = new FormData();
  form.append("prompt", "diagnostic monkey");
  const samplePath = path.join(__dirname, "sample.png");
  if (fs.existsSync(samplePath)) {
    form.append("image", fs.createReadStream(samplePath));
  }

  try {
    const res = await axios.post("http://localhost:3000/api/generate", form, {
      headers: form.getHeaders(),
      validateStatus: () => true,
      maxBodyLength: Infinity,
    });
    console.log("POST /api/generate status", res.status, "body", res.data);
    if (res.status !== 200)
      throw new Error(`/api/generate returned ${res.status}`);
    const { glb_url } = res.data || {};
    const fallback =
      "https://modelviewer.dev/shared-assets/models/Astronaut.glb";
    if (!glb_url) throw new Error("glb_url missing");
    if (glb_url === fallback) throw new Error("glb_url is fallback");
    const head = await axios.head(glb_url, { validateStatus: () => true });
    console.log("HEAD", glb_url, head.status);
    if (head.status !== 200)
      throw new Error(`HEAD ${glb_url} returned ${head.status}`);
    console.log(`✅ All good – ${glb_url}`);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
}

main();

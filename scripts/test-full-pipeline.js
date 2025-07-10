#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const required = [
  'SPARC3D_ENDPOINT',
  'HF_API_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'S3_BUCKET_NAME',
  'CLOUDFRONT_MODEL_DOMAIN',
];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

async function main() {
  const form = new FormData();
  form.append('prompt', 'smoke test monkey');
  const samplePath = path.join(__dirname, 'sample.png');
  if (fs.existsSync(samplePath)) {
    form.append('image', fs.createReadStream(samplePath));
  }

  try {
    const { data } = await axios.post(
      'http://localhost:3000/api/generate',
      form,
      { headers: form.getHeaders(), maxBodyLength: Infinity }
    );
    console.log(JSON.stringify(data, null, 2));
    const fallback =
      'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
    if (data.glb_url && data.glb_url !== fallback) {
      console.log(`\u2705 Pipeline OK — glb_url: ${data.glb_url}`);
      process.exit(0);
    } else {
      console.log(`\u274c Pipeline FAILED — response: ${JSON.stringify(data)}`);
      process.exit(1);
    }
  } catch (err) {
    console.error('\u274c Pipeline FAILED — error:', err.message);
    if (err.response) console.error(err.response.data);
    process.exit(1);
  }
}

main();

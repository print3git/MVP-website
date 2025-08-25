#!/usr/bin/env node
console.log(
  `⚠️  If this fails, Codex should search:\n- route for \`/api/generate\`\n- \`generateModel()\` and \`sparc3dClient.ts\`\n- Check \`.env.example\` and validate-env.sh\n- Ensure Cloudflare secrets match\n`,
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
    console.error(`Missing env var: ${key}`);
    process.exit(1);
  }
}

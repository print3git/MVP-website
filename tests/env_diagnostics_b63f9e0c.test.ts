const fs = require("fs");
const https = require("https");

const skip = !process.env.CI;

function head(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "HEAD" }, (res) => {
      res.resume();
      resolve(res.statusCode || 0);
    });
    req.on("error", reject);
    req.end();
  });
}

const requiredVars = [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "DB_URL",
  "STRIPE_SECRET_KEY",
  "CLOUDFRONT_MODEL_DOMAIN",
  "HF_API_KEY",
];

async function validate() {
  const errors = [];
  for (const name of requiredVars) {
    const val = process.env[name];
    if (!val) {
      errors.push(`${name} is not set`);
      continue;
    }
    if (name === "DB_URL" && !/^postgres:\/\//.test(val)) {
      errors.push(`${name} must be a postgres URL`);
    } else if (name === "STRIPE_SECRET_KEY" && !/^sk_/.test(val)) {
      errors.push(`${name} must start with sk_`);
    } else if (name === "HF_API_KEY" && !/^hf_/.test(val)) {
      errors.push(`${name} must start with hf_`);
    } else if (name === "CLOUDFRONT_MODEL_DOMAIN") {
      const url = /^https?:\/\//.test(val) ? val : `https://${val}`;
      try {
        const status = await head(url);
        if (status >= 400) {
          errors.push(`${name} unreachable (${status}): ${url}`);
        }
      } catch (err) {
        errors.push(`${name} unreachable: ${err.message}`);
      }
    }
  }
  const bucket = process.env.S3_BUCKET || process.env.S3_BUCKET_NAME;
  if (bucket) {
    if (bucket.startsWith("/")) {
      if (!fs.existsSync(bucket)) {
        errors.push(`S3_BUCKET path not found: ${bucket}`);
      }
    } else {
      try {
        const url = `https://${bucket}.s3.amazonaws.com`;
        const status = await head(url);
        if (status >= 400 && status !== 403) {
          errors.push(`S3 bucket unreachable (${status}): ${bucket}`);
        }
      } catch (err) {
        errors.push(`S3 bucket unreachable: ${err.message}`);
      }
    }
  } else {
    errors.push("S3_BUCKET or S3_BUCKET_NAME is not set");
  }
  if (errors.length) {
    console.error("Environment diagnostics failed:\n" + errors.join("\n"));
    throw new Error(errors.join("; "));
  }
}

const testFn = skip ? it.skip : it;

testFn("env diagnostics", async () => {
  if (skip) {
    console.warn("Skipping env diagnostics test outside CI");
    return;
  }
  await validate();
});

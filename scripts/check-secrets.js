#!/usr/bin/env node

const required = [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_REGION",
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "S3_BUCKET",
  "DB_URL",
];

const missing = [];
for (const name of required) {
  const value = process.env[name];
  if (!value || String(value).trim() === "") {
    missing.push(name);
  }
}

// Handle alternate S3 bucket variable
if (missing.includes("S3_BUCKET")) {
  if (
    process.env.S3_BUCKET_NAME &&
    String(process.env.S3_BUCKET_NAME).trim() !== ""
  ) {
    missing.splice(missing.indexOf("S3_BUCKET"), 1);
  } else {
    missing[missing.indexOf("S3_BUCKET")] = "S3_BUCKET or S3_BUCKET_NAME";
  }
}

if (missing.length) {
  console.error("Missing required secrets:");
  for (const name of missing) {
    console.error(`- ${name}`);
  }
  process.exit(1);
}

console.log("All required secrets are set.");

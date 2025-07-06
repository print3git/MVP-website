#!/usr/bin/env node
require("dotenv").config();
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");
const FormData = require("form-data");
const { S3Client, HeadObjectCommand } = require("@aws-sdk/client-s3");
const { Client } = require("pg");

(async () => {
  const server = spawn("node", ["server.js"], {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
    env: process.env,
  });

  // wait for server to start
  await new Promise((r) => setTimeout(r, 3000));

  const form = new FormData();
  form.append(
    "model",
    fs.createReadStream(path.join(__dirname, "..", "..", "models", "bag.glb")),
  );

  const res = await fetch("http://localhost:3000/api/upload-model", {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  console.log("Upload response:", data);

  const s3 = new S3Client({ region: process.env.AWS_REGION });
  await s3.send(
    new HeadObjectCommand({ Bucket: process.env.S3_BUCKET, Key: data.key }),
  );
  console.log("File found in S3");

  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  const result = await client.query("SELECT * FROM models WHERE s3_key=$1", [
    data.key,
  ]);
  console.log("DB rows:", result.rowCount);
  await client.end();

  server.kill("SIGINT");
})();

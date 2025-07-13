const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

(async () => {
  console.log("▶️  Testing /api/generate…");
  const img = path.join(__dirname, "sample.png");
  if (!fs.existsSync(img)) fs.writeFileSync(img, Buffer.from("hi"));
  const form = new FormData();
  form.append("prompt", "blue cube");
  form.append("image", fs.createReadStream(img));
  const resp = await axios.post("http://localhost:3000/api/generate", form, {
    headers: form.getHeaders(),
    maxBodyLength: Infinity,
  });
  console.log("✔️  Response:", resp.data);
  if (!resp.data.glb_url || resp.data.glb_url.includes("fallback")) {
    throw new Error("Fallback still in use");
  }
})().catch((err) => {
  console.error("❌  Test failed:", err);
  process.exit(1);
});
// test generate script for smoke

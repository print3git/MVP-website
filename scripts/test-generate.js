import axios from "axios";

import fs from "fs";
import path from "path";

(async () => {
  console.log("▶️  Testing /api/generate…");
  const img = path.join(__dirname, "sample.png");
  if (!fs.existsSync(img)) fs.writeFileSync(img, Buffer.from("hi"));
  const resp = await axios.post("http://localhost:3000/api/generate", {
    prompt: "blue cube",
    image: img,
  });
  console.log("✔️  Response:", resp.data);
  if (!resp.data.glb_url || resp.data.glb_url.includes("fallback"))
    throw new Error("Fallback still in use");
})().catch((err) => {
  console.error("❌  Test failed:", err);
  process.exit(1);
});

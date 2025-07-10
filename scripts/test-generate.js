import axios from "axios";

(async () => {
  console.log("▶️  Testing /api/generate…");
  const resp = await axios.post("http://localhost:3000/api/generate", {
    prompt: "blue cube",
  });
  console.log("✔️  Response:", resp.data);
  if (!resp.data.glb_url || resp.data.glb_url.includes("fallback"))
    throw new Error("Fallback still in use");
})().catch((err) => {
  console.error("❌  Test failed:", err);
  process.exit(1);
});

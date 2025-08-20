const axios = require("axios");

(async () => {
  try {
    const base = process.env.SMOKE_BASE_URL || "http://localhost:3000";

    const health = await axios.get(`${base}/healthz`, {
      validateStatus: () => true,
    });
    if (health.status !== 200) throw new Error(`/healthz ${health.status}`);
    const healthy =
      (typeof health.data === "string" && health.data.trim() === "ok") ||
      (typeof health.data === "object" &&
        health.data &&
        health.data.ok === true);
    if (!healthy)
      throw new Error(`bad healthz body ${JSON.stringify(health.data)}`);

    const gen = await axios.post(
      `${base}/api/generate`,
      { prompt: "test" },
      { validateStatus: () => true },
    );
    if (gen.status !== 200) throw new Error(`/api/generate ${gen.status}`);
    if (typeof gen.data.glb_url !== "string")
      throw new Error(`bad generate body ${JSON.stringify(gen.data)}`);

    console.log("✅ server smoke passed");
  } catch (err) {
    console.error("❌ server smoke failed:", err.message);
    process.exit(1);
  }
})();

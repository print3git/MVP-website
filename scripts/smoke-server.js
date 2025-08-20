const axios = require("axios");

(async () => {
  try {
    const base = process.env.SMOKE_BASE_URL || "http://localhost:3000";

    const health = await axios.get(`${base}/healthz`, {
      validateStatus: () => true,
    });
    if (health.status !== 200) throw new Error(`/healthz ${health.status}`);
    const healthy =
      typeof health.data === "object" &&
      health.data &&
      (health.data.status === "ok" || health.data.ok === true);
    if (health.data && health.data.ok === true && health.data.status !== "ok") {
      console.warn(
        "/healthz { ok: true } is deprecated; prefer { status: 'ok' }",
      );
    }
    // TODO: remove legacy { ok: true } support after 2025-08-27
    if (!healthy)
      throw new Error(`bad healthz body ${JSON.stringify(health.data)}`);

    const ready = await axios.get(`${base}/readyz`, {
      validateStatus: () => true,
    });
    if (ready.status !== 200) throw new Error(`/readyz ${ready.status}`);
    if (!ready.data.ok)
      throw new Error(`bad readyz body ${JSON.stringify(ready.data)}`);

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

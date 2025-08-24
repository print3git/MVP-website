const axios = require("axios");

const timer = setTimeout(() => {
  console.error("❌ server smoke failed: timeout");
  process.exit(1);
}, 90_000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkHealth(base) {
  let last;
  for (let i = 0; i < 10; i++) {
    try {
      const res = await axios.get(`${base}/healthz`, {
        validateStatus: () => true,
      });
      const healthy =
        (typeof res.data === "string" && res.data.trim() === "ok") ||
        (typeof res.data === "object" && res.data && res.data.ok === true);
      if (res.status === 200 && healthy) return;
      last = res;
    } catch (err) {
      last = {
        status: err.response?.status || err.code || "ERR",
        data: err.response?.data || err.message,
      };
    }
    await sleep(500 + Math.random() * 500);
  }
  throw new Error(
    `/healthz status=${last?.status} body=${JSON.stringify(last?.data)}`,
  );
}

(async () => {
  try {
    const base = process.env.SMOKE_BASE_URL || "http://localhost:3000";

    await checkHealth(base);

    const ready = await axios.get(`${base}/readyz`, {
      validateStatus: () => true,
    });
    if (ready.status !== 200 || !ready.data?.ok)
      throw new Error(
        `/readyz status=${ready.status} body=${JSON.stringify(ready.data)}`,
      );

    const gen = await axios.post(
      `${base}/api/generate`,
      { prompt: "test" },
      { validateStatus: () => true },
    );
    if (gen.status !== 200 || typeof gen.data.glb_url !== "string")
      throw new Error(
        `/api/generate status=${gen.status} body=${JSON.stringify(gen.data)}`,
      );

    clearTimeout(timer);
    console.log("✅ server smoke passed");
  } catch (err) {
    console.error(`❌ server smoke failed: ${err.message}`);
    process.exit(1);
  }
})();

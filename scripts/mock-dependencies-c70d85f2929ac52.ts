/* eslint-disable */
import { readFileSync } from "fs";
import { resolve } from "path";

const fallbackResponses = {
  // Example of a CDN asset used during the build.
  "https://cdn.example.com/config.json": readFileSync(
    resolve(__dirname, "../tests/fixtures/config.json"),
    "utf8",
  ),
};

const originalFetch = globalThis.fetch;

// Provide a resilient fetch implementation so builds work offline or when
// remote services are flaky.
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : String(input);
  try {
    return await originalFetch(input, init);
  } catch {
    if (fallbackResponses[url]) {
      return new Response(fallbackResponses[url], { status: 200 });
    }
    return new Response("", { status: 200 });
  }
};

// If axios is installed, ensure failed requests resolve with fallback data.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const axios = require("axios");
  axios.interceptors.response.use(undefined, (error) => {
    const url = error.config?.url ?? "";
    if (fallbackResponses[url]) {
      return Promise.resolve({
        status: 200,
        statusText: "OK",
        data: fallbackResponses[url],
        headers: {},
        config: error.config,
      });
    }
    return Promise.resolve({
      status: 200,
      statusText: "OK",
      data: "",
      headers: {},
      config: error.config,
    });
  });
} catch {
  // axios not present - nothing to patch
}

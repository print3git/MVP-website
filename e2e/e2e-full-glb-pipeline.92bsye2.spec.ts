import { test, expect } from "@playwright/test";

const PROMPT = "basic cube";

// This test exercises the full model generation pipeline against the
// production-like server running at localhost:3000.
// It performs a real request to /api/generate and verifies the returned
// .glb file is valid and renders in the viewer.

test("full glb generation workflow", async ({ page, request }) => {
  await page.goto("/index.html");

  // Wait for the generator form rendered via React.
  await page.waitForSelector("#gen-prompt", {
    state: "visible",
    timeout: 30000,
  });

  const [generateResponse] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/generate") && res.status() === 200,
    ),
    page.fill("#gen-prompt", PROMPT).then(() => page.click("#gen-submit")),
  ]);

  const body = await generateResponse.json();
  expect(body.glb_url, "glb_url returned").toBeTruthy();

  // Wait until the viewer reports it has loaded the model.
  await page.waitForFunction(
    () => document.body.dataset.viewerReady === "true",
    {
      timeout: 120_000,
    },
  );
  await page.waitForSelector("#gen-app canvas", {
    state: "visible",
    timeout: 60_000,
  });

  // Fetch the generated glb file without mocking.
  const glbRes = await request.get(body.glb_url);
  expect(glbRes.status()).toBe(200);
  const buffer = await glbRes.body();
  expect(buffer.byteLength).toBeGreaterThan(0);
  const magic = Buffer.from(buffer).toString("ascii", 0, 4);
  expect(magic).toBe("glTF");
});

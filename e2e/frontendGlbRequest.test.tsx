import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const GLB_FIXTURE = path.join(__dirname, "..", "models", "bag.glb");

const glbBytes = fs.readFileSync(GLB_FIXTURE);

// Simulates a user generating a model and verifies the frontend receives
// and renders the GLB returned from the backend.
test("frontend glb request flow", async ({ page }) => {
  // Mock the generation API to return a fixed glb URL.
  await page.route("/api/generate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ glb_url: "/mock/model.glb" }),
    });
  });

  // Intercept the GLB download request and serve the fixture.
  await page.route("/mock/model.glb", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "model/gltf-binary" },
      body: glbBytes,
    });
  });

  await page.goto("/generate.html");
  await page.waitForSelector("#gen-prompt", { state: "visible", timeout: 10000 });

  const [glbResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/mock/model.glb")),
    page.fill("#gen-prompt", "cube").then(() => page.click("#gen-submit")),
  ]);

  const buf = await glbResponse.body();
  expect(buf.byteLength).toBeGreaterThan(1000);
  expect(glbResponse.headers()["content-type"]).toContain("model/gltf-binary");

  await page.waitForFunction(() => document.body.dataset.viewerReady === "true", {
    timeout: 60000,
  });
  await expect(page.locator("#gen-app canvas")).toBeVisible();
});

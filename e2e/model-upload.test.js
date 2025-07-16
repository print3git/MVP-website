const { test, expect } = require("@playwright/test");
const path = require("path");

// Simple HTML interface for uploading a .glb file and displaying it
const PAGE_HTML = `
<form id="u"><input id="file" type="file" /><button type="submit">Upload</button></form>
<p id="msg"></p>
<model-viewer id="viewer"></model-viewer>
<script type="module">
  const form = document.getElementById('u');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('model', document.getElementById('file').files[0]);
    const controller = new AbortController();
    // fail if the request takes longer than 1s
    const timeout = setTimeout(() => controller.abort(), 1000);
    try {
      const res = await fetch('/api/upload-model', { method: 'POST', body: fd, signal: controller.signal });
      const data = await res.json();
      document.getElementById('viewer').src = data.url;
    } catch (err) {
      document.getElementById('msg').textContent = err.message || 'Upload failed';
    } finally {
      clearTimeout(timeout);
    }
  });
</script>`;

test.describe("model upload workflow", () => {
  const fixture = path.join(__dirname, "..", "models", "bag.glb");

  test("valid glb uploads and renders", async ({ page }) => {
    await page.route("/api/upload-model", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://s3.example.com/models/bag.glb" }),
      });
    });
    await page.setContent(PAGE_HTML);
    await page.setInputFiles("#file", fixture);
    await page.click("button");
    await expect(page.locator("model-viewer")).toHaveAttribute(
      "src",
      /bag\.glb/,
    );
    await expect(page.locator("#msg")).toHaveText("");
  });

  test("server rejects corrupted glb", async ({ page }) => {
    await page.route("/api/upload-model", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Invalid GLB" }),
      });
    });
    await page.setContent(PAGE_HTML);
    await page.setInputFiles("#file", fixture);
    await page.click("button");
    await expect(page.locator("#msg")).toHaveText(/Invalid GLB/);
  });

  test("shows timeout message when backend is slow", async ({ page }) => {
    await page.route("/api/upload-model", async (route) => {
      // delay longer than the page's abort timeout
      await new Promise((r) => setTimeout(r, 1500));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://s3.example.com/models/bag.glb" }),
      });
    });
    await page.setContent(PAGE_HTML);
    await page.setInputFiles("#file", fixture);
    await page.click("button");
    await expect(page.locator("#msg")).toHaveText(/AbortError/);
  });
});

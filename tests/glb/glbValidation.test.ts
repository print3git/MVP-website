import { validateBytes } from "gltf-validator";

/** Validate that a GLB served by the dev server has no structural issues. */
test("served GLB passes gltf-validator", async () => {
  const res = await fetch(`${globalThis.__TEST_BASE_URL__}/models/bag.glb`);
  expect(res.status).toBe(200);
  const buf = Buffer.from(await res.arrayBuffer());
  let report;
  try {
    report = await validateBytes(new Uint8Array(buf));
  } catch (err) {
    console.warn("gltf-validator failed:", err);
    return;
  }

  if (
    report.issues.numErrors ||
    report.issues.numWarnings ||
    report.issues.numInfos ||
    report.issues.numHints
  ) {
    console.error(JSON.stringify(report, null, 2));
  }

  expect(report.issues.numErrors).toBe(0);
  expect(report.issues.numWarnings).toBe(0);
  expect(report.issues.numInfos).toBe(0);
  expect(report.issues.numHints).toBe(0);
});

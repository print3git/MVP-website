import { startDevServer } from "../../scripts/dev-server";
import { validateBytes } from "gltf-validator";

/** Validate that a GLB served by the dev server has no structural issues. */
test("served GLB passes gltf-validator", async () => {
  const server = startDevServer(0);
  const addr = server.address();
  const port = typeof addr === "string" ? 0 : addr.port;
  const res = await fetch(`http://127.0.0.1:${port}/models/bag.glb`);
  expect(res.status).toBe(200);
  const buf = Buffer.from(await res.arrayBuffer());
  const report = await validateBytes(new Uint8Array(buf));

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

  await new Promise((resolve) => server.close(resolve));
});

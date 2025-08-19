import { spawnSync } from "child_process";
import path from "path";

test("Stripe routes type-check", () => {
  const backendDir = path.resolve(__dirname, "..");
  const result = spawnSync(
    "npx",
    [
      "tsc",
      "--noEmit",
      "--pretty",
      "false",
      "--module",
      "CommonJS",
      "--target",
      "ES2022",
      "--types",
      "node",
      "--esModuleInterop",
      "true",
      "--allowJs",
      "true",
      "--moduleResolution",
      "node",
      "src/routes/stripe/create-checkout-session.ts",
      "src/routes/stripe/webhook.ts",
    ],
    { cwd: backendDir, encoding: "utf-8" },
  );

  if (result.status !== 0) {
    if (result.stdout) console.error(result.stdout);
    if (result.stderr) console.error(result.stderr);
  }

  expect(result.status).toBe(0);
});


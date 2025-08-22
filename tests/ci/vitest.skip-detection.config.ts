import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/ci/skip-detection-audit.test.ts"],
  },
});

const fs = require("fs");

describe("package integrity", () => {
  const modules = [
    "@sentry-internal/tracing/types/browser/web-vitals/lib/initMetric.d.ts",
    "lodash/forEach.js",
    "es-abstract/2023/CreateListFromArrayLike.js",
  ];

  for (const mod of modules) {
    test(`${mod} exists`, () => {
      const resolved = require.resolve(mod);
      expect(fs.existsSync(resolved)).toBe(true);
    });
  }
});

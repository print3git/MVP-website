const fs = require("fs");
const path = require("path");
const yaml = require("yaml");

const repoRoot = path.join(__dirname, "..");

function loadWorkflow(file) {
  const content = fs.readFileSync(
    path.join(repoRoot, ".github", "workflows", file),
    "utf8",
  );
  return yaml.parse(content);
}

function cacheSteps(workflow) {
  const jobs = workflow.jobs || {};
  const caches = [];
  for (const job of Object.values(jobs)) {
    for (const step of job.steps || []) {
      if (step.uses && step.uses.startsWith("actions/cache")) {
        caches.push(step.with || {});
      }
    }
  }
  return caches;
}

describe("workflow caching", () => {
  test("backend workflows cache pnpm store", () => {
    const wf = loadWorkflow("backend-tests.yml");
    const caches = cacheSteps(wf);
    const pnpmCache = caches.find((c) =>
      (c.path || "").includes("~/.pnpm-store"),
    );
    expect(pnpmCache).toBeTruthy();
    expect(pnpmCache.key).toMatch(/pnpm-lock\.yaml/);
  });

  test("frontend workflows cache pnpm store and vite cache", () => {
    const wf = loadWorkflow("web-matrix.yml");
    const caches = cacheSteps(wf);
    const pnpmCache = caches.find((c) =>
      (c.path || "").includes("~/.pnpm-store"),
    );
    expect(pnpmCache).toBeTruthy();
    expect(pnpmCache.key).toMatch(/pnpm-lock\.yaml/);
    expect(pnpmCache.key).toMatch(/vite.config.ts/);

    const viteCache = caches.find((c) =>
      (c.path || "").includes("node_modules/.vite"),
    );
    expect(viteCache).toBeTruthy();
    expect(viteCache.key).toMatch(/pnpm-lock\.yaml/);
    expect(viteCache.key).toMatch(/vite.config.ts/);
  });
});

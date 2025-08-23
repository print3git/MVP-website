const fs = require("fs");
const { parse } = require("yaml");

async function run(pr, checkRuns) {
  const yaml = parse(
    fs.readFileSync(".github/workflows/autofix-merge.yml", "utf8"),
  );
  const script = yaml.jobs.gate.steps[1].with.script;
  const calls = { merge: [], close: [], notice: [], failed: [] };
  const core = {
    notice: (m) => calls.notice.push(m),
    setFailed: (m) => calls.failed.push(m),
  };
  const github = {
    context: {
      repo: { owner: "owner", repo: "repo" },
      payload: { pull_request: pr },
    },
    getOctokit: () => ({
      rest: {
        checks: {
          listForRef: async () => ({ data: { check_runs: checkRuns } }),
        },
        pulls: {
          merge: async (args) => calls.merge.push(args),
          update: async (args) => calls.close.push(args),
        },
      },
    }),
  };
  const requireMock = (mod) => {
    if (mod === "@actions/core") return core;
    if (mod === "@actions/github") return github;
    throw new Error("unknown module");
  };
  const fn = new Function(
    "require",
    "process",
    `return (async () => {${script}\n})();`,
  );
  await fn(requireMock, { env: { GITHUB_TOKEN: "token" } });
  return calls;
}

test("merges clean autofix PR", async () => {
  const pr = {
    labels: [{ name: "autofix" }],
    head: { sha: "sha" },
    mergeable_state: "clean",
    number: 1,
  };
  const checks = [{ conclusion: "success" }];
  const calls = await run(pr, checks);
  expect(calls.merge).toHaveLength(1);
  expect(calls.close).toHaveLength(0);
  expect(calls.failed).toHaveLength(0);
});

test("closes PR with failing checks or conflicts", async () => {
  const pr = {
    labels: [{ name: "autofix" }],
    head: { sha: "sha" },
    mergeable_state: "dirty",
    number: 1,
  };
  const checks = [{ conclusion: "failure" }];
  const calls = await run(pr, checks);
  expect(calls.merge).toHaveLength(0);
  expect(calls.close).toHaveLength(1);
  expect(calls.failed[0]).toMatch("Closed due to red checks or conflicts");
});

test("skips non-autofix PR", async () => {
  const pr = {
    labels: [{ name: "other" }],
    head: { sha: "sha" },
    mergeable_state: "clean",
    number: 1,
  };
  const checks = [];
  const calls = await run(pr, checks);
  expect(calls.notice[0]).toMatch("Non-autofix PR");
  expect(calls.merge).toHaveLength(0);
  expect(calls.close).toHaveLength(0);
});

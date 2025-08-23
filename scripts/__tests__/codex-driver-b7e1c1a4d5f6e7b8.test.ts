import fs from "fs";
(globalThis as any).fetch = (url: any, opts: any) =>
  require("node-fetch")(url, opts);
import path from "path";
import nock from "nock";
import { main } from "../autofix/codex-driver.js";

test("creates branch and PR from codex patch", async () => {
  const outDir = path.join("ci", "autofix", "out");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "foo.md"), "prompt");

  const patch = `diff --git a/foo.txt b/foo.txt\nnew file mode 100644\nindex 0000000..e69de29\n--- /dev/null\n+++ b/foo.txt\n@@\n+hello\n`;

  const codex = nock("https://codex.local").post("/").reply(200, { patch });

  const gh = nock("https://api.github.com")
    .get("/repos/test/repo")
    .reply(200, { default_branch: "main" })
    .get("/repos/test/repo/git/ref/heads/main")
    .reply(200, { object: { sha: "base-sha" } })
    .get("/repos/test/repo/git/commits/base-sha")
    .reply(200, { tree: { sha: "tree-sha" } })
    .post("/repos/test/repo/git/blobs")
    .reply(201, { sha: "blob-sha" })
    .post("/repos/test/repo/git/trees", (body) => {
      expect(body.base_tree).toBe("tree-sha");
      return true;
    })
    .reply(201, { sha: "new-tree" })
    .post("/repos/test/repo/git/commits", (body) => {
      expect(body.parents).toEqual(["base-sha"]);
      return true;
    })
    .reply(201, { sha: "commit-sha" })
    .post("/repos/test/repo/git/refs", (body) => {
      expect(body.ref).toBe("refs/heads/autofix/foo");
      expect(body.sha).toBe("commit-sha");
      return true;
    })
    .reply(201, {})
    .post("/repos/test/repo/pulls", (body) => {
      expect(body.head).toBe("autofix/foo");
      expect(body.base).toBe("main");
      return true;
    })
    .reply(201, { number: 42 })
    .post("/repos/test/repo/issues/42/labels", (body) => {
      expect(body.labels).toContain("autofix");
      return true;
    })
    .reply(200, {});

  process.env.CODEX_URL = "https://codex.local";
  process.env.CODEX_API_KEY = "k";
  process.env.GITHUB_TOKEN = "t";
  process.env.GITHUB_REPOSITORY = "test/repo";

  await main();

  expect(codex.isDone()).toBe(true);
  expect(gh.isDone()).toBe(true);

  const state = JSON.parse(fs.readFileSync("ci/autofix/state.json", "utf8"));
  expect(state.foo.branch).toBe("autofix/foo");
  expect(state.foo.pr).toBe(42);

  await fs.promises.writeFile("ci/autofix/state.json", "{}");
  fs.rmSync(outDir, { recursive: true, force: true });
});

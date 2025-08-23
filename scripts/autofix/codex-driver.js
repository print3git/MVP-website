const fs = require("fs").promises;
const path = require("path");
const { execSync } = require("child_process");

const outDir = path.join("ci", "autofix", "out");
const statePath = path.join("ci", "autofix", "state.json");

async function main() {
  const files = await fs.readdir(outDir).catch(() => []);
  if (files.length === 0) return;
  const [owner, repo] = (process.env.GITHUB_REPOSITORY || "").split("/");
  if (!owner || !repo) throw new Error("GITHUB_REPOSITORY not set");
  const ghHeaders = {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    "User-Agent": "codex-driver",
    "Content-Type": "application/json",
  };

  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const slug = path.basename(file, ".md");
    const promptPath = path.join(outDir, file);
    const prompt = await fs.readFile(promptPath, "utf8");
    await fs.unlink(promptPath);

    const codexRes = await fetch(process.env.CODEX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CODEX_API_KEY}`,
      },
      body: JSON.stringify({ repo: process.env.GITHUB_REPOSITORY, prompt }),
    }).then((r) => r.json());

    const repoInfo = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: ghHeaders,
      },
    ).then((r) => r.json());
    const base = repoInfo.default_branch;
    const baseRef = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${base}`,
      { headers: ghHeaders },
    ).then((r) => r.json());
    const baseSha = baseRef.object.sha;
    const commitData = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits/${baseSha}`,
      { headers: ghHeaders },
    ).then((r) => r.json());
    const baseTree = commitData.tree.sha;

    if (codexRes.patch) {
      execSync("git apply --whitespace=nowarn", { input: codexRes.patch });
    } else if (codexRes.branchTarball) {
      const tmp = await fs.mkdtemp(path.join(process.cwd(), "autofix-"));
      const tarPath = path.join(tmp, "branch.tar");
      await fs.writeFile(
        tarPath,
        Buffer.from(codexRes.branchTarball, "base64"),
      );
      execSync(`tar -xf ${tarPath} -C ${tmp}`);
      execSync(`cp -R ${tmp}/* ${process.cwd()}`);
    } else {
      console.error("Codex response missing patch or branchTarball");
      continue;
    }

    const changed = execSync("git status --porcelain", { encoding: "utf8" })
      .split("\n")
      .filter(Boolean)
      .map((l) => l.slice(3));
    const tree = [];
    for (const filePath of changed) {
      const content = await fs.readFile(filePath, "utf8");
      const blob = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
        {
          method: "POST",
          headers: ghHeaders,
          body: JSON.stringify({ content, encoding: "utf-8" }),
        },
      ).then((r) => r.json());
      tree.push({
        path: filePath,
        mode: "100644",
        type: "blob",
        sha: blob.sha,
      });
    }

    const newTree = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees`,
      {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({ base_tree: baseTree, tree }),
      },
    ).then((r) => r.json());

    const commit = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits`,
      {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({
          message: `autofix: ${slug}`,
          tree: newTree.sha,
          parents: [baseSha],
        }),
      },
    ).then((r) => r.json());

    const branch = `autofix/${slug}`;
    await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: "POST",
      headers: ghHeaders,
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }),
    });

    const pr = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({ title: slug, head: branch, base }),
      },
    ).then((r) => r.json());

    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${pr.number}/labels`,
      {
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({ labels: ["autofix"] }),
      },
    );

    execSync("git reset --hard", { stdio: "ignore" });
    const state = await fs.readFile(statePath, "utf8").catch(() => "{}");
    const json = JSON.parse(state);
    json[slug] = { pr: pr.number, branch };
    await fs.writeFile(statePath, JSON.stringify(json, null, 2));
  }
}

async function runCi({ input, summary, out }) {
  void summary; // summary currently unused
  const data = JSON.parse(await fs.readFile(input, "utf8"));
  await fs.mkdir(out, { recursive: true });
  const first = data.failing_jobs?.[0]?.name || "unknown job";
  const suggestion = `Investigate failing job: ${first}`;
  await fs.writeFile(path.join(out, "suggestion.md"), suggestion);
  return suggestion;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : undefined;
  };
  const mode = getArg("--mode");
  if (mode === "ci") {
    runCi({
      input: getArg("--input"),
      summary: getArg("--summary"),
      out: getArg("--out"),
    }).catch((e) => {
      console.error(e);
      process.exit(1);
    });
  } else {
    main().catch((e) => {
      console.error(e);
      process.exit(1);
    });
  }
}
module.exports = { main, runCi };

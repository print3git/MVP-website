import fs from "fs";
import path from "path";
import { cluster } from "../../scripts/autofix/cluster.js";

test("cluster groups by error hash", () => {
  const tmp = fs.mkdtempSync(path.join(process.cwd(), "cluster-"));
  const inbox = path.join(tmp, "ci", "autofix", "inbox");
  fs.mkdirSync(inbox, { recursive: true });
  const itemA = {
    run: 1,
    job: "a",
    files: ["f.js"],
    snippets: ["oops"],
    error_hash: "hash",
  };
  const itemB = {
    run: 2,
    job: "b",
    files: ["f.js"],
    snippets: ["oops"],
    error_hash: "hash",
  };
  fs.writeFileSync(path.join(inbox, "a.json"), JSON.stringify(itemA));
  fs.writeFileSync(path.join(inbox, "b.json"), JSON.stringify(itemB));
  cluster(inbox);
  const files = fs.readdirSync(inbox);
  expect(files).toEqual(["hash.json"]);
  const saved = JSON.parse(
    fs.readFileSync(path.join(inbox, "hash.json"), "utf8"),
  );
  expect(saved.run.sort()).toEqual([1, 2]);
  expect(saved.job.sort()).toEqual(["a", "b"]);
  expect(saved.files).toEqual(["f.js"]);
  expect(saved.snippets).toEqual(["oops"]);
  fs.rmSync(tmp, { recursive: true, force: true });
});

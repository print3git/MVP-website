const fs = require("fs");
const path = require("path");

function cluster(dir = path.join("ci", "autofix", "inbox")) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const groups = {};
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    const key = data.error_hash;
    if (!groups[key]) {
      groups[key] = {
        run: [data.run],
        job: [data.job],
        files: [...data.files],
        snippets: [...data.snippets],
        error_hash: key,
      };
    } else {
      groups[key].run = Array.from(new Set(groups[key].run.concat(data.run)));
      groups[key].job = Array.from(new Set(groups[key].job.concat(data.job)));
      groups[key].files = Array.from(
        new Set(groups[key].files.concat(data.files)),
      );
      groups[key].snippets = Array.from(
        new Set(groups[key].snippets.concat(data.snippets)),
      );
    }
    fs.unlinkSync(path.join(dir, file));
  }
  for (const key of Object.keys(groups)) {
    fs.writeFileSync(
      path.join(dir, `${key}.json`),
      JSON.stringify(groups[key], null, 2),
    );
  }
}

module.exports = { cluster };

if (require.main === module) {
  cluster();
}

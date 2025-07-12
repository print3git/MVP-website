const child_process = require("child_process");
const requiredMajor = parseInt(process.env.REQUIRED_NODE_MAJOR || "20", 10);
const major = parseInt(process.versions.node.split(".")[0], 10);
if (major < requiredMajor) {
  console.error(
    `Node ${requiredMajor}+ is required, current version is ${process.versions.node}`,
  );
  try {
    child_process.execSync(`mise use -g node@${requiredMajor}`, { stdio: "inherit" });
    console.error("Node updated. Restart your shell and rerun the command.");
  } catch {
    console.error(`Run 'mise use -g node@${requiredMajor}' to install the correct version.`);
  }
  process.exit(1);
}

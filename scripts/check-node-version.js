const requiredMajor = 20;
const major = parseInt(process.versions.node.split(".")[0], 10);
if (major < requiredMajor) {
  console.error(
    `Node ${requiredMajor}+ is required, current version is ${process.versions.node}`,
  );
  process.exit(1);
}

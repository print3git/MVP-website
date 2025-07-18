const fs = require("fs");

function fail(msg) {
  console.error(msg);
  process.exitCode = 1;
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error(
      "Usage: node scripts/verify-glb-integrity-329vkd.js <file.glb>",
    );
    process.exit(1);
  }
  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch (_err) {
    console.error(`Failed to read file: ${file}`);
    process.exit(1);
  }
  if (buf.length <= 1000) {
    fail(`File too small (${buf.length} bytes)`);
  }
  if (buf.slice(0, 4).toString() !== "glTF") {
    fail("Missing glTF magic header");
  }
  if (!buf.includes(Buffer.from("JSON"))) {
    fail("Missing JSON chunk");
  }
  if (!buf.includes(Buffer.from("BIN"))) {
    fail("Missing BIN chunk");
  }
}

main();

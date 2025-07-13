"use strict";

const fs = require("fs/promises");
const path = require("path");

const translationsPath = path.join(
  __dirname,
  "..",
  "backend",
  "translations.json",
);
const templatesDir = path.join(__dirname, "..", "backend", "email_templates");

async function main() {
  const translationsRaw = await fs.readFile(translationsPath, "utf8");
  const translations = JSON.parse(translationsRaw);
  const templates = (await fs.readdir(templatesDir)).filter((f) =>
    f.endsWith(".txt"),
  );

  const missing = [];
  const unused = new Set(Object.keys(translations));

  for (const file of templates) {
    const base = path.basename(file, ".txt");
    const subjectKey = `${base}.subject`;
    const bodyKey = `${base}.body`;
    if (!translations[subjectKey]) missing.push(subjectKey);
    else unused.delete(subjectKey);
    if (!translations[bodyKey]) missing.push(bodyKey);
    else unused.delete(bodyKey);
  }

  if (missing.length || unused.size) {
    console.error("i18n lint failed.");
    if (missing.length) console.error("Missing keys:", missing.join(", "));
    if (unused.size)
      console.error("Unused keys:", Array.from(unused).join(", "));
    process.exit(1);
  }
  console.log("i18n lint passed.");
}

main().catch((err) => {
  console.error("Failed to run i18n lint:", err);
  process.exit(1);
});

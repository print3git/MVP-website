require("dotenv").config();
const fs = require("fs/promises");
const path = require("path");
const db = require("../db");

(async () => {
  const [spaceId, occupant, startDate, endDate] = process.argv.slice(2);
  if (!spaceId || !endDate) {
    console.error(
      "Usage: node generate-rental-paperwork.js <spaceId> <occupant> <startDate> <endDate>",
    );
    process.exit(1);
  }
  const { rows } = await db.query("SELECT * FROM spaces WHERE id=$1", [
    spaceId,
  ]);
  if (!rows.length) {
    console.error("Space not found");
    process.exit(1);
  }
  const space = rows[0];
  const templatePath = path.join(
    __dirname,
    "..",
    "email_templates",
    "rental_agreement.txt",
  );
  let text = await fs.readFile(templatePath, "utf8");
  text = text
    .replace(/{{address}}/g, space.address)
    .replace(/{{region}}/g, space.region)
    .replace(/{{cost}}/g, (space.cost_cents / 100).toFixed(2))
    .replace(/{{start_date}}/g, startDate)
    .replace(/{{end_date}}/g, endDate)
    .replace(/{{occupant}}/g, occupant || "");
  const outPath = path.join(process.cwd(), `rental_agreement_${spaceId}.txt`);
  await fs.writeFile(outPath, text);
  console.log("Generated", outPath);
})();

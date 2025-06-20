require("dotenv").config();
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { sendMailWithAttachment } = require("../mail");

async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const hubRes = await client.query(`
      SELECT h.id, h.name, COUNT(p.id) AS printers
        FROM printer_hubs h
        LEFT JOIN printers p ON p.hub_id=h.id
       GROUP BY h.id, h.name
       ORDER BY h.id`);
    const orderRes = await client.query(
      "SELECT status, COUNT(*) FROM orders GROUP BY status",
    );
    const errorRes = await client.query(`
      SELECT h.id, COUNT(*) AS errors
        FROM printer_hubs h
        JOIN printers p ON p.hub_id=h.id
        JOIN printer_metrics m ON m.printer_id=p.id
       WHERE m.created_at >= NOW() - INTERVAL '7 days'
         AND (m.status='offline' OR m.error IS NOT NULL)
       GROUP BY h.id`);
    const errorMap = {};
    for (const r of errorRes.rows) {
      errorMap[r.id] = parseInt(r.errors, 10);
    }
    const hubs = hubRes.rows.map((r) => ({
      id: r.id,
      name: r.name,
      printers: parseInt(r.printers, 10),
      errors: errorMap[r.id] || 0,
    }));
    const orders = orderRes.rows.reduce((acc, r) => {
      acc[r.status] = parseInt(r.count, 10);
      return acc;
    }, {});
    const date = new Date().toISOString().slice(0, 10);
    const outDir = path.join(__dirname, "..", "..", "reports");
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `ops_report_${date}.pdf`);
    await new Promise((resolve) => {
      const doc = new PDFDocument();
      doc.pipe(fs.createWriteStream(outPath).on("finish", resolve));
      doc.fontSize(18).text("State of Company", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Date: ${date}`);
      doc.moveDown();
      doc.text("Orders:");
      for (const [status, count] of Object.entries(orders)) {
        doc.text(`- ${status}: ${count}`);
      }
      doc.moveDown();
      doc.text("Hubs:");
      hubs.forEach((h) => {
        const mark = h.errors > 0 ? ` (errors: ${h.errors})` : "";
        doc.text(`- ${h.name} - printers: ${h.printers}${mark}`);
      });
      doc.end();
    });
    if (process.env.OPS_REPORT_ARCHIVE) {
      const dest = path.join(
        process.env.OPS_REPORT_ARCHIVE,
        path.basename(outPath),
      );
      fs.copyFileSync(outPath, dest);
    }
    if (process.env.OPS_EMAILS) {
      const emails = process.env.OPS_EMAILS.split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      for (const e of emails) {
        await sendMailWithAttachment(
          e,
          "Weekly Operations Report",
          "See attached report",
          outPath,
        );
      }
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = run;

require("dotenv").config();
const { Client } = require("pg");
const fs = require("fs");
const PDFDocument = require("pdfkit");
const { sendMailWithAttachment } = require("../mail");

async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const profitRes = await client.query(
      `SELECT date_trunc('day', created_at) AS day,
              SUM(price_cents - discount_cents) AS revenue_cents,
              SUM(pc.cost_cents * quantity) AS cost_cents
         FROM orders o
         LEFT JOIN pricing_costs pc ON pc.product_type=o.product_type
        WHERE status='paid' AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY day ORDER BY day`,
    );
    const utilRes = await client.query(
      `SELECT date_trunc('day', created_at) AS day, AVG(utilization) AS util
         FROM printer_metrics
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY day ORDER BY day`,
    );
    const profits = profitRes.rows.map((r) => ({
      day: r.day.toISOString().slice(0, 10),
      profit:
        (parseInt(r.revenue_cents, 10) || 0) -
        (parseInt(r.cost_cents, 10) || 0),
    }));
    const utils = utilRes.rows.map((r) => ({
      day: r.day.toISOString().slice(0, 10),
      util: parseFloat(r.util) || 0,
    }));
    const avgProfit =
      profits.reduce((s, p) => s + p.profit, 0) / (profits.length || 1);
    const avgUtil = utils.reduce((s, u) => s + u.util, 0) / (utils.length || 1);
    const anomalies = [];
    for (const p of profits) {
      if (avgProfit && Math.abs(p.profit - avgProfit) > avgProfit * 0.5) {
        anomalies.push(`Profit anomaly on ${p.day}: ${p.profit}`);
      }
    }
    for (const u of utils) {
      if (avgUtil && Math.abs(u.util - avgUtil) > avgUtil * 0.5) {
        anomalies.push(
          `Utilization anomaly on ${u.day}: ${Math.round(u.util * 100)}%`,
        );
      }
    }
    const outPath = "/tmp/business_intel_report.pdf";
    await new Promise((resolve) => {
      const doc = new PDFDocument();
      doc.pipe(fs.createWriteStream(outPath).on("finish", resolve));
      doc
        .fontSize(18)
        .text("Business Intelligence Report", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text("Daily Profit");
      profits.forEach((p) =>
        doc.text(`${p.day}: $${(p.profit / 100).toFixed(2)}`),
      );
      doc.moveDown();
      doc.text("Daily Capacity Utilization");
      utils.forEach((u) => doc.text(`${u.day}: ${(u.util * 100).toFixed(1)}%`));
      if (anomalies.length) {
        doc.moveDown();
        doc.text("Anomalies:");
        anomalies.forEach((a) => doc.text(`- ${a}`));
      }
      doc.end();
    });
    if (process.env.FOUNDER_EMAILS) {
      const emails = process.env.FOUNDER_EMAILS.split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      for (const e of emails) {
        await sendMailWithAttachment(
          e,
          "Weekly Business Intelligence",
          "See attached report",
          outPath,
        );
      }
    }
    fs.unlinkSync(outPath);
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

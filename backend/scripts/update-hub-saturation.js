#!/usr/bin/env node
require("dotenv").config();
const { Client } = require("pg");
const db = require("../db");

async function update(date = new Date(Date.now() - 86400000)) {
  const summaryDate = date.toISOString().slice(0, 10);
  const start = summaryDate;
  const end = new Date(Date.parse(summaryDate) + 86400000)
    .toISOString()
    .slice(0, 10);
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const res = await client.query(
      `SELECT h.id AS hub_id, AVG(m.queue_length) AS avg_queue
         FROM printer_hubs h
         JOIN printers p ON p.hub_id=h.id
         JOIN printer_metrics m ON m.printer_id=p.id
        WHERE m.created_at>= $1 AND m.created_at< $2
        GROUP BY h.id`,
      [start, end],
    );
    for (const row of res.rows) {
      await db.upsertHubSaturationSummary(
        summaryDate,
        row.hub_id,
        parseFloat(row.avg_queue),
      );
    }
    console.log("Updated hub saturation for", summaryDate);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  update().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = update;

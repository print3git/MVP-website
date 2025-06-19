require("dotenv").config();
const { Client } = require("pg");
const { getPrinterInfo } = require("../printers/octoprint");

const OCTOPRINT_API_KEY = process.env.OCTOPRINT_API_KEY || "";
const POLL_INTERVAL_MS = parseInt(
  process.env.PRINTER_POLL_INTERVAL_MS || "60000",
  10,
);
const PRINTER_URLS = (process.env.PRINTER_URLS || "")
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);

const lastStatus = {};

async function getAverageCompletion(client) {
  const { rows } = await client.query(
    "SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) AS avg FROM jobs WHERE status='sent'",
  );
  return rows[0] && rows[0].avg ? parseFloat(rows[0].avg) : null;
}

async function pollPrinters(client) {
  const avgCompletion = await getAverageCompletion(client);
  for (const url of PRINTER_URLS) {
    const { rows } = await client.query(
      "SELECT id FROM printers WHERE serial=$1",
      [url],
    );
    const printerId = rows.length
      ? rows[0].id
      : (
          await client.query(
            "INSERT INTO printers(serial) VALUES($1) RETURNING id",
            [url],
          )
        ).rows[0].id;
    try {
      const info = await getPrinterInfo(url, OCTOPRINT_API_KEY);
      const now = Date.now();
      let idleSeconds = 0;
      const last = lastStatus[url];
      if (info.status === "idle" && last && last.status === "idle") {
        idleSeconds = Math.round((now - last.timestamp) / 1000);
      }
      const utilization = info.status === "printing" ? 1 : 0;
      await client.query(
        "INSERT INTO printer_metrics(printer_id, status, queue_length, error, utilization, idle_seconds, avg_completion_seconds) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          printerId,
          info.status,
          info.queueLength,
          info.error,
          utilization,
          idleSeconds,
          avgCompletion,
        ],
      );
      lastStatus[url] = { status: info.status, timestamp: now };
      await client.query(
        "UPDATE printers SET last_heartbeat=NOW() WHERE id=$1",
        [printerId],
      );
    } catch (err) {
      await client.query(
        "INSERT INTO printer_metrics(printer_id, status, queue_length, error, utilization, idle_seconds, avg_completion_seconds) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [printerId, "offline", 0, err.message, 0, 0, avgCompletion],
      );
    }
  }
}

async function run(interval = POLL_INTERVAL_MS) {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  setInterval(() => {
    pollPrinters(client).catch((err) =>
      console.error("Telemetry worker error", err),
    );
  }, interval);
}

if (require.main === module) {
  run();
}

module.exports = { run, pollPrinters };

require("dotenv").config();
const { Client } = require("pg");
const axios = require("axios");
const { getPrinterStatus } = require("../printers/octoprint");

const DEFAULT_PRINTER_URL =
  process.env.PRINTER_API_URL || "http://localhost:5000/print";
const PRINTER_URLS = (process.env.PRINTER_URLS || DEFAULT_PRINTER_URL)
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);
const OCTOPRINT_API_KEY = process.env.OCTOPRINT_API_KEY || "";
const POLL_INTERVAL_MS = 5000;
const FILAMENT_GRAMS = parseFloat(process.env.FILAMENT_GRAMS_PER_PRINT || "25");

async function getNextPendingJob(client) {
  const { rows } = await client.query(
    `SELECT j.job_id
       FROM jobs j
       JOIN orders o ON j.job_id=o.job_id
      WHERE j.status='complete' AND o.status='paid'
      ORDER BY j.created_at
      LIMIT 1`,
  );
  return rows[0] && rows[0].job_id;
}

async function findIdlePrinter(exclude = new Set()) {
  for (const url of PRINTER_URLS) {
    if (exclude.has(url)) continue;
    try {
      const status = await getPrinterStatus(url, OCTOPRINT_API_KEY);
      if (status === "idle") return url;
    } catch (_err) {
      // ignore
    }
  }
  return null;
}

async function processNextJob(client) {
  const jobId = await getNextPendingJob(client);
  if (!jobId) return;

  const { rows } = await client.query(
    `SELECT j.model_url, o.shipping_info, o.etch_name
       FROM jobs j
       JOIN orders o ON j.job_id=o.job_id
      WHERE j.job_id=$1`,
    [jobId],
  );
  if (!rows.length) return;

  const { model_url: modelUrl, shipping_info: shipping, etch_name } = rows[0];
  const tried = new Set();
  let printerUrl = await findIdlePrinter(tried);
  while (printerUrl) {
    try {
      await axios.post(printerUrl, { modelUrl, shipping, etchName: etch_name });
      await client.query(
        "UPDATE jobs SET status=$1, error=NULL WHERE job_id=$2",
        ["sent", jobId],
      );
      const { rows: printerRows } = await client.query(
        "SELECT id, hub_id FROM printers WHERE serial=$1",
        [printerUrl],
      );
      if (printerRows.length) {
        const { id: printerId, hub_id: hubId } = printerRows[0];
        await client.query(
          "UPDATE print_jobs SET filament_used_g=$1, printer_id=$2 WHERE job_id=$3",
          [FILAMENT_GRAMS, printerId, jobId],
        );
        await client.query(
          "INSERT INTO hub_inventory(hub_id, material, quantity) VALUES($1,$2,0) ON CONFLICT (hub_id, material) DO NOTHING",
          [hubId, "filament"],
        );
        await client.query(
          "UPDATE hub_inventory SET quantity=quantity-$1 WHERE hub_id=$2 AND material=$3",
          [FILAMENT_GRAMS, hubId, "filament"],
        );
      }
      return;
    } catch (_err) {
      tried.add(printerUrl);
      printerUrl = await findIdlePrinter(tried);
    }
  }
  await client.query("UPDATE jobs SET error=$1 WHERE job_id=$2", [
    "All printers failed",
    jobId,
  ]);
}

async function run(interval = POLL_INTERVAL_MS) {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  setInterval(() => {
    processNextJob(client).catch((err) => console.error("Worker error", err));
  }, interval);
}

if (require.main === module) {
  run();
}

module.exports = { run, processNextJob };

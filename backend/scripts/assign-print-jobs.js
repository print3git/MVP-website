require('dotenv').config();
const axios = require('axios');
const db = require('../db');

async function assignPrintJobs() {
  const job = await db.getNextPendingPrintJob();
  if (!job) return;
  const printers = await db.getIdlePrinters();
  if (!printers.length) return;
  const printer = printers[0];
  try {
    await axios.post(`${printer.api_url}/print`, { gcodePath: job.gcode_path });
    await db.assignJobToPrinter(job.id, printer.id);
    await db.updatePrinterStatus(printer.id, 'printing');
  } catch (err) {
    console.error('Failed to assign job', err);
  }
}

if (require.main === module) {
  assignPrintJobs().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = assignPrintJobs;

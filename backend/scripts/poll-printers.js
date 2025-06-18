require('dotenv').config();
const axios = require('axios');
const db = require('../db');

async function pollPrinters() {
  const { rows } = await db.query('SELECT id, api_url FROM printers');
  for (const p of rows) {
    try {
      const res = await axios.get(`${p.api_url}/api/printer`);
      const state =
        res.data.state && res.data.state.text ? res.data.state.text.toLowerCase() : 'unknown';
      const status = state.includes('printing')
        ? 'printing'
        : state.includes('operational')
          ? 'idle'
          : 'unknown';
      await db.updatePrinterStatus(p.id, status);
    } catch (err) {
      await db.updatePrinterStatus(p.id, 'error');
    }
  }
}

if (require.main === module) {
  pollPrinters().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = pollPrinters;

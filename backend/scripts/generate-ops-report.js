require('dotenv').config();
const { Client } = require('pg');

async function generateOpsReport() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const hubRes = await client.query(`
      SELECT h.id, h.name, COUNT(p.id) AS printers
        FROM printer_hubs h
        LEFT JOIN printers p ON p.hub_id=h.id
       GROUP BY h.id, h.name
       ORDER BY h.id`);
    const orderRes = await client.query('SELECT status, COUNT(*) FROM orders GROUP BY status');
    const orders = orderRes.rows.reduce((acc, r) => {
      acc[r.status] = parseInt(r.count, 10);
      return acc;
    }, {});
    const report = {
      date: new Date().toISOString().slice(0, 10),
      hubs: hubRes.rows.map((r) => ({
        id: r.id,
        name: r.name,
        printers: parseInt(r.printers, 10),
      })),
      orders,
    };
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  generateOpsReport().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = generateOpsReport;

require("dotenv").config();
const { Client } = require("pg");

async function revenueByCountry(month) {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const params = [];
    let filter = "";
    if (month) {
      filter =
        "AND date_trunc('month', created_at) = date_trunc('month', $1::date)";
      params.push(month);
    }
    const { rows } = await client.query(
      `SELECT COALESCE(shipping_info->>'country', 'unknown') AS country,
              SUM(price_cents - discount_cents) AS revenue
         FROM orders
        WHERE status='paid' ${filter}
        GROUP BY country
        ORDER BY country`,
      params,
    );
    const result = {};
    for (const r of rows) {
      result[r.country] = parseInt(r.revenue, 10) || 0;
    }
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  revenueByCountry(process.argv[2]).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = revenueByCountry;

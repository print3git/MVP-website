require("dotenv").config();
const { Client } = require("pg");
const { sendTemplate } = require("../mail");

const SURVEY_BASE_URL =
  process.env.SURVEY_BASE_URL || "https://example.com/survey";

async function run() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT session_id, email, username
         FROM orders o
         JOIN users u ON o.user_id=u.id
        WHERE o.status='delivered'
          AND o.delivery_email_sent=FALSE`,
    );
    for (const row of rows) {
      try {
        const surveyUrl = `${SURVEY_BASE_URL}?order=${row.session_id}`;
        await sendTemplate(
          row.email,
          "How did we do?",
          "delivery_confirmation.txt",
          {
            username: row.username,
            order_id: row.session_id,
            survey_url: surveyUrl,
          },
        );
        await client.query(
          "UPDATE orders SET delivery_email_sent=TRUE WHERE session_id=$1",
          [row.session_id],
        );
      } catch (err) {
        console.error(
          "Failed to send delivery confirmation for",
          row.session_id,
          err,
        );
      }
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  run();
}

module.exports = run;

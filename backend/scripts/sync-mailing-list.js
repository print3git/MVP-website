require('dotenv').config();
const { Client } = require('pg');
const axios = require('axios');

async function fetchEmails(client) {
  try {
    const { rows } = await client.query(
      `SELECT email FROM mailing_list WHERE confirmed=TRUE AND unsubscribed=FALSE`
    );
    return rows.map((r) => ({ email: r.email }));
  } catch (err) {
    if (err.code === '42703') {
      const { rows } = await client.query('SELECT email FROM mailing_list WHERE confirmed=TRUE');
      return rows.map((r) => ({ email: r.email }));
    }
    throw err;
  }
}

async function syncMailingList() {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const contacts = await fetchEmails(client);
    if (contacts.length === 0) {
      console.log('No contacts to sync');
      return;
    }
    await axios.put(
      'https://api.sendgrid.com/v3/marketing/contacts',
      { contacts },
      {
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`Synced ${contacts.length} contacts`);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  syncMailingList().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = syncMailingList;

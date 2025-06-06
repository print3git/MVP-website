const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid');
const config = require('./config');
const db = require('./db');

let transporter = null;
if (config.sendgridKey) {
  transporter = nodemailer.createTransport(sgTransport({ apiKey: config.sendgridKey }));
} else {
  transporter = nodemailer.createTransport({
    jsonTransport: true,
  });
}

async function getUnsubscribeUrl(email) {
  try {
    const { rows } = await db.query(
      'SELECT token, unsubscribed FROM mailing_list WHERE email=$1',
      [email]
    );
    if (rows.length && rows[0].unsubscribed) {
      return { url: null, unsubscribed: true };
    }
    if (rows.length) {
      const base = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
      return { url: `${base}/api/unsubscribe?token=${rows[0].token}`, unsubscribed: false };
    }
  } catch (err) {
    console.error('Failed to lookup unsubscribe token', err);
  }
  return { url: null, unsubscribed: false };
}

async function sendMail(to, subject, text) {
  if (!transporter) return;
  const { url, unsubscribed } = await getUnsubscribeUrl(to);
  if (unsubscribed) return;
  if (url) {
    text = `${text}\n\nUnsubscribe: ${url}`;
  }
  await transporter.sendMail({
    from: config.emailFrom,
    to,
    subject,
    text,
  });
}

async function sendTemplate(to, templateId, variables = {}) {
  if (!transporter) return;
  const { url, unsubscribed } = await getUnsubscribeUrl(to);
  if (unsubscribed) return;
  if (url) {
    variables.unsubscribeUrl = url;
  }
  await transporter.sendMail({
    from: config.emailFrom,
    to,
    templateId,
    dynamic_template_data: variables,
  });
}

module.exports = { sendMail, sendTemplate };

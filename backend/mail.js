const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid');
const config = require('./config');

let transporter = null;
if (config.sendgridKey) {
  transporter = nodemailer.createTransport(sgTransport({ apiKey: config.sendgridKey }));
} else {
  transporter = nodemailer.createTransport({
    jsonTransport: true,
  });
}

async function sendMail(to, subject, text) {
  if (!transporter) return;
  await transporter.sendMail({
    from: config.emailFrom,
    to,
    subject,
    text,
  });
}

module.exports = { sendMail };

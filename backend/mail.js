const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid');
const fs = require('fs/promises');
const path = require('path');
const config = require('./config');

let transporter = null;
if (config.sendgridKey) {
  transporter = nodemailer.createTransport(sgTransport({ apiKey: config.sendgridKey }));
} else {
  transporter = nodemailer.createTransport({
    jsonTransport: true,
  });
}

async function sendMailWithAttachment(to, subject, text, attachmentPath) {
  if (!transporter) return;
  const content = await fs.readFile(attachmentPath);
  await transporter.sendMail({
    from: config.emailFrom,
    to,
    subject,
    text,
    attachments: [{ filename: path.basename(attachmentPath), content }],
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

async function renderTemplate(templateName, data = {}) {
  const filePath = path.join(__dirname, 'email_templates', templateName);
  let content = await fs.readFile(filePath, 'utf8');
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    content = content.replace(regex, String(value));
  }
  return content;
}

async function sendTemplate(to, subject, templateName, data = {}) {
  if (!transporter) return;
  const text = await renderTemplate(templateName, data);
  await transporter.sendMail({
    from: config.emailFrom,
    to,
    subject,
    text,
  });
}

module.exports = { sendMail, sendTemplate, sendMailWithAttachment };

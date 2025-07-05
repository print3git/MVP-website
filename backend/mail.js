const nodemailer = require("nodemailer");
const sgMail = require("@sendgrid/mail");
const fs = require("fs/promises");
const path = require("path");
const config = require("./config");

let transporter = null;
let useSendGrid = false;
if (config.sendgridKey) {
  sgMail.setApiKey(config.sendgridKey);
  useSendGrid = true;
} else {
  transporter = nodemailer.createTransport({
    jsonTransport: true,
  });
}

async function sendMailWithAttachment(to, subject, text, attachmentPath) {
  const content = await fs.readFile(attachmentPath);
  if (useSendGrid) {
    await sgMail.send({
      from: config.emailFrom,
      to,
      subject,
      text,
      attachments: [
        {
          content: content.toString("base64"),
          filename: path.basename(attachmentPath),
          type: "application/octet-stream",
          disposition: "attachment",
        },
      ],
    });
  } else if (transporter) {
    await transporter.sendMail({
      from: config.emailFrom,
      to,
      subject,
      text,
      attachments: [{ filename: path.basename(attachmentPath), content }],
    });
  }
}

async function sendMail(to, subject, text) {
  if (useSendGrid) {
    await sgMail.send({ from: config.emailFrom, to, subject, text });
  } else if (transporter) {
    await transporter.sendMail({ from: config.emailFrom, to, subject, text });
  }
}

async function renderTemplate(templateName, data = {}) {
  const filePath = path.join(__dirname, "email_templates", templateName);
  let content = await fs.readFile(filePath, "utf8");
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    content = content.replace(regex, String(value));
  }
  return content;
}

async function sendTemplate(to, subject, templateName, data = {}) {
  const text = await renderTemplate(templateName, data);
  if (useSendGrid) {
    await sgMail.send({ from: config.emailFrom, to, subject, text });
  } else if (transporter) {
    await transporter.sendMail({ from: config.emailFrom, to, subject, text });
  }
}

module.exports = { sendMail, sendTemplate, sendMailWithAttachment };

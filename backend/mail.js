async function sendMail(to, subject, text) {
  // Placeholder mail utility - integrate with real email service in production
  console.log(`Sending mail to ${to}: ${subject}`);
  return Promise.resolve();
}

module.exports = { sendMail };

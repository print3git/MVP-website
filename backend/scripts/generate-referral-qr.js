require('dotenv').config();
const QRCode = require('qrcode');
const path = require('path');

(async () => {
  try {
    const url = (process.env.SITE_URL || 'http://localhost:3000') + '/earn-rewards.html';
    const outPath = path.join(__dirname, '..', 'uploads', 'referral-qr.png');
    await QRCode.toFile(outPath, url, { width: 256 });
    console.log('QR code saved to', outPath);
  } catch (err) {
    console.error('Failed to generate QR code', err);
    process.exit(1);
  }
})();

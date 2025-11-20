// scripts/generate-universal-qr.js
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Set this to the URL you want the QR to point to.
// For local testing:
const target = process.argv[2] || 'http://localhost:3000/purity';

// Output file (PNG)
const outDir = path.join(__dirname, '..', 'qrs');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const outPath = path.join(outDir, `hydrin-universal-qr.png`);

QRCode.toFile(outPath, target, { width: 800 }, function (err) {
  if (err) return console.error('Failed to create QR', err);
  console.log('Saved QR to', outPath);
  console.log('QR points to', target);
});

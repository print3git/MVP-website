const fs = require('fs');
const path = require('path');

function writePng(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+cY7kAAAAASUVORK5CYII=';
  fs.writeFileSync(filePath, Buffer.from(pngBase64, 'base64'));
}

module.exports = { writePng };

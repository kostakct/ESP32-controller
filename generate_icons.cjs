const fs = require('fs');
const { createCanvas } = require('canvas');

function createIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, size, size);
  
  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size/4}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ESP', size/2, size/2 - size/10);
  ctx.fillText('IoT', size/2, size/2 + size/10);
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`./public/icon-${size}.png`, buffer);
}

createIcon(192);
createIcon(512);
console.log('Icons generated!');

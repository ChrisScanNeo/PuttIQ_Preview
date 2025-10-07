// Install sharp first: npm install sharp
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createAppIcon() {
  const inputPath = path.join(__dirname, '../assets/Icon_nobackground.jpg');
  const outputPath = path.join(__dirname, '../assets/icon.png');

  console.log('Creating 1024x1024 PNG app icon...');

  try {
    await sharp(inputPath)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0 } // Black background
      })
      .png()
      .toFile(outputPath);

    console.log('✅ Icon created successfully:', outputPath);
    console.log('Now update app.config.js to use "./assets/icon.png"');
  } catch (error) {
    console.error('❌ Error creating icon:', error);
  }
}

createAppIcon();

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '../public/dualmind-logo.png');
const tempPath = path.join(__dirname, '../public/dualmind-logo-temp.png');

async function processLogo() {
  try {
    // Read the image
    const image = sharp(logoPath);
    const metadata = await image.metadata();
    
    // Create a mask to remove white background
    // Threshold: pixels with RGB > 240 will be made transparent
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // Process pixels to make white transparent
    const pixels = new Uint8Array(data);
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      
      // If pixel is white or very light, make it transparent
      if (r > 240 && g > 240 && b > 240) {
        pixels[i + 3] = 0; // Set alpha to 0 (transparent)
      }
    }
    
    // Save processed image
    await sharp(pixels, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4
      }
    })
    .png()
    .toFile(tempPath);
    
    // Replace original with processed version
    fs.renameSync(tempPath, logoPath);
    
    console.log('✓ Logo processed successfully with transparent background');
  } catch (error) {
    console.error('Error processing logo:', error);
    // Clean up temp file if it exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    process.exit(1);
  }
}

processLogo();

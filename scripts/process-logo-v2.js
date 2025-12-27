const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '../public/dualmind-logo.png');
const tempPath = path.join(__dirname, '../public/dualmind-logo-temp.png');

async function processLogo() {
  try {
    // Read the original image
    const image = sharp(logoPath);
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const pixels = new Uint8Array(data);
    
    // Process pixels: make white transparent AND darken the logo for visibility
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];
      
      // If pixel is white or very light, make it transparent
      if (r > 240 && g > 240 && b > 240) {
        pixels[i + 3] = 0; // Transparent
      } else {
        // Darken the logo colors to make it more visible on white
        // Reduce brightness by 30% and increase contrast
        pixels[i] = Math.max(0, Math.min(255, r * 0.7)); // Darken red
        pixels[i + 1] = Math.max(0, Math.min(255, g * 0.7)); // Darken green
        pixels[i + 2] = Math.max(0, Math.min(255, b * 0.7)); // Darken blue
        // Keep alpha as is (or make it fully opaque if it was semi-transparent)
        if (a < 255) {
          pixels[i + 3] = 255; // Make fully opaque
        }
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
    if (fs.existsSync(logoPath)) {
      fs.unlinkSync(logoPath);
    }
    fs.renameSync(tempPath, logoPath);
    
    console.log('✓ Logo processed: white background removed and colors darkened for visibility');
  } catch (error) {
    console.error('Error processing logo:', error);
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    process.exit(1);
  }
}

processLogo();


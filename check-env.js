#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(__dirname, '.env');

// Check if .env exists
if (!fs.existsSync(envPath)) {
  console.log('❌ .env file does not exist. Creating it...');
  createEnvFile();
} else {
  console.log('✅ .env file exists. Checking contents...');
  checkEnvFile();
}

function createEnvFile() {
  const secret = crypto.randomBytes(32).toString('base64');
  const content = `# Database
DATABASE_URL="file:./dev.db"

# NextAuth - REQUIRED!
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="${secret}"

# Google OAuth (Optional - only if you want Google sign-in)
# GOOGLE_CLIENT_ID="your-google-client-id"
# GOOGLE_CLIENT_SECRET="your-google-client-secret"
`;

  fs.writeFileSync(envPath, content);
  console.log('✅ Created .env file with NEXTAUTH_SECRET');
  console.log('\n⚠️  IMPORTANT: Restart your dev server for changes to take effect!');
}

function checkEnvFile() {
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  
  let hasDatabaseUrl = false;
  let hasNextAuthUrl = false;
  let hasNextAuthSecret = false;
  
  lines.forEach(line => {
    if (line.includes('DATABASE_URL') && !line.trim().startsWith('#')) {
      hasDatabaseUrl = true;
    }
    if (line.includes('NEXTAUTH_URL') && !line.trim().startsWith('#')) {
      hasNextAuthUrl = true;
    }
    if (line.includes('NEXTAUTH_SECRET') && !line.trim().startsWith('#')) {
      const secret = line.split('=')[1]?.trim().replace(/['"]/g, '');
      if (secret && secret.length > 10) {
        hasNextAuthSecret = true;
      }
    }
  });
  
  console.log('\n📋 Environment Variables Status:');
  console.log(`  DATABASE_URL: ${hasDatabaseUrl ? '✅' : '❌ MISSING'}`);
  console.log(`  NEXTAUTH_URL: ${hasNextAuthUrl ? '✅' : '❌ MISSING'}`);
  console.log(`  NEXTAUTH_SECRET: ${hasNextAuthSecret ? '✅' : '❌ MISSING OR INVALID'}`);
  
  if (!hasNextAuthSecret) {
    console.log('\n❌ NEXTAUTH_SECRET is missing or invalid!');
    console.log('This is REQUIRED for authentication to work.');
    console.log('\n🔧 Fixing...');
    
    // Read existing content
    let newContent = content;
    
    // Remove old NEXTAUTH_SECRET if exists
    newContent = newContent.split('\n').filter(line => 
      !line.includes('NEXTAUTH_SECRET')
    ).join('\n');
    
    // Add new secret
    const secret = crypto.randomBytes(32).toString('base64');
    if (!newContent.includes('NEXTAUTH_SECRET')) {
      if (!newContent.includes('NEXTAUTH_URL')) {
        newContent += '\nNEXTAUTH_URL="http://localhost:3000"\n';
      }
      newContent += `NEXTAUTH_SECRET="${secret}"\n`;
    }
    
    fs.writeFileSync(envPath, newContent);
    console.log('✅ Added NEXTAUTH_SECRET to .env file');
    console.log('\n⚠️  IMPORTANT: Restart your dev server for changes to take effect!');
  } else if (!hasDatabaseUrl || !hasNextAuthUrl) {
    console.log('\n⚠️  Some required variables are missing. Updating...');
    let newContent = content;
    
    if (!hasDatabaseUrl && !newContent.includes('DATABASE_URL')) {
      newContent = `DATABASE_URL="file:./dev.db"\n${newContent}`;
    }
    
    if (!hasNextAuthUrl && !newContent.includes('NEXTAUTH_URL')) {
      newContent += '\nNEXTAUTH_URL="http://localhost:3000"\n';
    }
    
    fs.writeFileSync(envPath, newContent);
    console.log('✅ Updated .env file');
    console.log('\n⚠️  IMPORTANT: Restart your dev server for changes to take effect!');
  } else {
    console.log('\n✅ All required environment variables are set!');
    console.log('If you\'re still having issues, try restarting your dev server.');
  }
}


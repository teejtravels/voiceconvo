require('dotenv').config();
const fs = require('fs');
const { exec } = require('child_process');

async function verifySetup() {
  console.log('Verifying Google Cloud Setup...\n');
  
  // 1. Check environment variables
  console.log('1. Environment Variables:');
  console.log('GOOGLE_CLOUD_PROJECT:', process.env.GOOGLE_CLOUD_PROJECT || 'Not set');
  console.log('GOOGLE_CLOUD_LOCATION:', process.env.GOOGLE_CLOUD_LOCATION || 'Not set');
  console.log('GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS || 'Not set');

  // 2. Check credentials file
  console.log('\n2. Credentials File:');
  try {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!credPath) {
      throw new Error('Credentials path not set');
    }
    
    const stats = fs.statSync(credPath);
    const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    
    console.log('File exists:', true);
    console.log('File size:', stats.size, 'bytes');
    console.log('Project ID in credentials:', creds.project_id);
    console.log('Client email:', creds.client_email);
  } catch (error) {
    console.log('Error checking credentials:', error.message);
  }

  // 3. Print current working directory
  console.log('\n3. Current Directory:');
  console.log('CWD:', process.cwd());
  
  // 4. Check file paths
  console.log('\n4. Relevant Files:');
  const files = [
    '.env',
    'config/google-credentials.json',
    'src/server.js'
  ];
  
  files.forEach(file => {
    console.log(`${file}:`, fs.existsSync(file) ? 'Exists' : 'Missing');
  });
}

verifySetup();
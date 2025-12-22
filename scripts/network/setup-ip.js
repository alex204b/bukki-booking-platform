const os = require('os');
const fs = require('fs');
const path = require('path');

/**
 * Automatically detect local IP address and update .env files
 * Run this script whenever you change networks (home, work, travel, etc.)
 */

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();

  // Look for IPv4 address on WiFi or Ethernet adapter
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }

  return 'localhost';
}

function updateEnvFile(filePath, key, newValue) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Check if the key exists
    const regex = new RegExp(`^${key}=.*$`, 'm');

    if (regex.test(content)) {
      // Update existing value
      content = content.replace(regex, `${key}=${newValue}`);
    } else {
      // Add new line if key doesn't exist
      content += `\n${key}=${newValue}\n`;
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔍 Detecting your local IP address...\n');

  const localIp = getLocalIpAddress();

  if (localIp === 'localhost') {
    console.log('❌ Could not detect local IP address.');
    console.log('   Make sure you are connected to WiFi or Ethernet.\n');
    process.exit(1);
  }

  console.log(`📍 Detected IP: ${localIp}\n`);
  console.log('📝 Updating configuration files...\n');

  // Update backend .env
  const backendEnv = path.join(__dirname, 'backend', '.env');
  updateEnvFile(backendEnv, 'FRONTEND_URL', `http://${localIp}:3001`);

  // Update frontend .env
  const frontendEnv = path.join(__dirname, 'frontend', '.env');
  updateEnvFile(frontendEnv, 'REACT_APP_API_URL', `http://${localIp}:3000`);

  // Update frontend .env.local
  const frontendEnvLocal = path.join(__dirname, 'frontend', '.env.local');
  updateEnvFile(frontendEnvLocal, 'REACT_APP_API_URL', `http://${localIp}:3000`);

  console.log('\n✨ Configuration updated successfully!\n');
  console.log('📌 Your apps will now use:');
  console.log(`   Backend:  http://${localIp}:3000`);
  console.log(`   Frontend: http://${localIp}:3001\n`);
  console.log('⚠️  Remember to restart both backend and frontend servers!\n');
  console.log('   Backend:  cd backend && npm run start:dev');
  console.log('   Frontend: cd frontend && npm start\n');
}

main();

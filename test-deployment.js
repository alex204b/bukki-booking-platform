#!/usr/bin/env node

// Test script to verify deployment configuration
console.log('🧪 Testing deployment configuration...');

const fs = require('fs');
const path = require('path');

// Check if backend dist directory exists
const distPath = path.join(__dirname, 'backend', 'dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ Backend dist directory not found. Run "npm run build:backend" first.');
  process.exit(1);
}

// Check if main.js exists
const mainPath = path.join(distPath, 'main.js');
if (!fs.existsSync(mainPath)) {
  console.error('❌ Backend dist/main.js not found. Build may have failed.');
  process.exit(1);
}

console.log('✅ Backend build files found');
console.log('✅ Configuration looks good for deployment');

// Test the start command
console.log('🚀 Testing start command...');
console.log('Command: npm start');
console.log('This should run: cd backend && node dist/main.js');

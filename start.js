#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Bukki Booking Platform Backend...');
console.log('Working directory:', process.cwd());

// Change to backend directory and start the app
const backendPath = path.join(__dirname, 'backend');
process.chdir(backendPath);

console.log('Changed to backend directory:', process.cwd());

// Start the application
const child = spawn('node', ['dist/main.js'], {
  stdio: 'inherit',
  env: process.env
});

child.on('error', (error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`Application exited with code ${code}`);
  process.exit(code);
});

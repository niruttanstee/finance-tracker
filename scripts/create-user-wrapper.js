// Wrapper to load dotenv before running user creation
require('dotenv').config({ path: '.env.local' });

const { spawn } = require('child_process');
const path = require('path');

const script = process.argv[2];
const args = process.argv.slice(3);

const child = spawn('npx', ['tsx', script, ...args], {
  stdio: 'inherit',
  cwd: process.cwd()
});

child.on('exit', (code) => process.exit(code || 0));
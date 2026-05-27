const { spawn } = require('child_process');
const path = require('path');

function runCommand(command, args, cwd, label, color) {
  const child = spawn(command, args, {
    cwd,
    shell: true,
    stdio: 'pipe',
    env: { ...process.env, FORCE_COLOR: 'true' }
  });

  child.stdout.on('data', (data) => {
    process.stdout.write(`\x1b[${color}m[${label}]\x1b[0m ${data}`);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(`\x1b[${color}m[${label}]\x1b[0m ${data}`);
  });

  child.on('close', (code) => {
    console.log(`[${label}] process exited with code ${code}`);
    process.exit(code);
  });

  return child;
}

console.log('\x1b[35m%s\x1b[0m', '=== Starting kabSUBO Development Environment ===');

// 1. Start PHP Backend
const backendDir = path.join(__dirname, '..', '..', 'backend');
const phpArgs = ['-S', 'localhost:8080'];
runCommand('php', phpArgs, backendDir, 'Backend', '33'); // Yellow

// 2. Start Next.js Frontend
const frontendDir = path.join(__dirname, '..');
runCommand('npm', ['run', 'dev'], frontendDir, 'Frontend', '36'); // Cyan

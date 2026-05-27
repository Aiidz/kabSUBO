const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('\x1b[36m%s\x1b[0m', '=== kabSUBO Database Setup ===');

  // Try to find the database directory
  // Possible locations: ../database (relative to kabsubo/scripts) or ./database (if run from root)
  const possiblePaths = [
    path.join(__dirname, '..', '..', 'database'),
    path.join(process.cwd(), 'database'),
    path.join(process.cwd(), '..', 'database')
  ];

  let dbDir = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      dbDir = p;
      break;
    }
  }

  if (!dbDir) {
    console.error('\x1b[31m%s\x1b[0m', 'Error: "database" directory not found.');
    console.log('Please make sure you have the "database" folder in the project root.');
    rl.close();
    process.exit(1);
  }

  console.log(`Found database files in: ${dbDir}`);

  // Setup .env.local if it doesn't exist
  const envPath = path.join(process.cwd(), '.env.local');
  const envExamplePath = path.join(process.cwd(), 'env.local.example');
  
  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    console.log('Creating .env.local from env.local.example...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('\x1b[32mSuccessfully created .env.local\x1b[0m');
  }

  const dbUser = await ask('MySQL Username (default: root): ') || 'root';
  const dbPass = await ask('MySQL Password (press enter if none): ');

  const files = [
    'schema.sql',
    'seed.sql',
    'advanced.sql'
  ];

  console.log('\nStarting import...');

  for (const file of files) {
    const filePath = path.join(dbDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`\x1b[33mWarning: ${file} not found, skipping...\x1b[0m`);
      continue;
    }

    console.log(`Importing ${file}...`);
    try {
      // Use -e "source file" for better cross-platform support with paths containing spaces
      const passArg = dbPass ? `-p"${dbPass}"` : '';
      const command = `mysql -u ${dbUser} ${passArg} --batch -e "source ${filePath.replace(/\\/g, '/')}"`;
      
      execSync(command, { stdio: 'inherit' });
      console.log(`\x1b[32mSuccessfully imported ${file}\x1b[0m`);
    } catch (error) {
      console.error(`\x1b[31mFailed to import ${file}.\x1b[0m`);
      console.log('\nTroubleshooting:');
      console.log('1. Is MySQL running?');
      console.log('2. Is "mysql" in your system PATH?');
      console.log('3. Are your credentials correct?');
      rl.close();
      process.exit(1);
    }
  }

  console.log('\n\x1b[32m%s\x1b[0m', '=== Database setup complete! ===');
  rl.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * hawkts-switch CLI
 * Build .hts (Hawk TypeScript) files with custom switch syntax
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import transformer from built package
const { transformCustomSwitch } = require('../dist/transformer');

const args = process.argv.slice(2);
const cwd = process.cwd();

// Parse arguments
let srcDir = 'src';
let outDir = 'dist';
let tsconfigPath = 'tsconfig.json';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--src' && args[i + 1]) {
    srcDir = args[++i];
  } else if (args[i] === '--out' && args[i + 1]) {
    outDir = args[++i];
  } else if (args[i] === '--project' || args[i] === '-p') {
    if (args[i + 1]) {
      tsconfigPath = args[++i];
    }
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
hawkts-switch - Build Hawk TypeScript (.hts) files

Usage: hawkts-switch [options]

Options:
  --src <dir>       Source directory (default: src)
  --out <dir>       Output directory (default: dist)
  -p, --project     Path to tsconfig.json (default: tsconfig.json)
  -h, --help        Show this help message

File Extensions:
  .hts              Hawk TypeScript - uses custom switch syntax
  .ts               Standard TypeScript - copied as-is

Example:
  hawkts-switch
  hawkts-switch --src ./source --out ./build
  hawkts-switch -p tsconfig.build.json
`);
    process.exit(0);
  }
}

const TEMP_DIR = path.join(cwd, '.hawkts-temp');
const SRC_PATH = path.join(cwd, srcDir);
const OUT_PATH = path.join(cwd, outDir);
const TSCONFIG_PATH = path.join(cwd, tsconfigPath);

async function main() {
  console.log('🔄 hawkts-switch build');
  console.log('======================\n');

  try {
    // Verify source directory exists
    if (!fs.existsSync(SRC_PATH)) {
      console.error(`❌ Source directory not found: ${srcDir}`);
      process.exit(1);
    }

    // Step 1: Clean temp directory
    console.log('1. Preparing temp directory...');
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true });
    }
    fs.mkdirSync(TEMP_DIR, { recursive: true });

    // Step 2: Process source files
    console.log('2. Transforming source files...');
    processDirectory(SRC_PATH, TEMP_DIR);

    // Step 3: Create tsconfig for temp directory
    console.log('3. Configuring TypeScript...');
    let tsconfig = {};
    if (fs.existsSync(TSCONFIG_PATH)) {
      tsconfig = JSON.parse(fs.readFileSync(TSCONFIG_PATH, 'utf-8'));
    }

    // Adjust paths for temp directory
    tsconfig.compilerOptions = tsconfig.compilerOptions || {};
    tsconfig.compilerOptions.rootDir = '.';
    tsconfig.compilerOptions.outDir = OUT_PATH;

    // Remove the plugin from compilerOptions (not needed at build time)
    if (tsconfig.compilerOptions.plugins) {
      tsconfig.compilerOptions.plugins = tsconfig.compilerOptions.plugins.filter(
        p => !p.name || !p.name.includes('hawkts-switch')
      );
      if (tsconfig.compilerOptions.plugins.length === 0) {
        delete tsconfig.compilerOptions.plugins;
      }
    }

    tsconfig.include = ['./**/*'];
    tsconfig.exclude = ['node_modules'];

    fs.writeFileSync(
      path.join(TEMP_DIR, 'tsconfig.json'),
      JSON.stringify(tsconfig, null, 2)
    );

    // Step 4: Run TypeScript compiler
    console.log('4. Compiling TypeScript...');
    try {
      execSync('npx tsc -p tsconfig.json', {
        cwd: TEMP_DIR,
        stdio: 'inherit'
      });
    } catch (error) {
      console.error('\n❌ TypeScript compilation failed');
      // Clean up before exit
      fs.rmSync(TEMP_DIR, { recursive: true });
      process.exit(1);
    }

    // Step 5: Clean up
    console.log('5. Cleaning up...');
    fs.rmSync(TEMP_DIR, { recursive: true });

    console.log('\n✅ Build completed successfully!');
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    // Try to clean up
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true });
    }
    process.exit(1);
  }
}

function processDirectory(srcPath, destPath) {
  const entries = fs.readdirSync(srcPath, { withFileTypes: true });

  for (const entry of entries) {
    const srcFile = path.join(srcPath, entry.name);
    let destFile = path.join(destPath, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destFile, { recursive: true });
      processDirectory(srcFile, destFile);
    } else if (entry.isFile()) {
      // Handle .hts files (Hawk TypeScript) - transform and rename to .ts
      if (entry.name.endsWith('.hts')) {
        const content = fs.readFileSync(srcFile, 'utf-8');
        const transformed = transformCustomSwitch(content);
        // Change extension from .hts to .ts
        destFile = destFile.replace(/\.hts$/, '.ts');
        fs.writeFileSync(destFile, transformed);
        console.log(`   ✓ Transformed: ${path.relative(cwd, srcFile)} → ${path.basename(destFile)}`);
      }
      // Handle .htsx files (Hawk TSX) - transform and rename to .tsx
      else if (entry.name.endsWith('.htsx')) {
        const content = fs.readFileSync(srcFile, 'utf-8');
        const transformed = transformCustomSwitch(content);
        destFile = destFile.replace(/\.htsx$/, '.tsx');
        fs.writeFileSync(destFile, transformed);
        console.log(`   ✓ Transformed: ${path.relative(cwd, srcFile)} → ${path.basename(destFile)}`);
      }
      // Copy .ts/.tsx files as-is
      else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        fs.copyFileSync(srcFile, destFile);
      }
      // Copy other files as-is
      else {
        fs.copyFileSync(srcFile, destFile);
      }
    }
  }
}

main();

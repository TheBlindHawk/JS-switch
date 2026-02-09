#!/usr/bin/env node
/**
 * HawkTS CLI
 * Build .hts (Hawk TypeScript) files with enhanced syntax
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import transformer from built package
const { transform } = require('../dist/core/transformer');

const args = process.argv.slice(2);
const cwd = process.cwd();

// Parse arguments
let srcDir = 'src';
let outDir = 'dist';
let tsconfigPath = 'tsconfig.json';
let features = null; // null = all enabled

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--src' && args[i + 1]) {
    srcDir = args[++i];
  } else if (args[i] === '--out' && args[i + 1]) {
    outDir = args[++i];
  } else if (args[i] === '--project' || args[i] === '-p') {
    if (args[i + 1]) {
      tsconfigPath = args[++i];
    }
  } else if (args[i] === '--features' && args[i + 1]) {
    // Parse comma-separated features
    const featureList = args[++i].split(',').map(f => f.trim());
    features = {};
    for (const f of featureList) {
      features[f] = true;
    }
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
hawkts - Build Hawk TypeScript (.hts) files

Usage: hawkts [options]

Options:
  --src <dir>         Source directory (default: src)
  --out <dir>         Output directory (default: dist)
  -p, --project       Path to tsconfig.json (default: tsconfig.json)
  --features <list>   Comma-separated list of features to enable
  -h, --help          Show this help message

File Extensions:
  .hts                Hawk TypeScript - uses enhanced syntax
  .htsx               Hawk TSX - enhanced syntax with JSX
  .ts, .tsx           Standard TypeScript - copied as-is

Features:
  switch              Multi-value cases, auto-break, fall-through (:>)

Example:
  hawkts
  hawkts --src ./source --out ./build
  hawkts --features switch
  hawkts -p tsconfig.build.json
`);
    process.exit(0);
  } else if (args[i] === '--version' || args[i] === '-v') {
    const pkg = require('../package.json');
    console.log(`hawkts v${pkg.version}`);
    process.exit(0);
  }
}

const TEMP_DIR = path.join(cwd, '.hawkts-temp');
const SRC_PATH = path.join(cwd, srcDir);
const OUT_PATH = path.join(cwd, outDir);
const TSCONFIG_PATH = path.join(cwd, tsconfigPath);

// Build config
const config = features ? { features } : {};

async function main() {
  console.log('🦅 HawkTS Build');
  console.log('===============\n');

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
    const stats = processDirectory(SRC_PATH, TEMP_DIR);
    console.log(`   Processed: ${stats.hts} .hts, ${stats.htsx} .htsx, ${stats.ts} .ts files`);

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

    // Remove hawkts plugin from compilerOptions (not needed at build time)
    if (tsconfig.compilerOptions.plugins) {
      tsconfig.compilerOptions.plugins = tsconfig.compilerOptions.plugins.filter(
        p => !p.name || !p.name.includes('hawkts')
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
      fs.rmSync(TEMP_DIR, { recursive: true });
      process.exit(1);
    }

    // Step 5: Clean up
    console.log('5. Cleaning up...');
    fs.rmSync(TEMP_DIR, { recursive: true });

    console.log('\n✅ Build completed successfully!');
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true });
    }
    process.exit(1);
  }
}

function processDirectory(srcPath, destPath) {
  const stats = { hts: 0, htsx: 0, ts: 0 };
  const entries = fs.readdirSync(srcPath, { withFileTypes: true });

  for (const entry of entries) {
    const srcFile = path.join(srcPath, entry.name);
    let destFile = path.join(destPath, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules and hidden directories
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }
      fs.mkdirSync(destFile, { recursive: true });
      const subStats = processDirectory(srcFile, destFile);
      stats.hts += subStats.hts;
      stats.htsx += subStats.htsx;
      stats.ts += subStats.ts;
    } else if (entry.isFile()) {
      // Handle .hts files - transform and rename to .ts
      if (entry.name.endsWith('.hts')) {
        const content = fs.readFileSync(srcFile, 'utf-8');
        const transformed = transform(content, config);
        destFile = destFile.replace(/\.hts$/, '.ts');
        fs.writeFileSync(destFile, transformed);
        stats.hts++;
        if (content !== transformed) {
          console.log(`   ✓ ${path.relative(cwd, srcFile)} → ${path.basename(destFile)}`);
        }
      }
      // Handle .htsx files - transform and rename to .tsx
      else if (entry.name.endsWith('.htsx')) {
        const content = fs.readFileSync(srcFile, 'utf-8');
        const transformed = transform(content, config);
        destFile = destFile.replace(/\.htsx$/, '.tsx');
        fs.writeFileSync(destFile, transformed);
        stats.htsx++;
        if (content !== transformed) {
          console.log(`   ✓ ${path.relative(cwd, srcFile)} → ${path.basename(destFile)}`);
        }
      }
      // Copy .ts/.tsx files as-is
      else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        fs.copyFileSync(srcFile, destFile);
        stats.ts++;
      }
      // Copy other files as-is (json, etc.)
      else {
        fs.copyFileSync(srcFile, destFile);
      }
    }
  }

  return stats;
}

main();

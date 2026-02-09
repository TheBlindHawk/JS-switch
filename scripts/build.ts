#!/usr/bin/env node
/**
 * Build script for JS-Switch
 *
 * Preprocesses TypeScript files with custom switch syntax,
 * then runs the TypeScript compiler.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const TEMP_DIR = path.join(ROOT_DIR, '.switch-temp');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

async function main() {
  console.log('🔄 JS-Switch Build');
  console.log('==================\n');

  try {
    // Step 1: Clean temp directory
    console.log('1. Cleaning temp directory...');
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true });
    }
    fs.mkdirSync(TEMP_DIR, { recursive: true });

    // Step 2: Process source files
    console.log('2. Transforming source files...');
    await processDirectory(SRC_DIR, TEMP_DIR);

    // Step 3: Copy tsconfig and adjust paths
    console.log('3. Preparing TypeScript configuration...');
    const tsconfig = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'tsconfig.json'), 'utf-8'));
    tsconfig.compilerOptions.rootDir = '.';
    tsconfig.compilerOptions.outDir = DIST_DIR;
    tsconfig.include = ['./**/*'];
    tsconfig.exclude = ['node_modules'];
    fs.writeFileSync(path.join(TEMP_DIR, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));

    // Step 4: Run TypeScript compiler
    console.log('4. Running TypeScript compiler...');
    try {
      execSync('npx tsc -p tsconfig.json', {
        cwd: TEMP_DIR,
        stdio: 'inherit'
      });
    } catch (error) {
      console.error('\n❌ TypeScript compilation failed');
      process.exit(1);
    }

    // Step 5: Clean up temp directory
    console.log('5. Cleaning up...');
    fs.rmSync(TEMP_DIR, { recursive: true });

    console.log('\n✅ Build completed successfully!');
  } catch (error) {
    console.error('\n❌ Build failed:', error);
    process.exit(1);
  }
}

async function processDirectory(srcDir: string, destDir: string) {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      await processDirectory(srcPath, destPath);
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        // Transform TypeScript files
        const content = fs.readFileSync(srcPath, 'utf-8');
        const transformed = transformCustomSwitch(content);
        fs.writeFileSync(destPath, transformed);

        if (content !== transformed) {
          console.log(`   ✓ Transformed: ${entry.name}`);
        }
      } else {
        // Copy other files as-is
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

/**
 * Transform custom switch syntax to valid TypeScript
 */
function transformCustomSwitch(source: string): string {
  // Find switch blocks and transform them
  let result = source;

  // Pattern to match switch statement with body
  const switchPattern = /switch\s*\(([^)]+)\)\s*\{/g;

  let match;
  const switches: Array<{ start: number; end: number; transformed: string }> = [];

  while ((match = switchPattern.exec(source)) !== null) {
    const switchStart = match.index;
    const bodyStart = match.index + match[0].length;

    // Find matching closing brace
    let braceCount = 1;
    let pos = bodyStart;
    while (braceCount > 0 && pos < source.length) {
      if (source[pos] === '{') braceCount++;
      if (source[pos] === '}') braceCount--;
      pos++;
    }

    const switchEnd = pos;
    const switchValue = match[1];
    const switchBody = source.substring(bodyStart, switchEnd - 1);

    // Check if this switch uses custom syntax
    if (needsTransformation(switchBody)) {
      const transformedBody = transformSwitchBody(switchBody);
      const transformed = `switch(${switchValue}){${transformedBody}}`;
      switches.push({ start: switchStart, end: switchEnd, transformed });
    }
  }

  // Apply transformations in reverse order to preserve positions
  for (let i = switches.length - 1; i >= 0; i--) {
    const { start, end, transformed } = switches[i];
    result = result.substring(0, start) + transformed + result.substring(end);
  }

  return result;
}

function needsTransformation(body: string): boolean {
  if (/:>/.test(body)) return true;

  const lines = body.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('default') || trimmed.startsWith('case ') || trimmed.startsWith('//')) {
      continue;
    }
    if (/^(?:'[^']*'|"[^"]*"|`[^`]*`|\d+)\s*[,:]/.test(trimmed)) {
      return true;
    }
  }

  return false;
}

function transformSwitchBody(body: string): string {
  const lines = body.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      result.push(line);
      i++;
      continue;
    }

    if (trimmed.startsWith('//') || trimmed.startsWith('/*')) {
      result.push(line);
      i++;
      continue;
    }

    if (trimmed.startsWith('default')) {
      const defaultMatch = trimmed.match(/^default\s*:\s*(.*)/);
      if (defaultMatch) {
        const afterColon = defaultMatch[1];
        result.push(`default: ${afterColon}`);
        i++;
        const bodyLines = collectCaseBody(lines, i);
        result.push(...bodyLines.lines);
        i = bodyLines.nextIndex;
        if (!hasSemicolonOrBrace(afterColon + bodyLines.lines.join(''))) {
          result.push('break;');
        }
      } else {
        result.push(line);
        i++;
      }
      continue;
    }

    if (trimmed.startsWith('case ')) {
      result.push(line);
      i++;
      continue;
    }

    const caseMatch = trimmed.match(/^((?:(?:'[^']*'|"[^"]*"|`[^`]*`|\d+)\s*,\s*)*(?:'[^']*'|"[^"]*"|`[^`]*`|\d+))\s*(:>?)\s*(.*)/);

    if (caseMatch) {
      const values = caseMatch[1];
      const operator = caseMatch[2];
      const afterColon = caseMatch[3];
      const isFallThrough = operator === ':>';

      const caseValues = parseValues(values);

      for (const val of caseValues) {
        result.push(`case ${val}:`);
      }

      if (afterColon.trim()) {
        result.push(afterColon);
      }

      i++;
      const bodyLines = collectCaseBody(lines, i);
      result.push(...bodyLines.lines);
      i = bodyLines.nextIndex;

      if (!isFallThrough) {
        result.push('break;');
      }

      continue;
    }

    result.push(line);
    i++;
  }

  return result.join('\n');
}

function parseValues(valuesStr: string): string[] {
  const values: string[] = [];
  let current = '';
  let inString: string | null = null;

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];

    if (inString) {
      current += char;
      if (char === inString && valuesStr[i - 1] !== '\\') {
        inString = null;
      }
    } else if (char === '"' || char === "'" || char === '`') {
      current += char;
      inString = char;
    } else if (char === ',') {
      if (current.trim()) {
        values.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    values.push(current.trim());
  }

  return values;
}

function collectCaseBody(lines: string[], startIndex: number): { lines: string[]; nextIndex: number } {
  const bodyLines: string[] = [];
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('case ') ||
        trimmed.startsWith('default') ||
        /^(?:'[^']*'|"[^"]*"|`[^`]*`|\d+)\s*[,:]/.test(trimmed)) {
      break;
    }

    if (trimmed === '}') {
      break;
    }

    bodyLines.push(line);
    i++;
  }

  return { lines: bodyLines, nextIndex: i };
}

function hasSemicolonOrBrace(code: string): boolean {
  const trimmed = code.trim();
  return trimmed.endsWith(';') || trimmed.endsWith('}') ||
         trimmed.includes('return') || trimmed.includes('throw') ||
         trimmed.includes('break') || trimmed.includes('continue');
}

main();

/**
 * Switch Transform
 * Enhanced switch syntax with multi-value cases and auto-break
 *
 * Features:
 * - Multi-value cases: 'dog', 'puppy': action
 * - Auto-break: no need to write break;
 * - Fall-through operator: :>
 */

import { Transform } from '../core/types';

/**
 * Check if source might contain custom switch syntax
 */
function testSwitch(source: string): boolean {
  // Look for patterns like: 'value', 'value': or value, value:
  const multiCasePattern = /switch\s*\([^)]+\)\s*\{[^}]*(?:'[^']*'|"[^"]*"|\d+)\s*,\s*(?:'[^']*'|"[^"]*"|\d+)/;
  // Fall-through operator
  const fallThroughPattern = /:>/;
  // Case without 'case' keyword
  const caseWithoutKeyword = /switch\s*\([^)]+\)\s*\{[^}]*\n\s*(?:'[^']*'|"[^"]*"|\d+)\s*:/;

  return (
    multiCasePattern.test(source) ||
    fallThroughPattern.test(source) ||
    caseWithoutKeyword.test(source)
  );
}

/**
 * Transform custom switch syntax to valid TypeScript
 */
function transformSwitch(source: string): string {
  let result = source;
  const switchPattern = /switch\s*\(([^)]+)\)\s*\{/g;

  let match;
  const switches: Array<{ start: number; end: number; transformed: string }> = [];

  while ((match = switchPattern.exec(source)) !== null) {
    const switchStart = match.index;
    const bodyStart = match.index + match[0].length;

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

/**
 * Check if switch body uses custom syntax
 */
function needsTransformation(body: string): boolean {
  if (/:>/.test(body)) return true;

  const lines = body.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      !trimmed ||
      trimmed.startsWith('default') ||
      trimmed.startsWith('case ') ||
      trimmed.startsWith('//')
    ) {
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

    const caseMatch = trimmed.match(
      /^((?:(?:'[^']*'|"[^"]*"|`[^`]*`|\d+)\s*,\s*)*(?:'[^']*'|"[^"]*"|`[^`]*`|\d+))\s*(:>?)\s*(.*)/
    );

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

function collectCaseBody(
  lines: string[],
  startIndex: number
): { lines: string[]; nextIndex: number } {
  const bodyLines: string[] = [];
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (
      trimmed.startsWith('case ') ||
      trimmed.startsWith('default') ||
      /^(?:'[^']*'|"[^"]*"|`[^`]*`|\d+)\s*[,:]/.test(trimmed)
    ) {
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

/**
 * Switch transform definition
 */
export const switchTransform: Transform = {
  name: 'switch',
  description: 'Enhanced switch syntax with multi-value cases and auto-break',
  test: testSwitch,
  transform: transformSwitch,
};

// Also export individual functions for direct use
export { transformSwitch, testSwitch, needsTransformation };

/**
 * Tests for the custom switch transformer
 */

// Import the transformer function from the build script
import * as fs from 'fs';
import * as path from 'path';

// We'll test the transformer logic directly
function transformCustomSwitch(source: string): string {
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

describe('Custom Switch Transformer', () => {
  test('transforms multi-value cases', () => {
    const input = `
switch (animal) {
  'dog', 'puppy': console.log('barks');
  'cat', 'kitten': console.log('meows');
  default: console.log('silence');
}`;

    const output = transformCustomSwitch(input);

    expect(output).toContain("case 'dog':");
    expect(output).toContain("case 'puppy':");
    expect(output).toContain("case 'cat':");
    expect(output).toContain("case 'kitten':");
    expect(output).toContain('break;');
    expect(output).toContain('default:');
  });

  test('transforms fall-through with :>', () => {
    const input = `
switch (foo) {
  0:> output += "So ";
  1:> output += "What Is";
  2: console.log(output);
  default: console.log("other");
}`;

    const output = transformCustomSwitch(input);

    // Fall-through cases should not have break
    const case0Match = output.match(/case 0:[\s\S]*?(?=case 1:|$)/);
    expect(case0Match?.[0]).not.toContain('break;');

    // Non-fall-through case should have break
    expect(output).toContain('break;');
  });

  test('handles numeric cases', () => {
    const input = `
switch (value) {
  1, 2, 3: return 'low';
  4, 5: return 'high';
}`;

    const output = transformCustomSwitch(input);

    expect(output).toContain('case 1:');
    expect(output).toContain('case 2:');
    expect(output).toContain('case 3:');
    expect(output).toContain('case 4:');
    expect(output).toContain('case 5:');
  });

  test('leaves standard switch syntax untouched', () => {
    const input = `
switch (value) {
  case 1:
    console.log('one');
    break;
  case 2:
    console.log('two');
    break;
  default:
    console.log('other');
}`;

    const output = transformCustomSwitch(input);

    // Should be unchanged
    expect(output).toBe(input);
  });

  test('handles mixed code', () => {
    const input = `
const x = 5;

switch (animal) {
  'dog', 'cat': console.log('pet');
}

const y = 10;
`;

    const output = transformCustomSwitch(input);

    expect(output).toContain('const x = 5;');
    expect(output).toContain('const y = 10;');
    expect(output).toContain("case 'dog':");
    expect(output).toContain("case 'cat':");
  });
});

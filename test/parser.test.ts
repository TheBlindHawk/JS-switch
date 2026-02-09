import { parseSwitch, compileSwitchToFunction, ParseError } from '../src';

describe('Custom Switch Parser', () => {
  test('シンプルなケース', () => {
    const input = `
      switch(value) {
        1: console.log("one")
        2: console.log("two")
        default: console.log("other")
      }
    `;
    
    const output = parseSwitch(input);
    expect(output).toContain('case 1:');
    expect(output).toContain('break;');
    expect(output).toContain('default:');
  });

  test('複数値のケース', () => {
    const input = `
      switch(value) {
        1, 2, 3: console.log("low")
        4, 5: console.log("medium")
      }
    `;
    
    const output = parseSwitch(input);
    expect(output).toContain('case 1:case 2:case 3:');
    expect(output).toContain('case 4:case 5:');
  });

  test('フォールスルー', () => {
    const input = `
      switch(value) {
        1, 2> console.log("will fall through")
        3: console.log("will break")
      }
    `;
    
    const output = parseSwitch(input);
    expect(output).toMatch(/case 1:case 2:console\.log\("will fall through"\)(?!break)/);
    expect(output).toContain('break;');
  });

  test('関数としてコンパイル', () => {
    const fn = compileSwitchToFunction<string>(`
      switch(value) {
        1, 2, 3: return "low"
        4, 5: return "medium"
        default: return "high"
      }
    `);

    expect(fn(1)).toBe('low');
    expect(fn(2)).toBe('low');
    expect(fn(4)).toBe('medium');
    expect(fn(10)).toBe('high');
  });

  test('パースエラーのハンドリング', () => {
    const invalid = 'switch(value) { invalid syntax }';
    
    expect(() => parseSwitch(invalid)).toThrow(ParseError);
  });
});
// @ts-ignore - 生成されたパーサーに型定義がないため
import * as parser from './parser-generated';

/**
 * カスタムswitch構文をパースして標準JavaScriptに変換
 */
export function parseSwitch(input: string): string {
  try {
    return parser.parse(input);
  } catch (error) {
    if (error instanceof Error && 'location' in error) {
      const pegError = error as any;
      throw new ParseError(
        pegError.message,
        pegError.location?.start?.line,
        pegError.location?.start?.column
      );
    }
    throw error;
  }
}

/**
 * カスタムswitch構文をパースして実行可能な関数として返す
 */
export function compileSwitchToFunction<T = any>(
  input: string,
  paramName: string = 'value'
): (value: any) => T {
  const parsed = parseSwitch(input);
  // 'switch(value)' を 'switch(${paramName})' に置換
  const code = parsed.replace(/switch\((\w+)\)/, `switch(${paramName})`);
  
  // Functionコンストラクタで関数を生成
  return new Function(paramName, code) as (value: any) => T;
}

/**
 * ファイルを読み込んでパース
 */
export async function parseSwitchFile(filePath: string): Promise<string> {
  const fs = await import('fs/promises');
  const content = await fs.readFile(filePath, 'utf-8');
  return parseSwitch(content);
}

/**
 * パースエラー
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public line?: number,
    public column?: number
  ) {
    super(
      line && column 
        ? `${message} at line ${line}, column ${column}`
        : message
    );
    this.name = 'ParseError';
  }
}

// デフォルトエクスポート
export default {
  parseSwitch,
  compileSwitchToFunction,
  parseSwitchFile,
  ParseError
};
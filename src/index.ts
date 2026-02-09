/**
 * HawkTS - Enhanced TypeScript Syntax
 *
 * A collection of syntax transforms for TypeScript:
 * - switch: Multi-value cases, auto-break, fall-through operator
 * - (more coming soon)
 */

// Core transformer
export { transform, needsTransform, getEnabledTransforms, getApplicableTransforms } from './core/transformer';

// Types and config
export { Transform, HawkTSConfig, defaultConfig } from './core/types';

// Individual transforms
export { switchTransform, transformSwitch, testSwitch } from './transforms';

// Legacy PEG.js parser (for runtime parsing)
// @ts-ignore - generated parser has no types
import * as parser from './parser-generated';

/**
 * Parse custom switch syntax using PEG.js (runtime)
 * @deprecated Use transform() for build-time transformation
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
 * Compile switch to executable function (runtime)
 * @deprecated Use transform() for build-time transformation
 */
export function compileSwitchToFunction<T = any>(
  input: string,
  paramName: string = 'value'
): (value: any) => T {
  const parsed = parseSwitch(input);
  const code = parsed.replace(/switch\((\w+)\)/, `switch(${paramName})`);
  return new Function(paramName, code) as (value: any) => T;
}

/**
 * Parse error with location information
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public line?: number,
    public column?: number
  ) {
    super(line && column ? `${message} at line ${line}, column ${column}` : message);
    this.name = 'ParseError';
  }
}

// Default export for convenience
export default {
  transform: require('./core/transformer').transform,
  parseSwitch,
  ParseError,
};

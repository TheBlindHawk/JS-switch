/**
 * HawkTS Core Types
 */

/**
 * A transform that converts custom syntax to valid TypeScript
 */
export interface Transform {
  /** Unique identifier for this transform */
  name: string;

  /** Human-readable description */
  description: string;

  /** Check if source code contains syntax this transform handles */
  test: (code: string) => boolean;

  /** Transform the source code */
  transform: (code: string) => string;
}

/**
 * Configuration for HawkTS
 */
export interface HawkTSConfig {
  /** Which transforms to enable (default: all) */
  features?: {
    switch?: boolean;
    // Future features:
    // pipe?: boolean;
    // match?: boolean;
  };

  /** Source directory */
  srcDir?: string;

  /** Output directory */
  outDir?: string;

  /** Path to tsconfig.json */
  tsconfig?: string;
}

/**
 * Default configuration
 */
export const defaultConfig: Required<HawkTSConfig> = {
  features: {
    switch: true,
  },
  srcDir: 'src',
  outDir: 'dist',
  tsconfig: 'tsconfig.json',
};

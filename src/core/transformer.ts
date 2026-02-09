/**
 * HawkTS Core Transformer
 * Orchestrates all syntax transforms
 */

import { Transform, HawkTSConfig, defaultConfig } from './types';

// Import transforms
import { switchTransform } from '../transforms/switch';

/**
 * Registry of all available transforms
 */
const allTransforms: Transform[] = [
  switchTransform,
  // Future transforms:
  // pipeTransform,
  // matchTransform,
];

/**
 * Get enabled transforms based on config
 */
export function getEnabledTransforms(config: HawkTSConfig = {}): Transform[] {
  const features = { ...defaultConfig.features, ...config.features };

  return allTransforms.filter((transform) => {
    switch (transform.name) {
      case 'switch':
        return features.switch !== false;
      // Future:
      // case 'pipe':
      //   return features.pipe !== false;
      default:
        return true;
    }
  });
}

/**
 * Transform source code using all enabled transforms
 */
export function transform(source: string, config: HawkTSConfig = {}): string {
  const transforms = getEnabledTransforms(config);
  let result = source;

  for (const t of transforms) {
    if (t.test(result)) {
      result = t.transform(result);
    }
  }

  return result;
}

/**
 * Check if source code needs any transformation
 */
export function needsTransform(source: string, config: HawkTSConfig = {}): boolean {
  const transforms = getEnabledTransforms(config);
  return transforms.some((t) => t.test(source));
}

/**
 * Get list of transforms that would apply to source
 */
export function getApplicableTransforms(source: string, config: HawkTSConfig = {}): Transform[] {
  const transforms = getEnabledTransforms(config);
  return transforms.filter((t) => t.test(source));
}

// Re-export types
export * from './types';

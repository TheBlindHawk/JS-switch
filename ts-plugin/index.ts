import type * as tslib from 'typescript/lib/tsserverlibrary';

// Import transformer from main package
// Path is relative from ts-plugin/dist/ to dist/
const { transform, needsTransform } = require('../../dist/core/transformer');

/**
 * TypeScript Language Service Plugin for HawkTS
 *
 * This plugin intercepts source files and transforms custom syntax
 * to valid TypeScript before the compiler sees it.
 */

function init(modules: { typescript: typeof tslib }): tslib.server.PluginModule {
  const ts = modules.typescript;

  function create(info: tslib.server.PluginCreateInfo): tslib.LanguageService {
    const logger = info.project.projectService.logger;
    logger.info('HawkTS plugin loaded');

    // Get the original language service
    const languageService = info.languageService;
    const languageServiceHost = info.languageServiceHost;

    // Store original getScriptSnapshot
    const originalGetScriptSnapshot = languageServiceHost.getScriptSnapshot.bind(languageServiceHost);

    // Override getScriptSnapshot to transform source files
    languageServiceHost.getScriptSnapshot = (fileName: string): tslib.IScriptSnapshot | undefined => {
      const original = originalGetScriptSnapshot(fileName);

      if (!original) {
        return undefined;
      }

      // Only process .ts and .tsx files (not .d.ts)
      if (!fileName.endsWith('.ts') && !fileName.endsWith('.tsx')) {
        return original;
      }
      if (fileName.endsWith('.d.ts')) {
        return original;
      }

      // Skip node_modules
      if (fileName.includes('node_modules')) {
        return original;
      }

      const originalText = original.getText(0, original.getLength());

      // Check if file needs transformation
      if (!needsTransform(originalText)) {
        return original;
      }

      try {
        const transformedText = transform(originalText);
        logger.info(`HawkTS: Transformed ${fileName}`);

        return ts.ScriptSnapshot.fromString(transformedText);
      } catch (error) {
        logger.info(`HawkTS: Error transforming ${fileName}: ${error}`);
        return original;
      }
    };

    return languageService;
  }

  return { create };
}

export = init;

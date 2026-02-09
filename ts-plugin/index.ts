import type * as tslib from 'typescript/lib/tsserverlibrary';

// Import transformer from main package
// Path is relative from ts-plugin/dist/ to dist/
const { transformCustomSwitch } = require('../../dist/transformer');

/**
 * TypeScript Language Service Plugin for hawkts-switch
 *
 * This plugin intercepts source files and transforms custom switch syntax
 * to valid TypeScript before the compiler sees it.
 */

function init(modules: { typescript: typeof tslib }): tslib.server.PluginModule {
  const ts = modules.typescript;

  function create(info: tslib.server.PluginCreateInfo): tslib.LanguageService {
    const logger = info.project.projectService.logger;
    logger.info('hawkts-switch plugin loaded');

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

      // Check if file contains custom switch syntax
      if (!containsCustomSwitch(originalText)) {
        return original;
      }

      try {
        const transformedText = transformCustomSwitch(originalText);
        logger.info(`hawkts-switch: Transformed ${fileName}`);

        return ts.ScriptSnapshot.fromString(transformedText);
      } catch (error) {
        logger.info(`hawkts-switch: Error transforming ${fileName}: ${error}`);
        return original;
      }
    };

    return languageService;
  }

  return { create };
}

/**
 * Quick check if source might contain custom switch syntax
 */
function containsCustomSwitch(source: string): boolean {
  // Look for patterns like: 'value', 'value': or value, value:
  // Also look for :> (fall-through operator)
  const multiCasePattern = /switch\s*\([^)]+\)\s*\{[^}]*(?:'[^']*'|"[^"]*"|\d+)\s*,\s*(?:'[^']*'|"[^"]*"|\d+)/;
  const fallThroughPattern = /:>/;
  const caseWithoutKeyword = /switch\s*\([^)]+\)\s*\{[^}]*\n\s*(?:'[^']*'|"[^"]*"|\d+)\s*:/;

  return multiCasePattern.test(source) ||
         fallThroughPattern.test(source) ||
         caseWithoutKeyword.test(source);
}

export = init;

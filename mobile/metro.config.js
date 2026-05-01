// TanStack Query v5: com `package.json#exports` o Metro usa `build/modern` e
// quebra a resolução de ficheiros relativos (ex.: ./retryer.js) no iOS/Metro.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

if (!config.resolver.sourceExts.includes('cjs')) {
  config.resolver.sourceExts.push('cjs');
}
if (!config.resolver.sourceExts.includes('mjs')) {
  config.resolver.sourceExts.push('mjs');
}

config.resolver.unstable_enablePackageExports = false;

const originalResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, realModuleName, platform, ...rest) => {
  if (realModuleName.startsWith('react-native-svg/lib/module/')) {
    const commonJsSubPath = realModuleName.replace(
      'react-native-svg/lib/module/',
      'react-native-svg/lib/commonjs/',
    );
    const normalizedSubPath = commonJsSubPath.endsWith('.js')
      ? commonJsSubPath
      : `${commonJsSubPath}.js`;
    return {
      type: 'sourceFile',
      filePath: path.join(projectRoot, 'node_modules', normalizedSubPath),
    };
  }
  if (realModuleName === '@tanstack/query-core') {
    return {
      type: 'sourceFile',
      filePath: path.join(
        projectRoot,
        'node_modules',
        '@tanstack',
        'query-core',
        'build',
        'legacy',
        'index.js',
      ),
    };
  }
  if (realModuleName === '@tanstack/react-query') {
    return {
      type: 'sourceFile',
      filePath: path.join(
        projectRoot,
        'node_modules',
        '@tanstack',
        'react-query',
        'build',
        'legacy',
        'index.js',
      ),
    };
  }
  if (realModuleName === 'react-native-svg') {
    return {
      type: 'sourceFile',
      // Forca build CommonJS para evitar parse de codegen/fabric no bundle Metro.
      filePath: path.join(
        projectRoot,
        'node_modules',
        'react-native-svg',
        'lib',
        'commonjs',
        'index.js',
      ),
    };
  }
  if (originalResolve) {
    return originalResolve(context, realModuleName, platform, ...rest);
  }
  if (typeof context?.resolveRequest === 'function') {
    return context.resolveRequest(context, realModuleName, platform, ...rest);
  }
  return null;
};

module.exports = config;

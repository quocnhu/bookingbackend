// Registers the `@/*` path alias at runtime for the compiled output in `dist/`.
const path = require('path');
const tsConfigPaths = require('tsconfig-paths');

tsConfigPaths.register({
  baseUrl: path.resolve(__dirname, 'dist'),
  paths: { '@/*': ['./*'] },
});

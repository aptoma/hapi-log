'use strict';

const {execSync} = require('child_process');
const {writeFileSync, readFileSync} = require('fs');

// Build ESM
execSync('tsc -p tsconfig.esm.json', {stdio: 'inherit'});

// Build CJS
execSync('tsc -p tsconfig.cjs.json', {stdio: 'inherit'});

// Write module type markers
writeFileSync('dist/esm/package.json', '{"type":"module"}\n');
writeFileSync('dist/cjs/package.json', '{"type":"commonjs"}\n');

// Patch CJS entry so require() returns the function directly (backward compat)
const cjsIndex = readFileSync('dist/cjs/index.js', 'utf8');
writeFileSync('dist/cjs/index.js', cjsIndex +
	'// Backward compat: require() returns the function with named exports as properties\n' +
	'module.exports = Object.assign(exports.default, exports);\n' +
	'module.exports.default = exports.default;\n'
);

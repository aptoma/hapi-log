[![Build Status](https://travis-ci.org/aptoma/hapi-log.svg)](https://travis-ci.org/aptoma/hapi-log)

# Hapi Log

A Logging plugin for Hapi

## Test & Development

Running tests

	$ npm test

Watching for changes and run all tests when developing.

	$ npm run watch

Creating releases

	$ npm run release
	$ npm run release:minor
	$ npm run release:major

## Developer friendly output

This package includes a script called `pretty-hapi-log` which can be used to parse the output and make it colorful and pretty.

Example

	node my-hapi-server.js | ./node_modules/.bin/pretty-hapi-log


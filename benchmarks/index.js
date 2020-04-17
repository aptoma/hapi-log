'use strict';

const bench = require('fastbench');
const hapiLog = require('../')({sonic: {fd: process.stderr.fd, sync: true}});

const max = 10;
const error = new Error('crap');

const run = bench([
	function benchString(cb) {
		for (let i = 0; i < max; i++) {
			hapiLog.log(['info'], 'hello world');
		}
		setImmediate(cb);
	},
	function benchError(cb) {
		for (let i = 0; i < max; i++) {
			hapiLog.log(['info'], error);
		}
		setImmediate(cb);
	},
	function benchCombined(cb) {
		for (let i = 0; i < max; i++) {
			hapiLog.log(['info'], {hello: 'world'}, error, 'Hello world');
		}
		setImmediate(cb);
	}

], 10000);

run(run);


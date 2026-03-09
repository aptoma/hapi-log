import assert from 'node:assert/strict';
import {beforeEach, describe, it} from 'node:test';
import Hapi from '@hapi/hapi';
import hapiLog, {plugin} from '../dist/index.js';

describe('Log service', () => {
	let server;
	let testHandler;

	beforeEach(async () => {
		testHandler = {
			log(data) {
				testHandler.listener(data);
			},
			listener() {}
		};
		server = new Hapi.Server({debug: false});
		await server.register({
			plugin: plugin,
			options: {handler: testHandler, jsonOutput: false}
		});
	});

	function route(path, handler, method) {
		server.route({
			method: method || 'GET',
			path: path,
			handler: handler
		});
	}

	function waitForLog() {
		return new Promise((resolve) => {
			testHandler.listener = (data) => {
				testHandler.listener = () => {};
				resolve(data);
			};
		});
	}

	it('should include meta', async () => {
		let reqId;
		route('/hello', (req) => {
			reqId = req.info.id;
			req.log(['foo'], 'bar');
			return 'hello';
		});

		const p = waitForLog();
		server.inject({method: 'GET', url: '/hello'});
		const data = await p;
		assert.ok(data.endsWith(`{"requestId":"${reqId}"}`));
	});

	it('should ignore path included in ignorePaths', async () => {
		server = new Hapi.Server({debug: false});
		await server.register({
			plugin: plugin,
			options: {handler: testHandler, jsonOutput: false, ignorePaths: ['/shouldIgnore']}
		});

		route('/shouldIgnore', () => 'hello');

		let called = false;
		testHandler.listener = () => {
			called = true;
			testHandler.listener = () => {};
		};

		await server.inject({method: 'GET', url: '/shouldIgnore'});
		assert.equal(called, false);
	});

	it('should ignore method included in ignoreMethods', async () => {
		server = new Hapi.Server({debug: false});
		await server.register({
			plugin: plugin,
			options: {handler: testHandler, jsonOutput: false, ignoreMethods: ['options']}
		});

		route('/shouldIgnore', () => 'hello', 'options');

		let called = false;
		testHandler.listener = () => {
			called = true;
			testHandler.listener = () => {};
		};

		await server.inject({method: 'OPTIONS', url: '/shouldIgnore'});
		assert.equal(called, false);
	});

	it('should output error with stack using req.log', async () => {
		route('/hello', (req) => {
			req.log(['foo'], new Error('ops'));
			return 'hello';
		});

		const p = waitForLog();
		server.inject({method: 'GET', url: '/hello'});
		const data = await p;
		assert.match(data, /Error: ops\n\s+at/);
	});

	it('should output error with stack using server.log', async () => {
		const p = waitForLog();
		server.log(['foo'], new Error('ops'));
		const data = await p;
		assert.match(data, /Error: ops\n\s+at/);
	});

	it('should handle onPreResponse', async () => {
		server = new Hapi.Server({debug: false});
		await server.register({
			plugin: plugin,
			options: {handler: testHandler, jsonOutput: false, onPreResponseError: true}
		});

		route('/error', () => {
			throw new Error('crap');
		});

		const p = waitForLog();
		server.inject({method: 'GET', url: '/error', headers: {Referer: 'http://foo.com'}});
		const data = await p;
		assert.match(data, /\[error\], crap, stack/);
	});

	it('should not log non 500 errors when using onPreResponse', async () => {
		server = new Hapi.Server({debug: false});
		server.ext('onPreResponse', (req, h) => {
			const res = req.response;
			res.output.statusCode = 400;
			res.message = 'Ops';
			res.reformat();
			return h.continue;
		});

		await server.register({
			plugin: plugin,
			options: {handler: testHandler, jsonOutput: false, onPreResponseError: true}
		});

		route('/error', () => {
			throw new Error('yikes');
		});

		const p = waitForLog();
		server.inject({method: 'GET', url: '/error', headers: {Referer: 'http://foo.com'}});
		const data = await p;
		assert.match(data, /\[response\]/);
	});

	it('should handle error', async () => {
		route('/error', () => {
			throw new Error('crap');
		});

		const p = waitForLog();
		server.inject({
			method: 'GET',
			url: '/error',
			auth: {strategy: 'default', credentials: {account: {clientId: 'example'}}}
		});
		const data = await p;
		assert.match(data, /\[error\], crap, stack/);
	});

	it('should handle response event and onPreResponseError should ignore non error', async () => {
		server = new Hapi.Server({debug: false});

		await server.register({
			plugin: plugin,
			options: {handler: testHandler, jsonOutput: false, onPreResponseError: true}
		});

		route('/hello', () => 'hello');

		const p = waitForLog();
		server.inject({method: 'GET', url: '/hello'});
		const data = await p;
		assert.match(data, /\[response\]/);
	});

	it('should use x-forwarded-for if available for response logs', async () => {
		server = new Hapi.Server({debug: false});

		await server.register({
			plugin: plugin,
			options: {handler: testHandler, jsonOutput: false, onPreResponseError: true}
		});

		route('/hello', () => 'hello');

		const p = waitForLog();
		server.inject({method: 'GET', url: '/hello', headers: {'x-forwarded-for': '12.12.12.12,10.10.10.10'}});
		const data = await p;
		assert.match(data, /\[response\], 12\.12\.12\.12/);
	});

	it('should not include contentLength if missing', async () => {
		server = new Hapi.Server({debug: false, compression: {minBytes: 1}});

		await server.register({
			plugin: plugin,
			options: {handler: testHandler}
		});

		route('/hello', () => 'hello');

		const p = waitForLog();
		server.inject({method: 'GET', url: '/hello', headers: {'Accept-Encoding': 'compress, gzip'}});
		const data = await p;
		const json = JSON.parse(data);
		assert.equal(json.contentLength, undefined);
	});

	it('should handle response event in jsonOutput', async () => {
		server = new Hapi.Server({debug: false});

		await server.register({
			plugin: plugin,
			options: {
				handler: testHandler,
				requestInfoFilter: (requestInfo) => {
					requestInfo.query = Object.assign({}, requestInfo.query, {apikey: undefined, token: '--snip--'});
					requestInfo.referer = '';
					return requestInfo;
				}
			}
		});

		route('/hello', () => 'hello');

		const p = waitForLog();
		server.inject({method: 'GET', url: '/hello?apikey=secret&token=retract', headers: {Referer: 'http://foo.com'}});
		const data = await p;
		const json = JSON.parse(data);
		for (const prop of [
			'_time',
			'_tags',
			'contentLength',
			'requestId',
			'remoteAddress',
			'host',
			'path',
			'method',
			'query',
			'statusCode',
			'responseTime',
			'userAgent',
			'referer'
		]) {
			assert.ok(prop in json, `expected property "${prop}"`);
		}
		assert.equal(json.query.apikey, undefined);
		assert.equal(json.query.token, '--snip--');
		assert.equal(json.referer, '');
	});

	it('should handle log event', async () => {
		const p = waitForLog();
		server.log('foo', {foo: 'bar'});
		const data = await p;
		assert.ok(data.endsWith("[foo], { foo: 'bar' }"));
	});

	it('should set default name for instance', () => {
		const log1 = hapiLog({});
		assert.ok(hapiLog() === log1);
	});

	it('should set name for instance', () => {
		const log1 = hapiLog('foo');
		assert.ok(hapiLog() !== log1);
		assert.ok(hapiLog('foo') === log1);
	});
});

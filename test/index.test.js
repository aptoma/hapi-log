'use strict';
const Hapi = require('hapi');
const sinon = require('sinon');
const should = require('should');
const plugin = require('../');

describe('Log service', () => {
	let server;
	let consoleSpy;
	const testHandler = {
		log: () => {
		}
	};

	beforeEach((done) => {
		consoleSpy = sinon.spy(testHandler, 'log');
		server = new Hapi.Server({debug: false});
		server.connection();
		server.register({
			register: plugin,
			options: {handler: testHandler, jsonOutput: false}
		}, (err) => {
			if (err) {
				return done(err);
			}
			done();
		});
	});

	afterEach(() => {
		testHandler.log.restore();
	});

	it('should include meta', (done) => {
		let reqId;
		route('/hello', (req, reply) => {
			reqId = req.id;
			req.log(['foo'], 'bar');
			reply('hello');
		});

		server.inject({
			method: 'GET',
			url: '/hello'
		}, () => {
			consoleSpy.firstCall.args[0].should.endWith('{"requestId":"' + reqId + '"}');
			done();
		});
	});

	it('should handle onPreResponse', (done) => {
		server = new Hapi.Server({debug: false});
		server.connection();
		server.register({
			register: plugin,
			options: {handler: testHandler, jsonOutput: false, onPreResponseError: true}
		}, (err) => {
			if (err) {
				return done(err);
			}
		});

		route('/error', (req, reply) => {
			reply(new Error('crap'));
		});

		server.inject({
			method: 'GET',
			url: '/error',
			headers: {
				Referer: 'http://foo.com'
			}
		}, () => {
			consoleSpy.firstCall.args[0].match(/Error: Uncaught error: crap/);
			done();
		});
	});

	it('should handle error', (done) => {
		route('/error', (req, reply) => {
			reply(new Error('crap'));
		});

		server.inject({
			method: 'GET',
			url: '/error',
			credentials: {account: {clientId: 'example'}}
		}, () => {
			consoleSpy.firstCall.args[0].match(/Error: Uncaught error: crap/);
			done();
		});
	});

	it('should handle response event and respons and onPreResponseError should ignore non error', (done) => {
		server = new Hapi.Server({debug: false});
		server.connection();
		server.register({
			register: plugin,
			options: {handler: testHandler, jsonOutput: false, onPreResponseError: true}
		}, (err) => {
			if (err) {
				return done(err);
			}
		});

		route('/hello', (req, reply) => {
			reply('hello');
		});

		server.inject({
			method: 'GET',
			url: '/hello'
		}, () => {
			consoleSpy.firstCall.args[0].should.match(/\[response\]/);
			done();
		});
	});

	it('should handle not include contentLength if missing', (done) => {
		server = new Hapi.Server({debug: false});
		server.connection();
		server.register({
			register: plugin,
			options: {handler: testHandler}
		}, (err) => {
			if (err) {
				return done(err);
			}
		});

		route('/hello', (req, reply) => {
			reply('hello');
		});

		server.inject({
			method: 'GET',
			url: '/hello',
			headers: {
				'Accept-Encoding': 'compress, gzip' // disables contentLength
			}
		}, () => {
			const json = JSON.parse(consoleSpy.firstCall.args[0]);
			json.should.not.have.properties(['contentLength']);
			done();
		});
	});

	it('should handle response event in jsonOutput', (done) => {
		server = new Hapi.Server({debug: false});
		server.connection();
		server.register({
			register: plugin,
			options: {handler: testHandler}
		}, (err) => {
			if (err) {
				return done(err);
			}
		});

		route('/hello', (req, reply) => {
			reply('hello');
		});

		server.inject({
			method: 'GET',
			url: '/hello',
			headers: {
				Referer: 'http://foo.com'
			}
		}, () => {
			const json = JSON.parse(consoleSpy.firstCall.args[0]);
			json.should.have.properties([
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
			]);
			done();
		});
	});

	it('should handle log event', () => {
		server.log('foo', {foo: 'bar'});
		consoleSpy.firstCall.args[0].should.endWith('[log,foo], { foo: \'bar\' }');
	});

	it('should set default name for instance', () => {
		const log1 = plugin({});
		should.ok(plugin() === log1);
	});

	it('should set name for instance', () => {
		const log1 = plugin('foo');
		should.ok(plugin() !== log1);
		should.ok(plugin('foo') === log1);
	});

	function route(path, handler) {
		server.route({
			method: 'GET',
			path: path,
			handler: handler
		});
	}
});

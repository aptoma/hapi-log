'use strict';
const Hapi = require('hapi');
const should = require('should');
const plugin = require('../');

describe('Log service', () => {
	let server;
	let testHandler;

	beforeEach((done) => {
		testHandler = {
			log(data) {
				testHandler.listener(data);
			},
			listener() {}
		};
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

	it('should include meta', (done) => {
		let reqId;
		route('/hello', (req, reply) => {
			reqId = req.id;
			req.log(['foo'], 'bar');
			reply('hello');
		});

		testHandler.listener = (data) => {
			data.should.endWith('{"requestId":"' + reqId + '"}');
			done();
		};

		server.inject({
			method: 'GET',
			url: '/hello'
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

		testHandler.listener = (data) => {
			data.should.match(/\[error\], crap, stack/);
			done();
		};

		server.inject({
			method: 'GET',
			url: '/error',
			headers: {
				Referer: 'http://foo.com'
			}
		}, () => {});
	});

	it('should handle error', (done) => {
		route('/error', (req, reply) => {
			reply(new Error('crap'));
		});

		testHandler.listener = (data) => {
			data.should.match(/\[error\], crap, stack/);
			done();
		};

		server.inject({
			method: 'GET',
			url: '/error',
			credentials: {account: {clientId: 'example'}}
		}, () => {});
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

		testHandler.listener = (data) => {
			data.should.match(/\[response\]/);
			done();
		};

		server.inject({
			method: 'GET',
			url: '/hello'
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

		testHandler.listener = (data) => {
			const json = JSON.parse(data);
			json.should.not.have.properties(['contentLength']);
			done();
		};

		server.inject({
			method: 'GET',
			url: '/hello',
			headers: {
				'Accept-Encoding': 'compress, gzip' // disables contentLength
			}
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

		testHandler.listener = (data) => {
			const json = JSON.parse(data);
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
		};

		server.inject({
			method: 'GET',
			url: '/hello',
			headers: {
				Referer: 'http://foo.com'
			}
		});
	});

	it('should handle log event', (done) => {
		testHandler.listener = (data) => {
			data.should.endWith('[log,foo], { foo: \'bar\' }');
			done();
		};

		server.log('foo', {foo: 'bar'});
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

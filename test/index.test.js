'use strict';
const Hapi = require('hapi');
const should = require('should');
const index = require('../');
const plugin = index.plugin;

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


	it('should include meta', (done) => {
		let reqId;
		route('/hello', (req) => {
			reqId = req.info.id;
			req.log(['foo'], 'bar');
			return 'hello';
		});

		testHandler.listener = (data) => {
			data.should.endWith('{"requestId":"' + reqId + '"}');
			testHandler.listener = () => {};
			done();
		};

		server.inject({
			method: 'GET',
			url: '/hello'
		});
	});

	it('should output error with stack using req.log', (done) => {
		route('/hello', (req) => {
			req.log(['foo'], new Error('ops'));
			return 'hello';
		});

		testHandler.listener = (data) => {
			data.should.match(/Error: ops\n\s+at/);
			testHandler.listener = () => {};
			done();
		};

		server.inject({
			method: 'GET',
			url: '/hello'
		});
	});

	it('should output error with stack using server.log', (done) => {
		testHandler.listener = (data) => {
			data.should.match(/Error: ops\n\s+at/);
			testHandler.listener = () => {};
			done();
		};

		server.log(['foo'], new Error('ops'));
	});

	it('should handle onPreResponse', (done) => {
		server = new Hapi.Server({debug: false});
		server
			.register({
				plugin: plugin,
				options: {handler: testHandler, jsonOutput: false, onPreResponseError: true}
			})
			.catch(done);

		route('/error', () => {
			throw new Error('crap');
		});

		testHandler.listener = (data) => {
			data.should.match(/\[error\], crap, stack/);
			testHandler.listener = () => {};
			done();
		};

		server
			.inject({
				method: 'GET',
				url: '/error',
				headers: {
					Referer: 'http://foo.com'
				}
			})
			.catch(done);
	});

	it('should handle error', (done) => {
		route('/error', () => {
			throw new Error('crap');
		});

		testHandler.listener = (data) => {
			data.should.match(/\[error\], crap, stack/);
			testHandler.listener = () => {};
			done();
		};

		server
			.inject({
				method: 'GET',
				url: '/error',
				credentials: {account: {clientId: 'example'}}
			})
			.catch(done);
	});

	it('should handle response event and respons and onPreResponseError should ignore non error', (done) => {
		server = new Hapi.Server({debug: false});

		server
			.register({
				plugin: plugin,
				options: {handler: testHandler, jsonOutput: false, onPreResponseError: true}
			})
			.catch(done);

		route('/hello', () => 'hello');

		testHandler.listener = (data) => {
			data.should.match(/\[response\]/);
			done();
		};

		server
			.inject({
				method: 'GET',
				url: '/hello'
			})
			.catch(done);
	});

	it('should should use x-forwarded-for if available for response logs', (done) => {
		server = new Hapi.Server({debug: false});

		server
			.register({
				plugin: plugin,
				options: {handler: testHandler, jsonOutput: false, onPreResponseError: true}
			})
			.catch(done);

		route('/hello', () => 'hello');

		testHandler.listener = (data) => {
			data.should.match(/\[response\], 12\.12\.12\.12/);
			done();
		};

		server
			.inject({
				method: 'GET',
				url: '/hello',
				headers: {'x-forwarded-for': '12.12.12.12,10.10.10.10'}
			})
			.catch(done);
	});

	it('should handle not include contentLength if missing', (done) => {
		server = new Hapi.Server({debug: false, compression: {minBytes: 1}});

		server
			.register({
				plugin: plugin,
				options: {handler: testHandler}
			})
			.catch(done);

		route('/hello', () => 'hello');

		testHandler.listener = (data) => {
			const json = JSON.parse(data);
			json.should.not.have.properties(['contentLength']);
			done();
		};

		server
			.inject({
				method: 'GET',
				url: '/hello',
				headers: {
					'Accept-Encoding': 'compress, gzip' // disables contentLength
				}
			})
			.catch(done);
	});

	it('should handle response event in jsonOutput', (done) => {
		server = new Hapi.Server({debug: false});

		server
			.register({
				plugin: plugin,
				options: {
					handler: testHandler,
					requestInfoFilter: (requestInfo) => {
						requestInfo.query = Object.assign({}, requestInfo.query, {apikey: undefined, token: '--snip--'});
						requestInfo.referer = '';
						return requestInfo;
					}
				}
			})
			.catch(done);

		route('/hello', () => 'hello');

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
			should.ok(json.query.apikey === undefined);
			json.query.token.should.equal('--snip--');
			json.referer.should.equal('');
			done();
		};

		server
			.inject({
				method: 'GET',
				url: '/hello?apikey=secret&token=retract',
				headers: {
					Referer: 'http://foo.com'
				}
			})
			.catch(done);
	});

	it('should handle log event', (done) => {
		testHandler.listener = (data) => {
			data.should.endWith('[log,foo], { foo: \'bar\' }');
			done();
		};

		server.log('foo', {foo: 'bar'});
	});

	it('should set default name for instance', () => {
		const log1 = index({});
		should.ok(index() === log1);
	});

	it('should set name for instance', () => {
		const log1 = index('foo');
		should.ok(index() !== log1);
		should.ok(index('foo') === log1);
	});

	function route(path, handler) {
		server.route({
			method: 'GET',
			path: path,
			handler: handler
		});
	}
});

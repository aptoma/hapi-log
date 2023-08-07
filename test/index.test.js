'use strict';
const Hapi = require('@hapi/hapi');
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

	it('should ignore path included in ignorePaths', async () => {
		server = new Hapi.Server({debug: false});
		await server.register({
			plugin: plugin,
			options: {handler: testHandler, jsonOutput: false, ignorePaths: ['/shouldIgnore']}
		});

		route('/shouldIgnore', () => {
			return 'hello';
		});

		let called = false;
		testHandler.listener = () => {
			called = true;
			testHandler.listener = () => {};
		};

		await server.inject({
			method: 'GET',
			url: '/shouldIgnore'
		});

		called.should.equal(false);
	});

	it('should ignore method included in ignoreMethods', async () => {
		server = new Hapi.Server({debug: false});
		await server.register({
			plugin: plugin,
			options: {handler: testHandler, jsonOutput: false, ignoreMethods: ['options']}
		});

		route('/shouldIgnore', () => {
			return 'hello';
		}, 'options');

		let called = false;
		testHandler.listener = () => {
			called = true;
			testHandler.listener = () => {};
		};

		await server.inject({
			method: 'OPTIONS',
			url: '/shouldIgnore'
		});

		called.should.equal(false);
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

	it('should not log non 500 errors when using onPreResponse', (done) => {
		server = new Hapi.Server({debug: false});
		server.ext('onPreResponse', (req, h) => {
			const res = req.response;
			res.output.statusCode = 400;
			res.message = 'Ops';
			res.reformat();
			return h.continue;
		});

		server
			.register({
				plugin: plugin,
				options: {handler: testHandler, jsonOutput: false, onPreResponseError: true}
			})
			.catch(done);


		route('/error', () => {
			throw new Error('yikes');
		});

		testHandler.listener = (data) => {
			testHandler.listener = () => {};
			try {
				data.should.match(/\[response\]/);
			} catch (err) {
				return done(err);
			}

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
				auth: {strategy: 'default', credentials: {account: {clientId: 'example'}}}
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

	it('should extract log level from the first tag if extractLogLevel is true', () => {
		let line = {};
		const logger = index('extract:1', {
			extractLogLevel: true,
			handler: {
				log(str) {
					line = JSON.parse(str);
				}
			}
		});
		const levels = ['info', 'warn', 'warning', 'err', 'error', 'fatal', 'debug'];
		levels.forEach((level) => {
			logger.log([level]);
			should.equal(line._level, level);
			should.equal(line._tags.length, 0);

			logger.log(['other_tag', level]);
			should.equal(line._level, undefined);
			should.equal(line._tags.length, 2);
		});
	});

	it('should leave tags unchanged if extractLogLevel is false', () => {
		let line = {};
		const logger = index('extract:2', {
			extractLogLevel: false,
			handler: {
				log(str) {
					line = JSON.parse(str);
				}
			}
		});
		const levels = ['info', 'warn', 'warning', 'err', 'error', 'fatal', 'debug'];
		levels.forEach((level) => {
			let tags = [level];
			logger.log(tags);
			should.equal(line._level, undefined);
			should.deepEqual(line._tags, tags);

			tags = ['other_tag', level];
			logger.log(tags);
			should.equal(line._level, undefined);
			should.deepEqual(line._tags, tags);

			tags = ['other_tag', 'yet_another_tag', level];
			logger.log(tags);
			should.equal(line._level, undefined);
			should.deepEqual(line._tags, tags);
		});
	});

	it('should leave tags unchanged if there is no log level in the tags', () => {
		let line = {};
		const logger = index('extract:3', {
			extractLogLevel: false,
			handler: {
				log(str) {
					line = JSON.parse(str);
				}
			}
		});
		const levels = ['foo', 'bar', 'information', 'terror'];
		levels.forEach((level) => {
			let tags = [level];
			logger.log(tags);
			should.equal(line._level, undefined);
			should.deepEqual(line._tags, tags);

			tags = ['other_tag', level];
			logger.log(tags);
			should.equal(line._level, undefined);
			should.deepEqual(line._tags, tags);

			tags = ['other_tag', 'yet_another_tag', level];
			logger.log(tags);
			should.equal(line._level, undefined);
			should.deepEqual(line._tags, tags);
		});
	});

	function route(path, handler, method) {
		server.route({
			method: method || 'GET',
			path: path,
			handler: handler
		});
	}
});

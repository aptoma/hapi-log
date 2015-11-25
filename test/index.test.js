'use strict';
var Hapi = require('hapi');
var sinon = require('sinon');
var should = require('should');
var plugin = require('../');

describe('Log service', function () {
	var server;
	var consoleSpy;
	var testHandler = {
		log: function () {
		}
	};

	beforeEach(function (done) {
		consoleSpy = sinon.spy(testHandler, 'log');
		server = new Hapi.Server({debug: false});
		server.connection();
		server.register({
				register: plugin,
				options: {handler: testHandler, jsonOutput: false}
			},
			function (err) {
				if (err) {
					return done(err);
				}
				done();
			});
	});

	afterEach(function () {
		testHandler.log.restore();
	});

	it('should include meta', function (done) {
		var reqId;
		route('/hello', function (req, reply) {
			reqId = req.id;
			req.log(['foo'], 'bar');
			reply('hello');
		});

		server.inject({
			method: 'GET',
			url: '/hello'
		}, function () {
			consoleSpy.firstCall.args[0].should.endWith('{"requestId":"' + reqId + '"}');
			done();
		});
	});

	it('should handle onPreResponse', function (done) {
		server = new Hapi.Server({debug: false});
		server.connection();
		server.register({
				register: plugin,
				options: {handler: testHandler, jsonOutput: false, onPreResponseError: true}
			},
			function (err) {
				if (err) {
					return done(err);
				}
			}
		);

		route('/error', function (req, reply) {
			reply(new Error('crap'));
		});

		server.inject({
			method: 'GET',
			url: '/error',
			headers: {
				Referer: 'http://foo.com'
			}
		}, function () {
			consoleSpy.firstCall.args[0].match(/Error: Uncaught error: crap/);
			done();
		});
	});

	it('should handle error', function (done) {
		route('/error', function (req, reply) {
			reply(new Error('crap'));
		});

		server.inject({
			method: 'GET',
			url: '/error',
			credentials: {account: {clientId: 'example'}}
		}, function () {
			consoleSpy.firstCall.args[0].match(/Error: Uncaught error: crap/);
			done();
		});
	});

	it('should handle response event and respons and onPreResponseError should ignore non error', function (done) {
		server = new Hapi.Server({debug: false});
		server.connection();
		server.register({
				register: plugin,
				options: {handler: testHandler, jsonOutput: false, onPreResponseError: true}
			},
			function (err) {
				if (err) {
					return done(err);
				}
			}
		);

		route('/hello', function (req, reply) {
			reply('hello');
		});

		server.inject({
			method: 'GET',
			url: '/hello'
		}, function () {
			consoleSpy.firstCall.args[0].should.match(/\[response\]/);
			done();
		});
	});

	it('should handle not include contentLength if missing', function (done) {
		server = new Hapi.Server({debug: false});
		server.connection();
		server.register({
				register: plugin,
				options: {handler: testHandler}
			},
			function (err) {
				if (err) {
					return done(err);
				}
			}
		);

		route('/hello', function (req, reply) {
			reply('hello');
		});

		server.inject({
			method: 'GET',
			url: '/hello',
			headers: {
				'Accept-Encoding': 'compress, gzip' // disables contentLength
			}
		}, function () {
			var json = JSON.parse(consoleSpy.firstCall.args[0]);
			json.should.not.have.properties(['contentLength']);
			done();
		});
	});

	it('should handle response event in jsonOutput', function (done) {
		server = new Hapi.Server({debug: false});
		server.connection();
		server.register({
				register: plugin,
				options: {handler: testHandler}
			},
			function (err) {
				if (err) {
					return done(err);
				}
			}
		);

		route('/hello', function (req, reply) {
			reply('hello');
		});

		server.inject({
			method: 'GET',
			url: '/hello',
			headers: {
				Referer: 'http://foo.com',
			}
		}, function () {
			var json = JSON.parse(consoleSpy.firstCall.args[0]);
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

	it('should handle log event', function () {
		server.log('foo', {foo: 'bar'});
		consoleSpy.firstCall.args[0].should.endWith('[log,foo], { foo: \'bar\' }');
	});

	it('should set default name for instance', function () {
		var log1 = plugin({});
		should.ok(plugin() === log1);
	});

	it('should set name for instance', function () {
		var log1 = plugin('foo');
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

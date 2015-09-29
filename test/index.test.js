'use strict';
var Hapi = require('hapi');
var sinon = require('sinon');

require('should');

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
				register: require('../'),
				options: {handler: testHandler}
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
			consoleSpy.firstCall.args[0].should.endWith('{"id":"' + reqId + '"}');
			done();
		});
	});

	it('should handle error', function (done) {
		route('/error', function (req, reply) {
			throw new Error('crap');
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

	it('should handle response event', function (done) {
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

	it('should handle log event', function () {
		server.log('foo', 'bar');
		consoleSpy.firstCall.args[0].should.endWith('[log,foo], bar');
	});

	function route(path, handler) {
		server.route({
			method: 'GET',
			path: path,
			handler: handler
		});
	}
});

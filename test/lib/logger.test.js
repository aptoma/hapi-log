'use strict';
var sinon = require('sinon');
var Logger = require('../../lib/logger');

describe('Logger', function () {
	var consoleSpy;
	var log;
	var testHandler = {
		log: function () {
		}
	};

	beforeEach(function () {
		consoleSpy = sinon.spy(testHandler, 'log');
	});

	afterEach(function () {
		testHandler.log.restore();
	});

	it('should use custom meta function', function () {
		log = new Logger({
			handler: testHandler,
			meta: function () {
				return {foo: 'bar'};
			}
		});

		log.log('info', 'foo');
		consoleSpy.firstCall.args[0].should.endWith('[info], foo, {"foo":"bar"}');
	});

	it('should log message with multiple tags', function () {
		log = new Logger({handler: testHandler});
		log.log(['info', 'debug'], 'foo');
		consoleSpy.firstCall.args[0].should.endWith('[info,debug], foo');
	});

});

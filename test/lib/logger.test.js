'use strict';
var sinon = require('sinon');
var moment = require('moment');
var Logger = require('../../lib/logger');
var should = require('should');

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

	it('should support custom timeformat', function () {
		log = new Logger({
			jsonOutput: true,
			handler: testHandler,
			format: 'YYYY-MM-DD HH:mm:ss',
			utc: true
		});

		log.log('info', 'foo');
		var json = JSON.parse(consoleSpy.firstCall.args[0]);
		json.time.should.equal(moment().format('YYYY-MM-DD HH:mm:ss'));
	});

	describe('humanReadable Format', function () {

		it('should use custom meta function', function () {
			log = new Logger({
				jsonOutput: false,
				handler: testHandler,
				meta: function () {
					return {foo: 'bar'};
				}
			});

			log.log('info', 'foo');
			consoleSpy.firstCall.args[0].should.endWith('[info], foo, {"foo":"bar"}');
		});

		it('should log message with multiple tags', function () {
			log = new Logger({handler: testHandler, jsonOutput: false});
			log.log(['info', 'debug'], 'foo');
			consoleSpy.firstCall.args[0].should.endWith('[info,debug], foo');
		});

		it('should log object', function () {
			log = new Logger({handler: testHandler, jsonOutput: false});
			log.log(['info', 'debug'], {foo: 'bar'});
			consoleSpy.firstCall.args[0].should.endWith('[info,debug], { foo: \'bar\' }');
		});

		it('should allow multiple messages', function () {
			log = new Logger({handler: testHandler, jsonOutput: false});
			log.log(['info', 'debug'], 'foo', {foo: 'bar'}, 'ping', new Error('shit'));
			consoleSpy.firstCall.args[0].should.match(/\[info,debug\], foo \{ foo: \'bar\' \} ping Error: shit/);
		});

		it('should interpolate messages', function () {
			log = new Logger({handler: testHandler, jsonOutput: false});
			log.log(['info', 'debug'], '%s,%s', 'foo', 'bar');
			consoleSpy.firstCall.args[0].should.endWith('[info,debug], foo,bar');
		});
	});

	describe('jsonOutput', function () {
		it('should output in json', function () {
			log = new Logger({handler: testHandler, jsonOutput: true});
			log.log('info', 'bar');
			var json = JSON.parse(consoleSpy.firstCall.args[0]);
			should.exist(json.time);
			json.msg.should.equal('bar');
			json.tags.should.eql(['info']);
		});

		it('should log object', function () {
			log = new Logger({handler: testHandler, jsonOutput: true});
			log.log('info', {foo: 'bar', monkey: 'people'});
			var json = JSON.parse(consoleSpy.firstCall.args[0]);
			json.foo.should.equal('bar');
			json.monkey.should.equal('people');
		});

		it('should log error stack', function () {
			log = new Logger({handler: testHandler, jsonOutput: true});
			log.log('info', new Error('crap'));
			var json = JSON.parse(consoleSpy.firstCall.args[0]);
			json.error.should.startWith('Error: crap\n');
		});

	});
});

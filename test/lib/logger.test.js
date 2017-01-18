'use strict';
const sinon = require('sinon');
const moment = require('moment');
const Logger = require('../../lib/logger');
const should = require('should');

describe('Logger', () => {
	let consoleSpy;
	let log;
	const testHandler = {
		log: () => {
		}
	};

	beforeEach(() => {
		consoleSpy = sinon.spy(testHandler, 'log');
	});

	afterEach(() => {
		testHandler.log.restore();
	});

	it('should support custom timeformat', () => {
		log = new Logger({
			jsonOutput: true,
			handler: testHandler,
			format: 'YYYY-MM-DD HH:mm:ss',
			utc: true
		});

		log.log('info', 'foo');
		const json = JSON.parse(consoleSpy.firstCall.args[0]);
		json._time.should.equal(moment().format('YYYY-MM-DD HH:mm:ss'));
	});

	describe('humanReadable Format', () => {

		it('should use custom meta function', () => {
			log = new Logger({
				jsonOutput: false,
				handler: testHandler,
				meta: () => {
					return {foo: 'bar'};
				}
			});

			log.log('info', 'foo');
			consoleSpy.firstCall.args[0].should.endWith('[info], foo, {"foo":"bar"}');
		});

		it('should log message with multiple tags', () => {
			log = new Logger({handler: testHandler, jsonOutput: false});
			log.log(['info', 'debug'], 'foo');
			consoleSpy.firstCall.args[0].should.endWith('[info,debug], foo');
		});

		it('should log object', () => {
			log = new Logger({handler: testHandler, jsonOutput: false});
			log.log(['info', 'debug'], {foo: 'bar'});
			consoleSpy.firstCall.args[0].should.endWith('[info,debug], { foo: \'bar\' }');
		});

		it('should allow multiple messages', () => {
			log = new Logger({handler: testHandler, jsonOutput: false});
			log.log(['info', 'debug'], 'foo', {foo: 'bar'}, 'ping', new Error('shit'));
			consoleSpy.firstCall.args[0].should.match(/\[info,debug\], foo \{ foo: \'bar\' \} ping Error: shit/);
		});

		it('should interpolate messages', () => {
			log = new Logger({handler: testHandler, jsonOutput: false});
			log.log(['info', 'debug'], '%s,%s', 'foo', 'bar');
			consoleSpy.firstCall.args[0].should.endWith('[info,debug], foo,bar');
		});
	});

	describe('jsonOutput', () => {
		it('should output in json', () => {
			log = new Logger({handler: testHandler, jsonOutput: true});
			log.log('info', 'bar');
			const json = JSON.parse(consoleSpy.firstCall.args[0]);
			should.exist(json._time);
			json.msg.should.equal('bar');
			json._tags.should.eql(['info']);
		});

		it('should log object', () => {
			log = new Logger({handler: testHandler, jsonOutput: true});
			log.log('info', {foo: 'bar', monkey: 'people'});
			const json = JSON.parse(consoleSpy.firstCall.args[0]);
			json.foo.should.equal('bar');
			json.monkey.should.equal('people');
		});

		it('should log array', () => {
			log = new Logger({handler: testHandler, jsonOutput: true});
			log.log('info', ['a', 'b']);
			const json = JSON.parse(consoleSpy.firstCall.args[0]);
			json.msg.should.eql(['a', 'b']);
		});

		it('should log error stack', () => {
			log = new Logger({handler: testHandler, jsonOutput: true});
			log.log('info', new Error('crap'));
			const json = JSON.parse(consoleSpy.firstCall.args[0]);
			json.error.should.startWith('Error: crap\n');
		});

	});
});

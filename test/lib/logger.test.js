import assert from 'node:assert/strict';
import {afterEach, beforeEach, describe, it, mock} from 'node:test';
import {Logger} from '../../dist/logger.js';

describe('Logger', () => {
	let log;
	const testHandler = {
		log() {}
	};
	let logMock;

	beforeEach(() => {
		logMock = mock.method(testHandler, 'log');
	});

	afterEach(() => {
		logMock.mock.restore();
	});

	function lastCall() {
		return logMock.mock.calls[0].arguments[0];
	}

	it('should support custom time formatter', () => {
		const timeFormatter = new Intl.DateTimeFormat(undefined, {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false
		});
		log = new Logger({
			jsonOutput: true,
			handler: testHandler,
			formatTimestamp(ts) {
				return timeFormatter.format(new Date(ts));
			}
		});

		log.log('info', 'foo');
		const json = JSON.parse(lastCall());
		assert.equal(json._time, timeFormatter.format(new Date()));
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
			assert.ok(lastCall().endsWith('[info], foo, {"foo":"bar"}'));
		});

		it('should log message with multiple tags', () => {
			log = new Logger({handler: testHandler, jsonOutput: false});
			log.log(['info', 'debug'], 'foo');
			assert.ok(lastCall().endsWith('[info,debug], foo'));
		});

		it('should log object', () => {
			log = new Logger({handler: testHandler, jsonOutput: false});
			log.log(['info', 'debug'], {foo: 'bar'});
			assert.ok(lastCall().endsWith("[info,debug], { foo: 'bar' }"));
		});

		it('should allow multiple messages', () => {
			log = new Logger({handler: testHandler, jsonOutput: false});
			log.log(['info', 'debug'], 'foo', {foo: 'bar'}, 'ping', new Error('shit'));
			assert.match(lastCall(), /\[info,debug\], foo \{ foo: 'bar' \} ping Error: shit/);
		});

		it('should interpolate messages', () => {
			log = new Logger({handler: testHandler, jsonOutput: false});
			log.log(['info', 'debug'], '%s,%s', 'foo', 'bar');
			assert.ok(lastCall().endsWith('[info,debug], foo,bar'));
		});
	});

	describe('jsonOutput', () => {
		it('should output in json', () => {
			log = new Logger({handler: testHandler, jsonOutput: true});
			log.log('info', 'bar');
			const json = JSON.parse(lastCall());
			assert.ok(json._time);
			assert.equal(json.msg, 'bar');
			assert.deepEqual(json._tags, ['info']);
		});

		it('should log object', () => {
			log = new Logger({handler: testHandler, jsonOutput: true});
			log.log('info', {foo: 'bar', monkey: 'people'});
			const json = JSON.parse(lastCall());
			assert.equal(json.foo, 'bar');
			assert.equal(json.monkey, 'people');
		});

		it('should log array', () => {
			log = new Logger({handler: testHandler, jsonOutput: true});
			log.log('info', ['a', 'b']);
			const json = JSON.parse(lastCall());
			assert.deepEqual(json.msg, ['a', 'b']);
		});

		it('should log error stack', () => {
			log = new Logger({handler: testHandler, jsonOutput: true});
			log.log('info', new Error('crap'));
			const json = JSON.parse(lastCall());
			assert.ok(json.error.startsWith('Error: crap\n'));
		});
	});
});

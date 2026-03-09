import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {timestamp} from '../../dist/format.js';

describe('format', () => {
	describe('timestamp()', () => {
		it('formats utc timestamp to local time', () => {
			const str = timestamp(1589288193486);
			const date = new Date(1589288193486);
			assert.equal(str, `2020-05-12 ${date.getHours()}:56:33.486`);
		});
	});
});

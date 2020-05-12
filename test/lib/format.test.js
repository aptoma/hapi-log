'use strict';

const should = require('should');
const format = require('../../lib/format');

describe('format', () => {
	describe('timestamp()', () => {
		it('formats utc timestamp to local time', () => {
			const str = format.timestamp(1589288193486);
			const date = new Date(1589288193486);
			should(str).equal(`2020-05-12 ${date.getHours()}:56:33.486`);
		});
	});
});

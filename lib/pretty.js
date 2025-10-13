#!/usr/bin/env node
'use strict';

const readline = require('node:readline');
const {styleText, format} = require('node:util');

const timeFormatter = new Intl.DateTimeFormat(undefined, {
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
	hour12: false
});

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	terminal: false
});

// eslint-disable-next-line complexity
rl.on('line', (line) => {
	if (!line) {
		return console.log();
	}

	let json;
	try {
		json = JSON.parse(line);
	} catch (e) {
		return console.log(line);
	}

	if (json._tags instanceof Array && json._tags.indexOf('response') > -1) {
		return formatResponse(json);
	}

	if (!(json._tags || json.msg)) {
		return console.log(line);
	}

	const time = timeFormatter.format(new Date(json._time));

	const tags = json._tags || [];
	const tagsStr = tags.length > 0 ? colorizeTags(tags) : '';
	const msg = format(
		'%s %s%s%s%s %s %s',
		styleText('gray', time),
		styleText('gray', '['),
		tagsStr,
		tagsStr ? '' : '', // no extra space if no tags
		styleText('gray', '] -'),
		json.msg || '',
		props(json, ['msg', '_time', '_tags'])
	);

	console.log(msg);
});

function props(o, exclude) {
	return Object
		.keys(o)
		.filter((key) => exclude.indexOf(key) === -1)
		.map((key) => `${key}: ${stringify(o[key])}`)
		.join(', ');
}

function stringify(data) {
	if (typeof (data) !== 'object') {
		return data;
	}

	return JSON.stringify(data);
}

function colorizeTags(tags) {
	/** @type {'blue' | 'red' | 'yellow'} */
	let color1 = 'blue';
	/** @type {'cyan' | 'red' | 'yellow'} */
	let color2 = 'cyan';

	if (tags.find((tag) => tag === 'error')) {
		color1 = 'red';
		color2 = 'red';
	} else if (tags.find((tag) => tag.startsWith('warn'))) {
		color1 = 'yellow';
		color2 = 'yellow';
	}

	return tags.map((t, idx) =>
		idx % 2 === 0 ? styleText(color1, t) : styleText(color2, t)
	).join(', ');
}

function formatResponse(json) {
	const time = timeFormatter.format(new Date(json._time));

	const statusColor = (json.statusCode / 100 | 0) > 3 ? 'red' : 'green';

	const msg = format(
		'%s %s %s %s %s %s ms',
		styleText('gray', time),
		styleText(statusColor, json.method),
		json.path,
		styleText('cyan', JSON.stringify(json.query)),
		styleText(statusColor, String(json.statusCode)),
		json.responseTime
	);

	console.log(msg);
}

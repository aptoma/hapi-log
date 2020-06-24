#!/usr/bin/env node
'use strict';

const chalk = require('chalk');
const readline = require('readline');
const moment = require('moment');
const format = require('util').format;

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	terminal: false
});

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

	const time = moment(json._time).format('HH:mm:ss');

	const msg = format(
		`%s ${chalk.gray('[')}%s${chalk.gray(']')} ${chalk.gray('-')} %s %s`,
		chalk.gray(time),
		colorizeTags(json._tags),
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
	let colors = [chalk.blue, chalk.cyan];
	if (tags.find((tag) => tag === 'error')) {
		colors = [chalk.red.bold, chalk.red];
	} else if (tags.find((tag) => tag.startsWith('warn'))) {
		colors = [chalk.yellow.bold, chalk.yellow];
	}
	return tags.map((t, idx) => idx % 2 === 0 ? colors[0](t) : colors[1](t)).join(', ');
}

function formatResponse(json) {
	const time = moment(json._time).format('HH:mm:ss');

	const statusColor = (json.statusCode / 100 | 0) > 3 ? chalk.red : chalk.green;

	const msg = format(
		'%s %s %s %s %s %s ms',
		chalk.gray(time),
		statusColor(json.method),
		json.path,
		chalk.cyan(JSON.stringify(json.query)),
		statusColor(json.statusCode),
		json.responseTime
	);

	console.log(msg);
}

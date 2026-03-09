#!/usr/bin/env node
import readline from 'node:readline';
import {format, styleText} from 'node:util';

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

rl.on('line', (line: string) => {
	if (!line) {
		return console.log();
	}

	let json: Record<string, unknown>;
	try {
		json = JSON.parse(line);
	} catch {
		return console.log(line);
	}

	if (Array.isArray(json._tags) && (json._tags as string[]).indexOf('response') > -1) {
		return formatResponse(json);
	}

	if (!(json._tags || json.msg)) {
		return console.log(line);
	}

	const time = timeFormatter.format(new Date(json._time as string));

	const tags = (json._tags as string[]) || [];
	const tagsStr = tags.length > 0 ? colorizeTags(tags) : '';
	const msg = format(
		'%s %s%s%s %s %s',
		styleText('gray', time),
		styleText('gray', '['),
		tagsStr,
		styleText('gray', '] -'),
		json.msg || '',
		props(json, ['msg', '_time', '_tags'])
	);

	console.log(msg);
});

function props(o: Record<string, unknown>, exclude: string[]): string {
	return Object.keys(o)
		.filter((key) => exclude.indexOf(key) === -1)
		.map((key) => `${key}: ${stringify(o[key])}`)
		.join(', ');
}

function stringify(data: unknown): unknown {
	if (typeof data !== 'object') {
		return data;
	}

	return JSON.stringify(data);
}

function colorizeTags(tags: string[]): string {
	let color1: 'blue' | 'red' | 'yellow' = 'blue';
	let color2: 'cyan' | 'red' | 'yellow' = 'cyan';

	if (tags.find((tag) => tag === 'error')) {
		color1 = 'red';
		color2 = 'red';
	} else if (tags.find((tag) => tag.startsWith('warn'))) {
		color1 = 'yellow';
		color2 = 'yellow';
	}

	return tags.map((t, idx) => (idx % 2 === 0 ? styleText(color1, t) : styleText(color2, t))).join(', ');
}

function formatResponse(json: Record<string, unknown>): void {
	const time = timeFormatter.format(new Date(json._time as string));

	const statusColor = (((json.statusCode as number) / 100) | 0) > 3 ? ('red' as const) : ('green' as const);

	const msg = format(
		'%s %s %s %s %s %s ms',
		styleText('gray', time),
		styleText(statusColor, json.method as string),
		json.path,
		styleText('cyan', JSON.stringify(json.query)),
		styleText(statusColor, String(json.statusCode)),
		json.responseTime
	);

	console.log(msg);
}

import {format as printf, inspect} from 'node:util';
import stringify from 'fast-safe-stringify';
import {timestamp as defaultFormatTimestamp} from './format.js';
import type {Request, RequestEvent, LogEvent, ResponseObject} from '@hapi/hapi';

export interface LogHandler {
	log(message: string): void;
}

export interface RequestInfo {
	remoteAddress: string;
	host: string;
	path: string;
	method: string;
	query: Record<string, unknown>;
	statusCode: number;
	responseTime: number;
	userAgent?: string;
	contentLength?: string;
	referer?: string;
}

export interface LogData {
	timestamp: number | string;
	tags: string[];
	log?: unknown;
	requestInfo?: RequestInfo;
	data?: Record<string, unknown>;
}

export interface LoggerOptions {
	handler?: LogHandler;
	meta?: (request?: Request) => Record<string, unknown> | undefined;
	formatTimestamp?: (timestamp: number | string) => string;
	jsonOutput?: boolean;
	requestInfoFilter?: (requestInfo: RequestInfo) => RequestInfo;
}

export interface PluginOptions extends LoggerOptions {
	name?: string;
	ignorePaths?: string[];
	ignoreMethods?: string[];
	onPreResponseError?: boolean;
}

interface ResolvedOptions {
	jsonOutput: boolean;
	formatTimestamp: (timestamp: number | string) => string;
	requestInfoFilter: (requestInfo: RequestInfo) => RequestInfo;
	handler?: LogHandler;
	meta?: (request?: Request) => Record<string, unknown> | undefined;
}

const defaults = {
	jsonOutput: true,
	formatTimestamp: defaultFormatTimestamp,
	requestInfoFilter: (requestInfo: RequestInfo) => requestInfo
};

function defaultMeta(request?: Request): Record<string, unknown> | undefined {
	if (!request) {
		return;
	}
	return {requestId: request.info.id};
}

function defaultHandler(): LogHandler {
	return {
		log(str) {
			process.stdout.write(str + '\n');
		}
	};
}

export class Logger {
	private opts: ResolvedOptions;
	private handler: LogHandler;
	private meta: (request?: Request) => Record<string, unknown> | undefined;
	readonly formatTime: (timestamp: number | string) => string;

	constructor(options?: LoggerOptions) {
		this.opts = {...defaults, ...options} as ResolvedOptions;
		this.handler = this.opts.handler || defaultHandler();
		this.meta = this.opts.meta || defaultMeta;
		this.formatTime = this.opts.formatTimestamp;
	}

	handleError(request: Request, data: RequestEvent | {error: Error}): void {
		const error = data.error as Error;
		this.write({
			timestamp: Date.now(),
			tags: ['error'],
			data: this.meta(request),
			log: printf('%s, stack:\n%s', error.message, error.stack)
		});
	}

	handleRequest(request: Request, event: RequestEvent): void {
		this.write({
			timestamp: event.timestamp,
			tags: event.tags,
			data: this.meta(request),
			log: event.data || event.error
		});
	}

	handleResponse(request: Request): void {
		const referer = request.raw.req.headers.referer;
		const response = request.response;
		const contentLengthValue = 'headers' in response
			? (response as ResponseObject).headers['content-length'] as string | undefined
			: undefined;

		let remoteAddress = request.info.remoteAddress;
		const xFF = request.headers['x-forwarded-for'];

		if (xFF) {
			remoteAddress = xFF.split(',')[0];
		}

		const requestInfo: RequestInfo = {
			remoteAddress,
			host: request.info.hostname,
			path: request.path,
			method: request.method,
			query: request.query,
			statusCode: request.raw.res.statusCode,
			responseTime: Date.now() - request.info.received,
			userAgent: request.raw.req.headers['user-agent']
		};

		if (referer) {
			requestInfo.referer = referer;
		}

		if (contentLengthValue) {
			requestInfo.contentLength = contentLengthValue;
		}

		this.write({
			timestamp: request.info.received,
			tags: ['response'],
			data: this.meta(request),
			requestInfo: this.opts.requestInfoFilter(requestInfo)
		});
	}

	stringifyRequestInfo(data: RequestInfo): string {
		return printf(
			'%s, %s %s %s %s %s (%sms), %s%s',
			data.remoteAddress,
			data.host,
			data.path,
			data.method,
			stringify(data.query),
			data.statusCode,
			data.responseTime,
			data.referer ? data.referer + ', ' : '',
			data.userAgent
		);
	}

	handleLog(event: LogEvent): void {
		this.write({
			timestamp: event.timestamp,
			tags: event.tags,
			log: event.data || event.error
		});
	}

	humanReadableFormatter(obj: LogData): string {
		let log: unknown;
		if (obj.requestInfo) {
			// requestInfo is only sent on response log
			log = this.stringifyRequestInfo(obj.requestInfo);
		} else {
			log = typeof obj.log === 'object' ? inspect(obj.log) : obj.log;
		}

		return printf(
			'%s, [%s], %s%s',
			this.formatTime(obj.timestamp),
			obj.tags.join(','),
			log,
			obj.data ? ', ' + stringify(obj.data) : ''
		);
	}

	formatter(obj: LogData): string {
		if (!this.opts.jsonOutput) {
			return this.humanReadableFormatter(obj);
		}

		const formatted: Record<string, unknown> = {
			_time: this.formatTime(obj.timestamp),
			_tags: obj.tags
		};

		Object.assign(formatted, obj.data || {}, obj.requestInfo || {});

		if (obj.log && !Array.isArray(obj.log) && typeof obj.log === 'object') {
			if (obj.log instanceof Error) {
				formatted.error = obj.log.stack;
			} else {
				Object.assign(formatted, obj.log as Record<string, unknown>);
			}
		} else {
			formatted.msg = obj.log;
		}

		return stringify(formatted);
	}

	write(obj: LogData): void {
		this.handler.log(this.formatter(obj));
	}

	log(tags: string | string[], ...messages: unknown[]): void {
		let logMessage: unknown;

		// only apply printf if it has multiple messages
		// we want to be able to handle a single error objects for jsonOutput differently
		if (messages.length > 1) {
			const mapped = messages.map((arg) => {
				if (arg instanceof Error) {
					return arg.stack;
				}

				if (arg instanceof Object) {
					return inspect(arg);
				}
				return arg;
			});

			logMessage = printf(...(mapped as [string, ...unknown[]]));
		} else {
			if (!this.opts.jsonOutput && messages[0] instanceof Object) {
				logMessage = inspect(messages[0]);
			} else {
				logMessage = messages[0];
			}
		}

		const meta = this.meta();
		const payload: LogData = {
			timestamp: Date.now(),
			tags: Array.isArray(tags) ? tags : [tags],
			log: logMessage,
			...(meta && {data: meta})
		};

		this.write(payload);
	}
}

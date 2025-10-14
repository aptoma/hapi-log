'use strict';

const printf = require('util').format;
const stringify = require('fast-safe-stringify');
const inspect = require('util').inspect;
const format = require('./format');

const internals = {
	defaults: {
		jsonOutput: true,
		formatTimestamp: format.timestamp,
		requestInfoFilter: (requestInfo) => requestInfo
	}
};


/**
 * Default meta data to append to logs
 * @param  {HapiRequest} [request]
 * @return {Record<string, unknown>|undefined}
 */
function defaultMeta(request) {
	if (!request) {
		return;
	}
	return {requestId: request.info.id};
}

/**
 * defaultHandler for outputing the logs
 * @return {object}
 */
function defaultHandler() {
	return {
		/**
		 * @param {string} str
		 */
		log(str) {
			process.stdout.write(str + '\n');
		}
	};
}

/**
 * @typedef {object} RequestInfo
 * @property {string} remoteAddress
 * @property {string} host
 * @property {string} path
 * @property {string} method
 * @property {object} query
 * @property {number} statusCode
 * @property {number} responseTime
 * @property {string} [userAgent]
 * @property {string} [contentLength]
 * @property {string} [referer]
 */

/**
 * @typedef {object} HapiRequest - Hapi request object
 * @property {object} request.info - Request information
 * @property {string} request.info.id - Unique request identifier
 * @property {string} request.info.remoteAddress - Client IP address
 * @property {string} request.info.hostname - Request hostname
 * @property {number} request.info.received - Timestamp when request was received
 * @property {string} request.path - Request path
 * @property {string} request.method - HTTP method
 * @property {Record<string, unknown>} request.query - Query propertyeters
 * @property {Record<string, string>} request.headers - Request headers
 * @property {object} request.raw - Raw request/response objects
 * @property {object} request.raw.req - Raw Node.js request object
 * @property {Record<string, string>} request.raw.req.headers - Raw request headers
 * @property {object} request.raw.res - Raw Node.js response object
 * @property {number} request.raw.res.statusCode - HTTP status code
 * @property {object} [request.response] - Hapi response object
 * @property {Record<string, string>} [request.response.headers] - Response headers
*/

/**
 * @typedef {object} LogData
 * @property {number} timestamp when the log event occured
 * @property {string[]} tags
 * @property {object|string} [log] the log message or object
 * @property {RequestInfo} [requestInfo]
 * @property {object} [data] optional meta data
 */

/**
 * @typedef {object} LoggerOptions
 * @property {{log: (message: string) => void}} [handler] Handler implementing `log(message)` method, defaults to console logging
 * @property {(request?: HapiRequest) => Record<string, unknown>} [meta] Should return meta data as an Object that is appended to logs. Default returns {requestId:request.info.id} This function doesnt always recieve request object.
 * @property {(timestamp: number) => string} [formatTime]
 * @property {boolean} [jsonOutput] output all data as stringified json
 */

class Logger {

	/**
	 * Creates a new Logger
	 *
	 * @class Logger
	 * @param {LoggerOptions} [options]
	 */
	constructor(options) {
		this.opts = {...internals.defaults, ...options};
		this.handler = this.opts.handler || defaultHandler();
		this.meta = this.opts.meta || defaultMeta;
		this.formatTime = this.opts.formatTimestamp;
	}

	/**
	 * Handle Error
	 * @param  {HapiRequest} request
	 * @param  {object} data
	 */
	handleError(request, data) {
		this.write({
			timestamp: Date.now(),
			tags: ['error'],
			data: this.meta(request),
			log: printf('%s, stack:\n%s', data.error.message, data.error.stack)
		});
	}

	/**
	 * Handle 'request' event
	 * @param  {HapiRequest} request
	 * @param  {object} event
	 */
	handleRequest(request, event) {
		this.write({
			timestamp: event.timestamp,
			tags: event.tags,
			data: this.meta(request),
			log: event.data || event.error
		});
	}

	/**
	 * Handle 'response' event
	 * @param {HapiRequest} request
	 */
	handleResponse(request) {
		const referer = request.raw.req.headers.referer;
		const contentLength = request.response?.headers?.['content-length'];

		let remoteAddress = request.info.remoteAddress;
		const xFF = request.headers['x-forwarded-for'];

		if (xFF) {
			remoteAddress = xFF.split(',')[0];
		}

		/** @type {RequestInfo} */
		const requestInfo = {
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

		if (contentLength) {
			requestInfo.contentLength = contentLength;
		}

		this.write({
			timestamp: request.info.received,
			tags: ['response'],
			data: this.meta(request),
			requestInfo: this.opts.requestInfoFilter(requestInfo)
		});
	}

	/**
	 * Format RequestInfo to a human friendly string
	 * @param  {RequestInfo} data
	 * @return {string}
	 */
	stringifyRequestInfo(data) {
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

	/**
	 * Handle 'log' event
	 * @param  {object} event
	 */
	handleLog(event) {
		this.write({
			timestamp: event.timestamp,
			tags: event.tags,
			log: event.data || event.error
		});
	}

	/**
	 * Format log data to human readable string
	 * @param  {LogData} obj
	 * @return {string}
	 */
	humanReadableFormatter(obj) {
		let log;
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

	/**
	 * Formats Log to a string
	 * @param  {LogData} obj
	 * @return {String}
	 */
	formatter(obj) {
		if (!this.opts.jsonOutput) {
			return this.humanReadableFormatter(obj);
		}

		const formatted = {
			_time: this.formatTime(obj.timestamp),
			_tags: obj.tags
		};

		Object.assign(formatted, obj.data || {}, obj.requestInfo || {});

		if (obj.log && !Array.isArray(obj.log) && typeof obj.log === 'object') {
			if (obj.log instanceof Error) {
				formatted.error = obj.log.stack;
			} else {
				Object.assign(formatted, obj.log);
			}
		} else {
			formatted.msg = obj.log;
		}

		return stringify(formatted);
	}

	/**
	 * Formats and writes the log data
	 * @param  {LogData} obj
	 */
	write(obj) {
		this.handler.log(this.formatter(obj));
	}

	/**
	 * Add a log entry
	 * @param  {Array|String} tags
	 * @param  {Object|String} messages
	 */
	log(tags, ...messages) {
		// only apply printf if it has multiple messages
		// we want to be able to handle a single error objects for jsonOutput differently
		if (messages.length > 1) {
			messages = messages.map((arg) => {
				if (arg instanceof Error) {
					return arg.stack;
				}

				if (arg instanceof Object) {
					return inspect(arg);
				}
				return arg;
			});

			messages = printf.apply(printf, messages);
		} else {
			if (!this.opts.jsonOutput && messages[0] instanceof Object) {
				messages[0] = inspect(messages[0]);
			}

			messages = messages[0];
		}

		const meta = this.meta();
		const payload = {
			timestamp: Date.now(),
			tags: Array.isArray(tags) ? tags : [tags],
			log: messages,
			...(meta && {data: meta})
		};

		this.write(payload);
	}
}

module.exports = Logger;

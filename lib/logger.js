'use strict';

const Hoek = require('@hapi/hoek');
const moment = require('moment');
const printf = require('util').format;
const stringify = require('json-stringify-safe');
const inspect = require('util').inspect;

const internals = {
	defaults: {
		jsonOutput: true,
		format: 'YYYY-MM-DD HH:mm:ss.SSS',
		utc: false,
		requestInfoFilter: (requestInfo) => requestInfo
	}
};

/**
 * Default meta data to append to logs
 * @param  {Object} request
 * @return {Object|undefined}
 */
function defaultMeta(request) {
	if (!request) {
		return;
	}
	return {requestId: request.info.id};
}

/**
 * @typedef {Object} RequestInfo
 * @property {String} remoteAddress
 * @property {String} host
 * @property {String} path
 * @property {String} method
 * @property {Object} query
 * @property {Number} statusCode
 * @property {Number} responseTime
 * @property {String} userAgent
 * @property {String} [contentLength]
 * @property {String} [referer]
 */

/**
 * @typedef {Object} LogData
 * @property {Integer} timestamp when the log event occured
 * @property {String[]} tags
 * @property {Object|String} [log] the log message or object
 * @property {RequestInfo} [requestInfo]
 * @property {Object} [data] optional meta data
 */

class Logger {

	/**
	 * Creates a new Logger
	 *
	 * @class Logger
	 * @param {Object} [options]
	 * @param {String} [options.format] date format string
	 * @param {Boolean} [options.utc] UTC date
	 * @param {Boolean} [options.jsonOutput] output all data as stringified json
	 * @param {Object} [options.handler] Handler implementing `log(message)` method, defaults to console logging
	 * @param {Function} [options.meta] Should return meta data as an Object that is appended to logs. Default returns {requestId:request.info.id} This function doesnt always recieve request object.
	 */
	constructor(options) {
		this.opts = Hoek.applyToDefaults(internals.defaults, options || {});
		this.handler = this.opts.handler || console;
		this.meta = this.opts.meta || defaultMeta;
	}

	/**
	 * Handle Error
	 * @param  {Object} request
	 * @param  {Object} data
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
	 * Format timestamp
	 * @param  {Integer} timestamp
	 * @return {String}
	 */
	formatTime(timestamp) {
		const m = moment(parseInt(timestamp, 10));
		if (!this.opts.utc) {
			m.local();
		}

		return m.format(this.opts.format);
	}

	/**
	 * Handle 'request' event
	 * @param  {Object} request
	 * @param  {Object} event
	 */
	handleRequest(request, event) {
		this.write({
			timestamp: event.timestamp,
			tags: ['log'].concat(event.tags),
			data: this.meta(request),
			log: event.data || event.error
		});
	}

	/**
	 * Handle 'response' event
	 * @param  {Object} request
	 */
	handleResponse(request) {
		const referer = request.raw.req.headers.referer;
		const contentLength = Hoek.reach(request, 'response.headers.content-length');

		let remoteAddress = request.info.remoteAddress;
		const xFF = request.headers['x-forwarded-for'];

		if (xFF) {
			remoteAddress = xFF.split(',')[0];
		}

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
	 * @return {String}
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
	 * @param  {Object} event
	 */
	handleLog(event) {
		this.write({
			timestamp: event.timestamp,
			tags: ['log'].concat(event.tags),
			log: event.data || event.error
		});
	}

	/**
	 * Format log data to human readable string
	 * @param  {LogData} obj
	 * @return {String}
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
			obj.tags,
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

		let formatted = {
			_time: this.formatTime(obj.timestamp),
			_tags: obj.tags
		};

		formatted = Hoek.applyToDefaults(formatted, obj.data || {});
		formatted = Hoek.applyToDefaults(formatted, obj.requestInfo || {});

		if (obj.log && !Array.isArray(obj.log) && typeof obj.log === 'object') {
			if (obj.log instanceof Error) {
				formatted.error = obj.log.stack;
			} else {
				formatted = Hoek.applyToDefaults(formatted, obj.log);
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

		const payload = {
			timestamp: Date.now(),
			tags: Array.isArray(tags) ? tags : [tags],
			log: messages
		};

		const meta = this.meta();
		if (meta) {
			payload.data = meta;
		}

		this.write(payload);
	}
}

module.exports = Logger;

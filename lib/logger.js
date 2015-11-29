'use strict';

var Hoek = require('hoek');
var moment = require('moment');
var printf = require('util').format;
var stringify = require('json-stringify-safe');
var inspect = require('util').inspect;

var internals = {
	defaults: {
		jsonOutput: true,
		format: 'YYYY-MM-DD HH:mm:ss.SSS',
		utc: false
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
	return {requestId: request.id};
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

/**
 * Creates a new Logger
 *
 * @class Logger
 * @param {Object} [options]
 * @param {String} [options.format] date format string
 * @param {Boolean} [options.utc] UTC date
 * @param {Boolean} [options.jsonOutput] output all data as stringified json
 * @param {Object} [options.handler] Handler implementing `log(message)` method, defaults to console logging
 * @param {Function} [options.meta] Should return meta data as an Object that is appended to logs. Default returns {requestId:request.id} This function doesnt always recieve request object.
 */
var Logger = module.exports = function Logger(options) {
	this.opts = Hoek.applyToDefaults(internals.defaults, options || {});
	this.handler = this.opts.handler || console;
	this.meta = this.opts.meta || defaultMeta;
};

/**
 * Handle Error
 * @param  {Object} request
 * @param  {Error} error
 */
Logger.prototype.handleError = function (request, error) {
	this.write({
		timestamp: Date.now(),
		tags: ['error'],
		data: this.meta(request),
		log: printf('%s, stack:\n%s', error.message, error.stack)
	});
};

/**
 * Format timestamp
 * @param  {Integer} timestamp
 * @return {String}
 */
Logger.prototype.formatTime = function (timestamp) {
	var m = moment(parseInt(timestamp, 10));
	if (!this.opts.utc) {
		m.local();
	}

	return m.format(this.opts.format);
};

/**
 * Handle 'request' event
 * @param  {Object} request
 * @param  {Object} event
 */
Logger.prototype.handleRequest = function (request, event) {
	this.write({
		timestamp: event.timestamp,
		tags: ['log'].concat(event.tags),
		data: this.meta(request),
		log: event.data
	});
};

/**
 * Handle 'response' event
 * @param  {Object} request
 */
Logger.prototype.handleResponse = function (request) {
	var referer = request.raw.req.headers.referer;
	var contentLength = Hoek.reach(request, 'response.headers.content-length');

	var requestInfo = {
		remoteAddress: request.info.remoteAddress,
		host: request.connection.info.uri,
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
		requestInfo: requestInfo
	});
};

/**
 * Format RequestInfo to a human friendly string
 * @param  {RequestInfo} data
 * @return {String}
 */
Logger.prototype.stringifyRequestInfo = function (data) {
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
};

/**
 * Handle 'log' event
 * @param  {Object} event
 */
Logger.prototype.handleLog = function (event) {
	this.write({
		timestamp: event.timestamp,
		tags: ['log'].concat(event.tags),
		log: event.data
	});
};

/**
 * Format log data to human readable string
 * @param  {LogData} obj
 * @return {String}
 */
Logger.prototype.humanReadableFormatter = function (obj) {
	var log;
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
};

/**
 * Formats Log to a string
 * @param  {LogData} obj
 * @return {String}
 */
Logger.prototype.formatter = function (obj) {
	if (!this.opts.jsonOutput) {
		return this.humanReadableFormatter(obj);
	}

	var formatted = {
		_time: this.formatTime(obj.timestamp),
		_tags: obj.tags
	};

	formatted = Hoek.applyToDefaults(formatted, obj.data || {});
	formatted = Hoek.applyToDefaults(formatted, obj.requestInfo || {});

	if (obj.log && typeof obj.log === 'object') {
		if (obj.log instanceof Error) {
			formatted.error = obj.log.stack;
		} else {
			formatted = Hoek.applyToDefaults(formatted, obj.log);
		}
	} else {
		formatted.msg = obj.log;
	}

	return stringify(formatted);
};

/**
 * Formats and writes the log data
 * @param  {LogData} obj
 */
Logger.prototype.write = function (obj) {
	this.handler.log(this.formatter(obj));
};

/**
 * Add a log entry
 * @param  {Array|String} tags
 * @param  {Object|String} msg...
 */
Logger.prototype.log = function (tags, msg) {
	var messages = Array.prototype.slice.call(arguments, 1);

	// only apply printf if it has multiple messages
	// we want to be able to handle a single error objects for jsonOutput differently
	if (messages.length > 1) {
		messages = messages.map(function (arg) {
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

	var payload = {
		timestamp: Date.now(),
		tags: Array.isArray(tags) ? tags : [tags],
		log: messages
	};

	var meta = this.meta();
	if (meta) {
		payload.data = meta;
	}

	this.write(payload);
};

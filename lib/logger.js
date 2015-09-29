'use strict';

var Hoek = require('hoek');
var moment = require('moment');
var printf = require('util').format;
var stringify = require('json-stringify-safe');

var internals = {
	defaults: {
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
	return {id: request.id};
}

/**
 * Creates a new Logger
 *
 * @class Logger
 * @param {Object} options
 * @param {String} options.format date format string
 * @param {Boolean} options.utc UTC date
 * @param {Object} [options.handler] Handler implementing `log(message)` method, defaults to console logging
 * @param {Function} [options.meta] Should return meta data as an Object that is appended to logs. Default returns {id:request.id} This function doesnt always recieve request object.
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

	var log = printf(
		'%s, %s %s %s %s %s (%sms), %s%s',
		request.info.remoteAddress,
		request.connection.info.uri,
		request.path,
		request.method,
		JSON.stringify(request.query),
		request.raw.res.statusCode,
		Date.now() - request.info.received,
		referer ? referer + ', ' : '',
		request.raw.req.headers['user-agent']
	);

	this.write({
		timestamp: request.info.received,
		tags: ['response'],
		data: this.meta(request),
		log: log
	});

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
 * Write formatted object with logging details
 * @param  {Object} obj
 * @param  {Integer} obj.timestamp
 * @param  {Array} obj.tags
 * @param  {Object|String} obj.log the log message or data
 * @param {Object} [obj.data] optional meta data
 */
Logger.prototype.write = function (obj) {
	var formatted = printf(
		'%s, [%s], %s%s',
		this.formatTime(obj.timestamp),
		obj.tags,
		typeof(obj.log) === 'object' ? stringify(obj.log) : obj.log,
		obj.data ? ', ' + stringify(obj.data) : ''
	);

	this.handler.log(formatted);
};

/**
 * Add a log entry
 * @param  {Array|String} tags
 * @param  {Object|String} msg
 */
Logger.prototype.log = function (tags, msg) {
	var payload = {
		timestamp: Date.now(),
		tags: Array.isArray(tags) ? tags : [tags],
		log: msg
	};

	var meta = this.meta();
	if (meta) {
		payload.data = meta;
	}

	this.write(payload);
};

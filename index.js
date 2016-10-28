'use strict';
const Logger = require('./lib/logger');

const internals = {
	instances: {}
};

module.exports = function (name, opts) {
	name = name || '_default';
	if (typeof (name) === 'object') {
		opts = name;
		name = '_default';
	}

	if (!internals.instances[name]) {
		internals.instances[name] = new Logger(opts);
	}

	return internals.instances[name];
};

module.exports.register = function (server, options, next) {
	const log = new Logger(options);
	server.on('request', log.handleRequest.bind(log));
	server.on('response', log.handleResponse.bind(log));
	server.on('log', log.handleLog.bind(log));
	server.on('request-error', log.handleError.bind(log));

	// optionally add error logging on onPreResponse.
	// To be used when reformatting output for errors in other plugins since it will disable the request-error event
	if (options.onPreResponseError) {
		server.ext('onPreResponse', (request, reply) => {
			const response = request.response;
			// check isServer cause we don't log the expected errors we return.
			if (response.isBoom && response.isServer) {
				log.handleError(request, response);
			}
			return reply.continue();
		});
	}

	internals.instances[options.name || 'hapi'] = log;
	next();
};

module.exports.register.attributes = {
	name: 'service-log'
};

module.exports.Logger = Logger;

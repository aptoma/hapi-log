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

module.exports.plugin = {
	name: 'service-log',
	register(server, options) {
		const log = new Logger(options);

		server.events.on({name: 'request', channels: 'app'}, log.handleRequest.bind(log));
		server.events.on('response', log.handleResponse.bind(log));
		server.events.on('log', log.handleLog.bind(log));
		server.events.on({name: 'request', channels: 'error'}, log.handleError.bind(log));

		// optionally add error logging on onPreResponse.
		// To be used when reformatting output for errors in other plugins since it will disable the request-error event
		if (options.onPreResponseError) {
			server.ext('onPreResponse', (request, h) => {
				const response = request.response;
				// check isServer cause we don't log the expected errors we return.
				if (response.isBoom && response.isServer) {
					log.handleError(request, {error: response});
				}

				return h.continue;
			});
		}

		internals.instances[options.name || 'hapi'] = log;
	}
};

module.exports.Logger = Logger;

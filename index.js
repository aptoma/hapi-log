'use strict';
var Logger = require('./lib/logger');

exports.register = function (server, options, next) {
	var log = new Logger(options);
	server.on('request', log.handleRequest.bind(log));
	server.on('response', log.handleResponse.bind(log));
	server.on('log', log.handleLog.bind(log));
	server.on('request-error', log.handleError.bind(log));

	// optionally add error logging on onPreResponse.
	// To be used when reformatting output for errors in other plugins since it will disable the request-error event
	if (options.onPreResponseError) {
		server.ext('onPreResponse', function (request, reply) {
			var response = request.response;
			// check isServer cause we don't log the expected errors we return.
			if (response.isBoom && response.isServer) {
				log.handleError(request, response);
			}
			return reply.continue();
		});
	}

	next();
};

exports.register.attributes = {
	name: 'service-log'
};

exports.Logger = Logger;

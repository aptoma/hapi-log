import {Logger} from './logger.js';
import type {LoggerOptions, PluginOptions} from './logger.js';
import type {Server, Request, ResponseToolkit} from '@hapi/hapi';
import type {Boom} from '@hapi/boom';

export {Logger} from './logger.js';
export type {LogHandler, RequestInfo, LogData, LoggerOptions, PluginOptions} from './logger.js';

const instances: Record<string, Logger> = {};

export default function hapiLog(name?: string | LoggerOptions, opts?: LoggerOptions): Logger {
	let resolvedName: string;
	let resolvedOpts = opts;

	if (!name || typeof name === 'object') {
		resolvedOpts = typeof name === 'object' ? name : opts;
		resolvedName = '_default';
	} else {
		resolvedName = name;
	}

	if (!instances[resolvedName]) {
		instances[resolvedName] = new Logger(resolvedOpts);
	}

	return instances[resolvedName];
}

export const plugin = {
	name: 'service-log',
	register(server: Server, options: PluginOptions = {}) {
		const {ignorePaths = [], ignoreMethods = []} = options;
		const log = new Logger(options);

		server.events.on({name: 'request', channels: 'app'}, (request, event) => log.handleRequest(request, event));
		server.events.on('log', (event) => log.handleLog(event));
		server.events.on({name: 'request', channels: 'error'}, (request, event) => log.handleError(request, event));

		if (ignorePaths.length || ignoreMethods.length) {
			const ignorePathMap = arrayToBooleanMap(ignorePaths);
			const ignoreMethodMap = arrayToBooleanMap(ignoreMethods);

			server.events.on('response', (request) => {
				if (ignorePathMap[request.path] || ignoreMethodMap[request.method]) {
					return;
				}

				log.handleResponse(request);
			});
		} else {
			server.events.on('response', log.handleResponse.bind(log));
		}

		// optionally add error logging on onPreResponse.
		// To be used when reformatting output for errors in other plugins since it will disable the request-error event
		if (options.onPreResponseError) {
			server.ext('onPreResponse', (request: Request, h: ResponseToolkit) => {
				const response = request.response;
				// check isServer cause we don't log the expected errors we return.
				if (isBoom(response) && response.isServer && response.output.statusCode === 500) {
					log.handleError(request, {error: response});
				}

				return h.continue;
			});
		}

		instances[options.name || 'hapi'] = log;
	}
};

function arrayToBooleanMap(array: string[]): Record<string, boolean> {
	return array.reduce<Record<string, boolean>>((acc, value) => {
		acc[value] = true;
		return acc;
	}, {});
}

function isBoom(response: Boom | object): response is Boom {
	return 'isBoom' in response && (response as Boom).isBoom;
}

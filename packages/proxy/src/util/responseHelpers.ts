import type { ServerResponse } from 'node:http';
import type { ResponseLike } from '@discordjs/rest';
import { DiscordAPIError, HTTPError, RateLimitError } from '@discordjs/rest';

/**
 * Populates a server response with the data from a Discord 2xx REST response
 *
 * @param res - The server response to populate
 * @param data - The data to populate the response with
 */
export async function populateSuccessfulResponse(res: ServerResponse, data: ResponseLike): Promise<void> {
	res.statusCode = data.status;

	for (const [headerName, headerValue] of data.headers.entries()) {
		// Strip ratelimit headers
		if (headerName.startsWith('x-ratelimit')) {
			continue;
		}

		res.setHeader(headerName, headerValue);
	}

	res.write(await data.arrayBuffer());
}

/**
 * Populates a server response with the data from a Discord non-2xx REST response that is NOT a 429
 *
 * @param res - The server response to populate
 * @param error - The error to populate the response with
 */
export function populateGeneralErrorResponse(res: ServerResponse, error: DiscordAPIError | HTTPError): void {
	res.statusCode = error.status;

	if ('rawError' in error) {
		res.setHeader('Content-Type', 'application/json');
		res.write(JSON.stringify(error.rawError));
	}
}

/**
 * Populates a server response with the data from a Discord 429 REST response
 *
 * @param res - The server response to populate
 * @param error - The error to populate the response with
 */
export function populateRatelimitErrorResponse(res: ServerResponse, error: RateLimitError): void {
	res.statusCode = 429;
	res.setHeader('Retry-After', error.timeToReset / 1_000);
}

/**
 * Populates a server response with data relevant for a timeout
 *
 * @param res - The sever response to populate
 */
export function populateAbortErrorResponse(res: ServerResponse): void {
	res.statusCode = 504;
	res.statusMessage = 'Upstream timed out';
}

/**
 * Tries to populate a server response from an error object
 *
 * @param res - The server response to populate
 * @param error - The error to check and use
 * @returns - True if the error is known and the response object was populated, otherwise false
 */
export function populateErrorResponse(res: ServerResponse, error: unknown): boolean {
	if (error instanceof DiscordAPIError || error instanceof HTTPError) {
		populateGeneralErrorResponse(res, error);
	} else if (error instanceof RateLimitError) {
		populateRatelimitErrorResponse(res, error);
	} else if (error instanceof Error && error.name === 'AbortError') {
		populateAbortErrorResponse(res);
	} else {
		return false;
	}

	return true;
}

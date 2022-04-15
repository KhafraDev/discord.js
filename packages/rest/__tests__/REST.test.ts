import { DiscordSnowflake } from '@sapphire/snowflake';
import { Routes, Snowflake } from 'discord-api-types/v10';
import { File, FormData, MockAgent } from 'undici';
import type { MockInterceptor } from 'undici/types/mock-interceptor';
import { REST } from '../src';
import { genPath } from './util';

const newSnowflake: Snowflake = DiscordSnowflake.generate().toString();
const query = new URLSearchParams([
	['foo', 'bar'],
	['hello', 'world'],
]);

// @discordjs/rest uses the `content-type` header to detect whether to parse
// the response as JSON or as an ArrayBuffer.
const responseOptions: MockInterceptor.MockResponseOptions = {
	headers: {
		'content-type': 'application/json',
	},
};

const mockAgent = new MockAgent();
mockAgent.disableNetConnect();

const api = new REST().setToken('A-Very-Fake-Token').setAgent(mockAgent);

const mockPool = mockAgent.get('https://discord.com');

// #region interceptors

mockPool
	.intercept({
		path: genPath('/simpleGet'),
		method: 'GET',
	})
	.reply(() => ({
		data: { test: true },
		statusCode: 200,
		responseOptions,
	}));

mockPool
	.intercept({
		path: genPath('/simpleDelete'),
		method: 'DELETE',
	})
	.reply(() => ({
		data: { test: true },
		statusCode: 200,
		responseOptions,
	}));

mockPool
	.intercept({
		path: genPath('/simplePatch'),
		method: 'PATCH',
	})
	.reply(() => ({
		data: { test: true },
		statusCode: 200,
		responseOptions,
	}));

mockPool
	.intercept({
		path: genPath('/simplePut'),
		method: 'PUT',
	})
	.reply(() => ({
		data: { test: true },
		statusCode: 200,
		responseOptions,
	}));

mockPool
	.intercept({
		path: genPath('/simplePost'),
		method: 'POST',
	})
	.reply(() => ({
		data: { test: true },
		statusCode: 200,
		responseOptions,
	}));

mockPool
	.intercept({
		path: genPath('/simplePut'),
		method: 'PUT',
	})
	.reply(() => ({
		data: { test: true },
		statusCode: 200,
		responseOptions,
	}));

mockPool
	.intercept({
		path: `${genPath('/getQuery')}?${query.toString()}`,
		method: 'GET',
	})
	.reply(() => ({
		data: { test: true },
		statusCode: 200,
		responseOptions,
	}));

mockPool
	.intercept({
		path: genPath('/getAuth'),
		method: 'GET',
	})
	.reply((t) => ({
		data: { auth: (t.headers as unknown as Record<string, string | undefined>)['Authorization'] ?? null },
		statusCode: 200,
		responseOptions,
	}))
	.times(3);

mockPool
	.intercept({
		path: genPath('/getReason'),
		method: 'GET',
	})
	.reply((t) => ({
		data: { reason: (t.headers as unknown as Record<string, string | undefined>)['X-Audit-Log-Reason'] ?? null },
		statusCode: 200,
		responseOptions,
	}))
	.times(3);

mockPool
	.intercept({
		path: genPath('/urlEncoded'),
		method: 'POST',
	})
	.reply((t) => ({
		data: t.body!,
		statusCode: 200,
	}));

mockPool
	.intercept({
		path: genPath('/postEcho'),
		method: 'POST',
	})
	.reply((t) => ({
		data: t.body!,
		statusCode: 200,
		responseOptions,
	}));

// The postFile interceptor will live in its function until the test is not skipped

mockPool
	.intercept({
		path: genPath('/channels/339942739275677727/messages/392063687801700356'),
		method: 'DELETE',
	})
	.reply(() => ({
		data: { test: true },
		statusCode: 200,
		responseOptions,
	}));

mockPool
	.intercept({
		path: genPath(`/channels/339942739275677727/messages/${newSnowflake}`),
		method: 'DELETE',
	})
	.reply(() => ({
		data: { test: true },
		statusCode: 200,
		responseOptions,
	}));

// #endregion

afterAll(async () => {
	await mockAgent.close();
});

test('global agent', () => {
	expect(api.requestManager.agent).toEqual(mockAgent);
	expect(api.getAgent()).toEqual(mockAgent);
});

test('simple GET', async () => {
	expect(await api.get('/simpleGet')).toStrictEqual({ test: true });
});

test('simple DELETE', async () => {
	expect(await api.delete('/simpleDelete')).toStrictEqual({ test: true });
});

test('simple PATCH', async () => {
	expect(await api.patch('/simplePatch')).toStrictEqual({ test: true });
});

test('simple PUT', async () => {
	expect(await api.put('/simplePut')).toStrictEqual({ test: true });
});

test('simple POST', async () => {
	expect(await api.post('/simplePost')).toStrictEqual({ test: true });
});

test('simple PUT', async () => {
	expect(await api.put('/simplePut')).toStrictEqual({ test: true });
});

test('getQuery', async () => {
	expect(
		await api.get('/getQuery', {
			query,
		}),
	).toStrictEqual({ test: true });
});

test('getAuth', async () => {
	// default
	expect(await api.get('/getAuth')).toStrictEqual({ auth: 'Bot A-Very-Fake-Token' });

	// unauthorized
	expect(
		await api.get('/getAuth', {
			auth: false,
		}),
	).toStrictEqual({ auth: null });

	// authorized
	expect(
		await api.get('/getAuth', {
			auth: true,
		}),
	).toStrictEqual({ auth: 'Bot A-Very-Fake-Token' });
});

test('getReason', async () => {
	// default
	expect(await api.get('/getReason')).toStrictEqual({ reason: null });

	// plain text
	expect(
		await api.get('/getReason', {
			reason: 'Hello',
		}),
	).toStrictEqual({ reason: 'Hello' });

	// encoded
	expect(
		await api.get('/getReason', {
			reason: '😄',
		}),
	).toStrictEqual({ reason: '%F0%9F%98%84' });
});

test('urlEncoded', async () => {
	const body = new URLSearchParams([
		['client_id', '1234567890123545678'],
		['client_secret', 'totally-valid-secret'],
		['redirect_uri', 'http://localhost'],
		['grant_type', 'authorization_code'],
		['code', 'very-invalid-code'],
	]);

	expect(
		new Uint8Array(
			(await api.post('/urlEncoded', {
				body,
				passThroughBody: true,
				auth: false,
			})) as ArrayBuffer,
		),
	).toStrictEqual(new Uint8Array(Buffer.from(body.toString())));
});

test('postEcho', async () => {
	expect(await api.post('/postEcho', { body: { foo: 'bar' } })).toStrictEqual({ foo: 'bar' });
});

test('Old Message Delete Edge-Case: Old message', async () => {
	expect(await api.delete(Routes.channelMessage('339942739275677727', '392063687801700356'))).toStrictEqual({
		test: true,
	});
});

test('Old Message Delete Edge-Case: New message', async () => {
	expect(await api.delete(Routes.channelMessage('339942739275677727', newSnowflake))).toStrictEqual({ test: true });
});

test.skip('postFile', async () => {
	let time = 0;

	mockPool
		.intercept({
			path: genPath('/postFile'),
			method: 'POST',
		})
		.reply((t) => {
			// This is only possible due to a bug. Hopefully in the future
			// either the FormData object will be returned or we get the
			// stringified FormData body back.
			// https://github.com/nodejs/undici/issues/1322
			const fd = t.body as unknown as FormData;

			if (time === 0) {
				expect(t.body).toBeNull();
			} else if (time === 1) {
				expect(fd.get('files[0]')).toBeInstanceOf(File);
				expect(fd.get('files[0]')).toHaveProperty('size', 5); // 'Hello'
			} else if (time === 2) {
				expect(fd.get('files[0]')).toBeInstanceOf(File);
				expect(fd.get('files[0]')).toHaveProperty('size', 5); // Buffer.from('Hello')
				expect(fd.get('payload_json')).toStrictEqual(JSON.stringify({ foo: 'bar' }));
			} else if (time === 3) {
				expect(fd.get('files[0]')).toBeInstanceOf(File);
				expect(fd.get('files[1]')).toBeInstanceOf(File);

				expect(fd.get('files[0]')).toHaveProperty('size', 5); // Buffer.from('Hello')
				expect(fd.get('files[1]')).toHaveProperty('size', 2); // Buffer.from('Hi')
				expect(fd.get('payload_json')).toStrictEqual(JSON.stringify({ files: [{ id: 0, description: 'test' }] }));
			} else if (time === 4) {
				expect(fd.get('file')).toBeInstanceOf(File);
				expect(fd.get('file')).toHaveProperty('size', 7); // Buffer.from('Sticker')
				expect(fd.get('foo')).toStrictEqual('bar');
			}

			time++;
			return {
				statusCode: 200,
				data: 'Hello',
			};
		})
		.times(5);

	// postFile empty
	await api.post('/postFile', { files: [] });

	// postFile file (string)
	await api.post('/postFile', {
		files: [{ name: 'out.txt', data: 'Hello' }],
	});

	// postFile file and JSON
	await api.post('/postFile', {
		files: [{ name: 'out.txt', data: Buffer.from('Hello') }],
		body: { foo: 'bar' },
	});

	// postFile files and JSON
	await api.post('/postFile', {
		files: [
			{ name: 'out.txt', data: Buffer.from('Hello') },
			{ name: 'out.txt', data: Buffer.from('Hi') },
		],
		body: { files: [{ id: 0, description: 'test' }] },
	});

	// postFile sticker and JSON
	await api.post('/postFile', {
		files: [{ key: 'file', name: 'sticker.png', data: Buffer.from('Sticker') }],
		body: { foo: 'bar' },
		appendToFormData: true,
	});
});

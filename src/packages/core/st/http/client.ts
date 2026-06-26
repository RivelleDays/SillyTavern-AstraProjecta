import { StHttpError, type StHttpErrorReason } from "@/packages/core/st/http/errors";
import type { StResponseGuard } from "@/packages/core/st/http/responseGuards";
import { isRecord } from "@/packages/core/st/shared";

type FetchLike = typeof fetch;

export type StHttpContextLike = {
	getRequestHeaders?: () => unknown;
};

export type StHttpLogger = {
	warn?: (message: string, details?: Record<string, unknown>) => void;
};

export type CreateStHttpClientOptions = {
	fetchImpl?: FetchLike | null;
	getContext?: () => StHttpContextLike | null | undefined;
	logger?: StHttpLogger | null;
	timeoutMs?: number;
};

export type StPostJsonOptions = {
	headers?: Record<string, string>;
	signal?: AbortSignal;
	timeoutMs?: number;
};

export type StHttpClient = {
	postJson<T>(
		endpoint: string,
		body: unknown,
		guard: StResponseGuard<T>,
		options?: StPostJsonOptions,
	): Promise<T>;
	postJsonForStatus(
		endpoint: string,
		body: unknown,
		options?: StPostJsonOptions,
	): Promise<void>;
};

const DEFAULT_TIMEOUT_MS = 15_000;

function normalizeHeaders(value: unknown): Record<string, string> {
	if (value instanceof Headers) {
		const headers: Record<string, string> = {};
		value.forEach((headerValue, key) => {
			headers[key] = headerValue;
		});
		return headers;
	}

	if (Array.isArray(value)) {
		return Object.fromEntries(
			value.flatMap((entry) => {
				if (!Array.isArray(entry) || entry.length < 2) {
					return [];
				}

				const [key, headerValue] = entry;
				return typeof key === "string" && typeof headerValue === "string"
					? [[key, headerValue] as const]
					: [];
			}),
		);
	}

	if (!isRecord(value)) {
		return {};
	}

	return Object.fromEntries(
		Object.entries(value).flatMap(([key, headerValue]) => {
			if (typeof headerValue === "string") {
				return [[key, headerValue] as const];
			}

			if (
				typeof headerValue === "number" ||
				typeof headerValue === "boolean"
			) {
				return [[key, String(headerValue)] as const];
			}

			return [];
		}),
	);
}

function resolveRequestHeaders({
	context,
	headers,
}: {
	context: StHttpContextLike | null | undefined;
	headers?: Record<string, string>;
}): Record<string, string> {
	let contextHeaders: Record<string, string> = {};
	if (typeof context?.getRequestHeaders === "function") {
		try {
			contextHeaders = normalizeHeaders(context.getRequestHeaders());
		} catch {
			contextHeaders = {};
		}
	}

	const mergedHeaders = {
		...contextHeaders,
		...headers,
	};
	for (const key of Object.keys(mergedHeaders)) {
		if (key.toLocaleLowerCase() === "content-type") {
			delete mergedHeaders[key];
		}
	}

	return {
		...mergedHeaders,
		"Content-Type": "application/json",
	};
}

function isAbortError(error: unknown): boolean {
	return (
		error instanceof DOMException && error.name === "AbortError"
	) || (error instanceof Error && error.name === "AbortError");
}

function logHttpError(logger: StHttpLogger | null | undefined, error: StHttpError) {
	logger?.warn?.("[AstraProjecta] SillyTavern HTTP request failed", {
		endpoint: error.endpoint,
		reason: error.reason,
		status: error.status,
	});
}

function createError(input: {
	cause?: unknown;
	endpoint: string;
	payload?: unknown;
	reason: StHttpErrorReason;
	status?: number;
	statusText?: string;
}): StHttpError {
	return new StHttpError(input);
}

export function createStHttpClient({
	fetchImpl = typeof globalThis.fetch === "function"
		? globalThis.fetch.bind(globalThis)
		: null,
	getContext = () => null,
	logger = console,
	timeoutMs = DEFAULT_TIMEOUT_MS,
}: CreateStHttpClientOptions = {}): StHttpClient {
	async function requestJsonResponse(
		endpoint: string,
		body: unknown,
		options: StPostJsonOptions = {},
	): Promise<Response> {
		if (typeof fetchImpl !== "function") {
			const error = createError({
				endpoint,
				reason: "capability-unavailable",
			});
			logHttpError(logger, error);
			throw error;
		}

		const requestTimeoutMs = options.timeoutMs ?? timeoutMs;
		const controller =
			typeof AbortController === "function"
				? new AbortController()
				: null;
		let timedOut = false;
		let timeoutId: ReturnType<typeof setTimeout> | null = null;

		const abortForCaller = () => {
			controller?.abort();
		};

		if (options.signal?.aborted) {
			const error = createError({
				endpoint,
				reason: "aborted",
			});
			logHttpError(logger, error);
			throw error;
		}

		options.signal?.addEventListener("abort", abortForCaller, {
			once: true,
		});

		if (
			controller &&
			Number.isFinite(requestTimeoutMs) &&
			requestTimeoutMs > 0
		) {
			timeoutId = setTimeout(() => {
				timedOut = true;
				controller.abort();
			}, requestTimeoutMs);
		}

		let response: Response;
		try {
			response = await fetchImpl(endpoint, {
				body: JSON.stringify(body),
				headers: resolveRequestHeaders({
					context: getContext(),
					headers: options.headers,
				}),
				method: "POST",
				signal: controller?.signal ?? options.signal,
			});
		} catch (cause) {
			const reason: StHttpErrorReason = timedOut
				? "timeout"
				: isAbortError(cause) || options.signal?.aborted
					? "aborted"
					: "network-error";
			const error = createError({
				cause,
				endpoint,
				reason,
			});
			logHttpError(logger, error);
			throw error;
		} finally {
			if (timeoutId !== null) {
				clearTimeout(timeoutId);
			}
			options.signal?.removeEventListener("abort", abortForCaller);
		}

		if (!response.ok) {
			let payload: unknown;
			try {
				payload = await response.json();
			} catch {
				payload = undefined;
			}
			const error = createError({
				endpoint,
				payload,
				reason: "http-error",
				status: response.status,
				statusText: response.statusText,
			});
			logHttpError(logger, error);
			throw error;
		}

		return response;
	}

	async function postJson<T>(
		endpoint: string,
		body: unknown,
		guard: StResponseGuard<T>,
		options: StPostJsonOptions = {},
	): Promise<T> {
		const response = await requestJsonResponse(endpoint, body, options);

		let payload: unknown;
		try {
			payload = await response.json();
		} catch (cause) {
			const error = createError({
				cause,
				endpoint,
				reason: "invalid-payload",
			});
			logHttpError(logger, error);
			throw error;
		}

		if (!guard(payload)) {
			const error = createError({
				endpoint,
				reason: "invalid-payload",
			});
			logHttpError(logger, error);
			throw error;
		}

		return payload;
	}

	async function postJsonForStatus(
		endpoint: string,
		body: unknown,
		options: StPostJsonOptions = {},
	): Promise<void> {
		await requestJsonResponse(endpoint, body, options);
	}

	return {
		postJson,
		postJsonForStatus,
	};
}

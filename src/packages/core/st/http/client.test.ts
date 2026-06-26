import { describe, expect, test, vi } from "vitest";

import { createStHttpClient } from "@/packages/core/st/http/client";
import { ST_ENDPOINTS } from "@/packages/core/st/http/endpoints";
import {
	isArrayPayload,
	isRecordPayload,
} from "@/packages/core/st/http/responseGuards";

function createJsonResponse({
	ok = true,
	payload,
	status = ok ? 200 : 500,
	statusText = ok ? "OK" : "Server Error",
}: {
	ok?: boolean;
	payload: unknown;
	status?: number;
	statusText?: string;
}): Response {
	return {
		json: vi.fn().mockResolvedValue(payload),
		ok,
		status,
		statusText,
	} as unknown as Response;
}

function createAbortAwareFetch() {
	return vi.fn(
		(_input: RequestInfo | URL, init?: RequestInit) =>
			new Promise<Response>((_resolve, reject) => {
				init?.signal?.addEventListener("abort", () => {
					reject(
						new DOMException("The operation was aborted.", "AbortError"),
					);
				});
			}),
	);
}

describe("ST HTTP client", () => {
	test("posts JSON with SillyTavern request headers and parses guarded payloads", async () => {
		const fetchImpl = vi.fn().mockResolvedValue(
			createJsonResponse({
				payload: [{ file_name: "chapter-1.jsonl" }],
			}),
		);
		const client = createStHttpClient({
			fetchImpl,
			getContext: () => ({
				getRequestHeaders: () =>
					new Headers([
						["X-CSRF-Token", "token-1"],
						["Content-Type", "text/plain"],
					]),
			}),
		});

		const result = await client.postJson(
			ST_ENDPOINTS.characterChats,
			{ avatar_url: "hero.png" },
			isArrayPayload,
		);

		expect(result).toEqual([{ file_name: "chapter-1.jsonl" }]);
		expect(fetchImpl).toHaveBeenCalledWith(
			ST_ENDPOINTS.characterChats,
			expect.objectContaining({
				body: JSON.stringify({ avatar_url: "hero.png" }),
				headers: expect.objectContaining({
					"Content-Type": "application/json",
					"x-csrf-token": "token-1",
				}),
				method: "POST",
			}),
		);
	});

	test("throws typed errors for non-2xx and invalid guarded payloads", async () => {
		const httpFailureClient = createStHttpClient({
			fetchImpl: vi.fn().mockResolvedValue(
				createJsonResponse({
					ok: false,
					payload: { error: "nope" },
					status: 503,
					statusText: "Unavailable",
				}),
			),
			getContext: () => null,
			logger: null,
		});

		await expect(
			httpFailureClient.postJson(
				ST_ENDPOINTS.groupInfo,
				{ id: "campfire" },
				isRecordPayload,
			),
		).rejects.toMatchObject({
			endpoint: ST_ENDPOINTS.groupInfo,
			reason: "http-error",
			status: 503,
			statusText: "Unavailable",
		});

		const invalidPayloadClient = createStHttpClient({
			fetchImpl: vi.fn().mockResolvedValue(
				createJsonResponse({
					payload: null,
				}),
			),
			getContext: () => null,
			logger: null,
		});

		await expect(
			invalidPayloadClient.postJson(
				ST_ENDPOINTS.recentChats,
				{},
				isArrayPayload,
			),
		).rejects.toMatchObject({
			endpoint: ST_ENDPOINTS.recentChats,
			reason: "invalid-payload",
		});
	});

	test("posts JSON for status-only endpoints without parsing response bodies", async () => {
		const fetchImpl = vi.fn().mockResolvedValue({
			json: vi.fn().mockRejectedValue(new Error("no body")),
			ok: true,
			status: 200,
			statusText: "OK",
		} as unknown as Response);
		const client = createStHttpClient({
			fetchImpl,
			getContext: () => null,
			logger: null,
		});

		await expect(
			client.postJsonForStatus(ST_ENDPOINTS.chatDelete, {
				chatfile: "chapter-1.jsonl",
			}),
		).resolves.toBeUndefined();

		expect(fetchImpl).toHaveBeenCalledWith(
			ST_ENDPOINTS.chatDelete,
			expect.objectContaining({
				body: JSON.stringify({ chatfile: "chapter-1.jsonl" }),
				headers: {
					"Content-Type": "application/json",
				},
				method: "POST",
			}),
		);
	});

	test("distinguishes timeout aborts from caller aborts", async () => {
		vi.useFakeTimers();
		const timeoutFetch = createAbortAwareFetch();
		const timeoutClient = createStHttpClient({
			fetchImpl: timeoutFetch,
			getContext: () => null,
			logger: null,
			timeoutMs: 50,
		});

		const timeoutResult = timeoutClient.postJson(
			ST_ENDPOINTS.tokenizerOpenAiCount,
			[{ role: "user", content: "hello" }],
			isRecordPayload,
		);
		const timeoutExpectation = expect(timeoutResult).rejects.toMatchObject({
			endpoint: ST_ENDPOINTS.tokenizerOpenAiCount,
			reason: "timeout",
		});
		await vi.advanceTimersByTimeAsync(50);

		await timeoutExpectation;

		const abortFetch = createAbortAwareFetch();
		const abortClient = createStHttpClient({
			fetchImpl: abortFetch,
			getContext: () => null,
			logger: null,
			timeoutMs: 1_000,
		});
		const abortController = new AbortController();
		const abortResult = abortClient.postJson(
			ST_ENDPOINTS.tokenizerOpenAiCount,
			[{ role: "user", content: "hello" }],
			isRecordPayload,
			{ signal: abortController.signal },
		);

		abortController.abort();

		await expect(abortResult).rejects.toMatchObject({
			endpoint: ST_ENDPOINTS.tokenizerOpenAiCount,
			reason: "aborted",
		});
	});
});

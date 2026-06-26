export type StHttpErrorReason =
	| "aborted"
	| "capability-unavailable"
	| "http-error"
	| "invalid-payload"
	| "network-error"
	| "timeout";

export type StHttpErrorInput = {
	cause?: unknown;
	endpoint: string;
	payload?: unknown;
	reason: StHttpErrorReason;
	status?: number;
	statusText?: string;
};

export class StHttpError extends Error {
	readonly cause?: unknown;
	readonly endpoint: string;
	readonly payload?: unknown;
	readonly reason: StHttpErrorReason;
	readonly status?: number;
	readonly statusText?: string;

	constructor({
		cause,
		endpoint,
		payload,
		reason,
		status,
		statusText,
	}: StHttpErrorInput) {
		super(createStHttpErrorMessage({ endpoint, reason, status }));
		this.name = "StHttpError";
		this.cause = cause;
		this.endpoint = endpoint;
		this.payload = payload;
		this.reason = reason;
		this.status = status;
		this.statusText = statusText;
	}
}

function createStHttpErrorMessage({
	endpoint,
	reason,
	status,
}: {
	endpoint: string;
	reason: StHttpErrorReason;
	status?: number;
}): string {
	const statusSuffix = status == null ? "" : ` (${status})`;
	return `SillyTavern HTTP request failed for ${endpoint}: ${reason}${statusSuffix}`;
}

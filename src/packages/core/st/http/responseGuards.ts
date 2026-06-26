export type StResponseGuard<T> = (payload: unknown) => payload is T;

export function isRecordPayload(
	payload: unknown,
): payload is Record<string, unknown> {
	return typeof payload === "object" && payload !== null && !Array.isArray(payload);
}

export function isArrayPayload(payload: unknown): payload is unknown[] {
	return Array.isArray(payload);
}

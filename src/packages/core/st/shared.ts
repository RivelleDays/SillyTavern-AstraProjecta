import { getStContext } from "@/packages/core/st/context";

export type EventSourceLike = {
	emit?(event: string, ...args: unknown[]): void | Promise<void>;
	on(
		event: string,
		listener: (...args: unknown[]) => void | Promise<void>,
	): void;
	removeListener(
		event: string,
		listener: (...args: unknown[]) => void | Promise<void>,
	): void;
};

export type EventTypesLike = {
	APP_INITIALIZED?: string;
	APP_READY?: string;
	CHAT_CHANGED?: string;
	CHATCOMPLETION_MODEL_CHANGED?: string;
	CHATCOMPLETION_SOURCE_CHANGED?: string;
	CHAT_DELETED?: string;
	CHAT_COMPLETION_PROMPT_READY?: string;
	CHAT_LOADED?: string;
	CHAT_RENAMED?: string;
	CHARACTER_MESSAGE_RENDERED?: string;
	CHARACTER_MANAGEMENT_DROPDOWN?: string;
	CHARACTER_EDITED?: string;
	CHARACTER_RENAMED?: string;
	CONNECTION_PROFILE_CREATED?: string;
	CONNECTION_PROFILE_DELETED?: string;
	CONNECTION_PROFILE_LOADED?: string;
	CONNECTION_PROFILE_UPDATED?: string;
	GENERATION_ENDED?: string;
	GENERATION_AFTER_COMMANDS?: string;
	GENERATION_STARTED?: string;
	GENERATION_STOPPED?: string;
	GROUP_CHAT_CREATED?: string;
	GROUP_CHAT_DELETED?: string;
	GROUP_UPDATED?: string;
	MAIN_API_CHANGED?: string;
	MESSAGE_DELETED?: string;
	MESSAGE_EDITED?: string;
	MESSAGE_REASONING_DELETED?: string;
	MESSAGE_REASONING_EDITED?: string;
	MESSAGE_RECEIVED?: string;
	MESSAGE_SWIPE_DELETED?: string;
	MESSAGE_SWIPED?: string;
	MESSAGE_SENT?: string;
	MESSAGE_UPDATED?: string;
	ONLINE_STATUS_CHANGED?: string;
	PERSONA_CHANGED?: string;
	PERSONA_RENAMED?: string;
	PERSONA_UPDATED?: string;
	PRESET_CHANGED?: string;
	PRESET_DELETED?: string;
	PRESET_RENAMED?: string;
	SETTINGS_UPDATED?: string;
	USER_MESSAGE_RENDERED?: string;
};

export const queueMicrotaskSafe =
	typeof queueMicrotask === "function"
		? queueMicrotask
		: (callback: () => void) => Promise.resolve().then(callback);

const JSONL_EXTENSION_PATTERN = /\.jsonl$/i;

export function asTrimmedString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

export function asTrimmedIdentifier(value: unknown): string {
	if (typeof value === "string") {
		return value.trim();
	}

	if (typeof value === "number" && Number.isFinite(value)) {
		return String(value);
	}

	return "";
}

export function asTrimmedPrimitiveString(value: unknown): string {
	if (
		typeof value === "boolean" ||
		typeof value === "number" ||
		typeof value === "string"
	) {
		return String(value).trim();
	}

	return "";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeChatId(value: unknown): string {
	return asTrimmedString(value).replace(JSONL_EXTENSION_PATTERN, "");
}

export function readContextSafe<
	TContext extends Record<string, unknown> = Record<string, unknown>,
>(getContext: () => unknown = getStContext): TContext | null {
	try {
		const context = getContext();
		return isRecord(context) ? (context as TContext) : null;
	} catch {
		return null;
	}
}

export function resolveEventTypes(
	context: Record<string, unknown>,
): EventTypesLike {
	if (isRecord(context.eventTypes)) {
		return context.eventTypes as EventTypesLike;
	}

	if (isRecord(context.event_types)) {
		return context.event_types as EventTypesLike;
	}

	return {};
}

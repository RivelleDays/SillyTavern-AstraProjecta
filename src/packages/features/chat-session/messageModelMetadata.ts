function asTrimmedString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

export interface MessageModelLabelSources {
	iconTitle?: unknown;
	model?: unknown;
}

const PROVIDER_ICON_KEY_ALIASES: Array<{
	iconKey: string;
	pattern: RegExp;
}> = [
	{ iconKey: "claude", pattern: /\b(?:anthropic|claude)\b/i },
	{ iconKey: "deepseek", pattern: /\bdeepseek\b/i },
	{
		iconKey: "openai",
		pattern: /\b(?:openai|chatgpt|gpt|o[134])\b/i,
	},
	{
		iconKey: "vertexai",
		pattern: /\b(?:gemini|google|makersuite|vertexai|palm)\b/i,
	},
	{ iconKey: "xai", pattern: /\b(?:grok|xai)\b/i },
	{ iconKey: "mistralai", pattern: /\b(?:mistral|mixtral)\b/i },
	{ iconKey: "cohere", pattern: /\b(?:cohere|command)\b/i },
	{ iconKey: "ai21", pattern: /\b(?:ai21|jamba)\b/i },
	{ iconKey: "perplexity", pattern: /\b(?:perplexity|sonar)\b/i },
];

export function formatMessageModelLabel(value: unknown): string {
	const rawValue = asTrimmedString(value);
	if (!rawValue) {
		return "";
	}

	const titleSegments = rawValue.split(/\s+-\s+/).filter(Boolean);
	const modelValue = titleSegments.at(-1) ?? rawValue;
	const modelSegments = modelValue.split("/").filter(Boolean);
	return modelSegments.at(-1) ?? modelValue;
}

export function resolveMessageModelLabel({
	iconTitle,
	model,
}: MessageModelLabelSources): string {
	return formatMessageModelLabel(model) || formatMessageModelLabel(iconTitle);
}

function normalizeProviderIconKeyCandidate(value: string): string {
	const normalizedValue = value.trim().toLowerCase();

	if (!/^[a-z0-9_-]+$/.test(normalizedValue)) {
		return "";
	}

	return normalizedValue;
}

function resolveProviderCandidateFromModel(value: string): string {
	const modelSegments = value.split("/").filter(Boolean);
	if (modelSegments.length === 0) {
		return "";
	}

	if (modelSegments[0] === "openrouter") {
		return modelSegments[1] === "auto" ? "" : (modelSegments[1] ?? "");
	}

	return modelSegments.length >= 2 ? modelSegments[0] : "";
}

function resolveProviderCandidateFromIconTitle(value: string): string {
	return (
		value
			.split(/\s+-\s+/)
			.filter(Boolean)
			.at(0) ?? ""
	);
}

function resolveKnownProviderIconKey(value: string): string {
	for (const { iconKey, pattern } of PROVIDER_ICON_KEY_ALIASES) {
		if (pattern.test(value)) {
			return iconKey;
		}
	}

	return "";
}

export function resolveMessageModelIconKey({
	iconTitle,
	model,
}: MessageModelLabelSources): string {
	const rawModel = asTrimmedString(model);
	const rawIconTitle = asTrimmedString(iconTitle);
	const compactModelLabel =
		formatMessageModelLabel(rawModel) ||
		formatMessageModelLabel(rawIconTitle);
	const haystack = `${rawModel} ${rawIconTitle} ${compactModelLabel}`;
	const knownIconKey = resolveKnownProviderIconKey(haystack);
	if (knownIconKey) {
		return knownIconKey;
	}

	return (
		normalizeProviderIconKeyCandidate(
			resolveProviderCandidateFromModel(rawModel),
		) ||
		normalizeProviderIconKeyCandidate(
			resolveProviderCandidateFromIconTitle(rawIconTitle),
		)
	);
}

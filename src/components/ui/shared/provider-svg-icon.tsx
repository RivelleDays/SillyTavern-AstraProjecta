import * as React from "react";

type ProviderSvgIconCacheEntry =
	| { status: "failed" }
	| { promise: Promise<void>; status: "loading" }
	| { source: string; status: "ready" };

export type ProviderSvgIconState =
	| { status: "failed" | "idle" | "loading" }
	| { source: string; status: "ready" };

const providerSvgIconCache = new Map<string, ProviderSvgIconCacheEntry>();
const providerSvgIconListeners = new Map<string, Set<() => void>>();

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getProviderSvgIconUrl(iconKey: string): string {
	return `/img/${encodeURIComponent(iconKey)}.svg`;
}

function notifyProviderSvgIconListeners(iconKey: string) {
	const listeners = providerSvgIconListeners.get(iconKey);

	if (!listeners) {
		return;
	}

	for (const listener of listeners) {
		listener();
	}
}

function subscribeProviderSvgIcon(
	iconKey: string,
	listener: () => void,
): () => void {
	const listeners =
		providerSvgIconListeners.get(iconKey) ?? new Set<() => void>();
	listeners.add(listener);
	providerSvgIconListeners.set(iconKey, listeners);

	return () => {
		listeners.delete(listener);

		if (listeners.size === 0) {
			providerSvgIconListeners.delete(iconKey);
		}
	};
}

function getProviderSvgIconState(iconKey: string): ProviderSvgIconState {
	if (!iconKey) {
		return { status: "idle" };
	}

	return providerSvgIconCache.get(iconKey) ?? { status: "idle" };
}

export function sanitizeProviderSvgSource(svgText: string): string | null {
	const svgDocumentText = svgText
		.replace(/<\?xml[\s\S]*?\?>/giu, "")
		.replace(/<!doctype[\s\S]*?>/giu, "")
		.trim();
	const parser = new DOMParser();
	const documentRef = parser.parseFromString(
		svgDocumentText,
		"image/svg+xml",
	);

	if (documentRef.querySelector("parsererror")) {
		return null;
	}

	const svg = documentRef.documentElement;
	if (svg.localName.toLowerCase() !== "svg") {
		return null;
	}

	svg.querySelectorAll("script").forEach((node) => node.remove());

	for (const element of [svg, ...Array.from(svg.querySelectorAll("*"))]) {
		for (const attribute of Array.from(element.attributes)) {
			const attributeName = attribute.name.toLowerCase();
			const attributeValue = attribute.value.trim().toLowerCase();

			if (
				attributeName.startsWith("on") ||
				attributeValue.startsWith("javascript:")
			) {
				element.removeAttribute(attribute.name);
			}
		}
	}

	return svg.outerHTML;
}

function ensureProviderSvgIconLoad(iconKey: string) {
	if (!iconKey || providerSvgIconCache.has(iconKey)) {
		return;
	}

	const fetchProviderIcon = globalThis.fetch;
	if (typeof fetchProviderIcon !== "function") {
		providerSvgIconCache.set(iconKey, { status: "failed" });
		return;
	}

	const promise = Promise.resolve()
		.then(async () => {
			const response = await fetchProviderIcon(
				getProviderSvgIconUrl(iconKey),
			);
			if (!response.ok) {
				throw new Error(`Provider icon request failed for ${iconKey}`);
			}

			const source = sanitizeProviderSvgSource(await response.text());
			if (!source) {
				throw new Error(`Provider icon SVG is invalid for ${iconKey}`);
			}

			providerSvgIconCache.set(iconKey, {
				source,
				status: "ready",
			});
		})
		.catch(() => {
			providerSvgIconCache.set(iconKey, { status: "failed" });
		})
		.finally(() => {
			notifyProviderSvgIconListeners(iconKey);
		});

	providerSvgIconCache.set(iconKey, {
		promise,
		status: "loading",
	});
}

export function preloadProviderSvgIcon(iconKey: string) {
	ensureProviderSvgIconLoad(iconKey.trim());
}

export function useProviderSvgIconState(iconKey: string): ProviderSvgIconState {
	const normalizedIconKey = iconKey.trim();
	const [state, setState] = React.useState<ProviderSvgIconState>(() =>
		getProviderSvgIconState(normalizedIconKey),
	);

	React.useEffect(() => {
		if (!normalizedIconKey) {
			setState({ status: "idle" });
			return;
		}

		const unsubscribe = subscribeProviderSvgIcon(normalizedIconKey, () => {
			setState(getProviderSvgIconState(normalizedIconKey));
		});

		ensureProviderSvgIconLoad(normalizedIconKey);
		setState(getProviderSvgIconState(normalizedIconKey));

		return unsubscribe;
	}, [normalizedIconKey]);

	return state;
}

export function prefixProviderSvgReferences(
	source: string,
	prefix: string,
): string {
	const parser = new DOMParser();
	const documentRef = parser.parseFromString(source, "image/svg+xml");
	const svg = documentRef.documentElement;
	const idMap = new Map<string, string>();

	Array.from(svg.querySelectorAll("[id]")).forEach((element, index) => {
		const id = element.getAttribute("id");

		if (!id) {
			return;
		}

		const nextId = `${prefix}-${index}-${id}`;
		idMap.set(id, nextId);
		element.setAttribute("id", nextId);
	});

	if (idMap.size === 0) {
		return svg.outerHTML;
	}

	for (const element of [svg, ...Array.from(svg.querySelectorAll("*"))]) {
		for (const attribute of Array.from(element.attributes)) {
			let value = attribute.value;

			for (const [id, nextId] of idMap) {
				value = value.replace(
					new RegExp(`url\\(\\s*#${escapeRegExp(id)}\\s*\\)`, "g"),
					`url(#${nextId})`,
				);

				if (value === `#${id}`) {
					value = `#${nextId}`;
				}
			}

			if (value !== attribute.value) {
				element.setAttribute(attribute.name, value);
			}
		}
	}

	return svg.outerHTML;
}

export function ProviderSvgIcon({
	className,
	iconKey,
}: {
	className: string;
	iconKey?: string;
}) {
	const normalizedIconKey = iconKey?.trim() ?? "";
	const iconState = useProviderSvgIconState(normalizedIconKey);
	const iconId = React.useId().replace(/[^a-zA-Z0-9_-]/g, "");
	const iconMarkup = React.useMemo(() => {
		if (iconState.status !== "ready") {
			return "";
		}

		return prefixProviderSvgReferences(
			iconState.source,
			`astra-provider-icon-${iconId}`,
		);
	}, [iconId, iconState]);

	if (!normalizedIconKey || iconState.status === "failed") {
		return null;
	}

	return (
		<span
			aria-hidden={true}
			className={className}
			dangerouslySetInnerHTML={
				iconMarkup
					? {
							__html: iconMarkup,
						}
					: undefined
			}
		/>
	);
}

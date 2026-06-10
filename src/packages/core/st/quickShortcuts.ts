import { translateAstra } from "@/packages/core/i18n";
import { getStContext } from "@/packages/core/st/context";
import {
	type EventSourceLike,
	isRecord,
	queueMicrotaskSafe,
	resolveEventTypes,
} from "@/packages/core/st/shared";
import type { I18nKey } from "@/types/i18n";

type Listener = () => void;

type StContextLike = Record<string, unknown> & {
	eventSource?: unknown;
	eventTypes?: unknown;
	event_types?: unknown;
	powerUserSettings?: unknown;
};

const OPTIONS_ROOT_ID = "options";

export interface QuickShortcutDescriptor {
	fallbackLabelKey: I18nKey;
	fallbackOptionId: string;
	id: string;
	nativeButtonId: string;
	settingKey: string;
}

export interface QuickShortcutSnapshot {
	id: string;
	isAvailable: boolean;
	isEnabledInSettings: boolean;
	isVisible: boolean;
	label: string;
}

export interface QuickShortcutStore {
	dispose(): void;
	getSnapshot(): QuickShortcutSnapshot[];
	refresh(): void;
	subscribe(listener: Listener): () => void;
}

function resolveContextSafe(): StContextLike | null {
	try {
		return getStContext() as StContextLike;
	} catch {
		return null;
	}
}

function readTextAttribute(
	element: HTMLElement | null,
	attributeName: string,
): string {
	const value = element?.getAttribute(attributeName);
	return typeof value === "string" ? value.trim() : "";
}

function isElementVisible(element: HTMLElement | null): boolean {
	if (!(element instanceof HTMLElement) || !element.isConnected) {
		return false;
	}

	if (
		element.classList.contains("displayNone") ||
		element.hasAttribute("hidden")
	) {
		return false;
	}

	const view = element.ownerDocument.defaultView ?? window;
	const style = view.getComputedStyle(element);
	return style.display !== "none" && style.visibility !== "hidden";
}

function readNativeElement(
	elementId: string,
	documentRef: Document,
): HTMLElement | null {
	const element = documentRef.getElementById(elementId);
	return element instanceof HTMLElement ? element : null;
}

function getNativeOptionElements(
	nativeOptionId: string,
	documentRef: Document,
): HTMLElement[] {
	return Array.from(
		documentRef.querySelectorAll<HTMLElement>(
			`#${OPTIONS_ROOT_ID} [id="${nativeOptionId}"]`,
		),
	);
}

function readShortcutLabel(
	descriptor: QuickShortcutDescriptor,
	documentRef: Document,
): string {
	const nativeQuickButton = readNativeElement(
		descriptor.nativeButtonId,
		documentRef,
	);
	const nativeOption =
		getNativeOptionElements(descriptor.fallbackOptionId, documentRef)[0] ??
		null;

	return (
		readTextAttribute(nativeQuickButton, "title") ||
		readTextAttribute(nativeQuickButton, "aria-label") ||
		readTextAttribute(nativeOption, "title") ||
		readTextAttribute(nativeOption, "aria-label") ||
		translateAstra(descriptor.fallbackLabelKey)
	);
}

function readIsEnabledInSettings(
	descriptor: QuickShortcutDescriptor,
	context: StContextLike | null,
): boolean {
	if (!context || !isRecord(context.powerUserSettings)) {
		return false;
	}

	return context.powerUserSettings[descriptor.settingKey] === true;
}

function readQuickShortcutSnapshot(
	descriptor: QuickShortcutDescriptor,
	documentRef: Document,
	context: StContextLike | null,
): QuickShortcutSnapshot {
	const isAvailable = getNativeOptionElements(
		descriptor.fallbackOptionId,
		documentRef,
	).some((element) => isElementVisible(element));
	const isEnabledInSettings = readIsEnabledInSettings(descriptor, context);

	return {
		id: descriptor.id,
		isAvailable,
		isEnabledInSettings,
		isVisible: isEnabledInSettings && isAvailable,
		label: readShortcutLabel(descriptor, documentRef),
	};
}

function areSnapshotsEqual(
	current: readonly QuickShortcutSnapshot[],
	next: readonly QuickShortcutSnapshot[],
): boolean {
	if (current.length !== next.length) {
		return false;
	}

	return current.every((item, index) => {
		const candidate = next[index];
		return (
			candidate != null &&
			item.id === candidate.id &&
			item.isAvailable === candidate.isAvailable &&
			item.isEnabledInSettings === candidate.isEnabledInSettings &&
			item.isVisible === candidate.isVisible &&
			item.label === candidate.label
		);
	});
}

export function readQuickShortcutSnapshots({
	descriptors,
	documentRef = document,
}: {
	descriptors: readonly QuickShortcutDescriptor[];
	documentRef?: Document;
}): QuickShortcutSnapshot[] {
	const context = resolveContextSafe();
	return descriptors.map((descriptor) =>
		readQuickShortcutSnapshot(descriptor, documentRef, context),
	);
}

export function createQuickShortcutStore({
	descriptors,
	documentRef = document,
}: {
	descriptors: readonly QuickShortcutDescriptor[];
	documentRef?: Document;
}): QuickShortcutStore {
	const initialContext = resolveContextSafe();
	const eventSource = isRecord(initialContext?.eventSource)
		? (initialContext.eventSource as EventSourceLike)
		: null;
	const eventTypes = initialContext ? resolveEventTypes(initialContext) : {};
	const listeners = new Set<Listener>();
	const eventRefreshHandler = () => {
		scheduleRefresh();
	};

	let disposed = false;
	let isRefreshQueued = false;
	let snapshot = readQuickShortcutSnapshots({
		descriptors,
		documentRef,
	});
	let optionsRootElement: HTMLElement | null = null;
	let optionsRootObserver: MutationObserver | null = null;
	let activeEventNames: string[] = [];
	const toggleBindings = new Map<
		string,
		HTMLInputElement | HTMLButtonElement | null
	>();

	function notifyListeners() {
		for (const listener of listeners) {
			listener();
		}
	}

	function bindSettingListeners() {
		for (const descriptor of descriptors) {
			const nextToggle = documentRef.getElementById(
				descriptor.settingKey,
			);
			const normalizedToggle =
				nextToggle instanceof HTMLInputElement ||
				nextToggle instanceof HTMLButtonElement
					? nextToggle
					: null;
			const currentToggle = toggleBindings.get(descriptor.id) ?? null;

			if (currentToggle === normalizedToggle) {
				continue;
			}

			currentToggle?.removeEventListener("change", eventRefreshHandler);
			currentToggle?.removeEventListener("input", eventRefreshHandler);

			toggleBindings.set(descriptor.id, normalizedToggle);
			normalizedToggle?.addEventListener("change", eventRefreshHandler);
			normalizedToggle?.addEventListener("input", eventRefreshHandler);
		}
	}

	function bindOptionsObserver() {
		const nextOptionsRoot = documentRef.getElementById(OPTIONS_ROOT_ID);
		const normalizedOptionsRoot =
			nextOptionsRoot instanceof HTMLElement ? nextOptionsRoot : null;

		if (optionsRootElement === normalizedOptionsRoot) {
			return;
		}

		optionsRootObserver?.disconnect();
		optionsRootObserver = null;
		optionsRootElement = normalizedOptionsRoot;

		if (!optionsRootElement) {
			return;
		}

		optionsRootObserver = new MutationObserver(() => {
			scheduleRefresh();
		});

		optionsRootObserver.observe(optionsRootElement, {
			attributeFilter: [
				"aria-label",
				"class",
				"hidden",
				"style",
				"title",
			],
			attributes: true,
			childList: true,
			subtree: true,
		});
	}

	function refresh() {
		if (disposed) {
			return;
		}

		bindSettingListeners();
		bindOptionsObserver();

		const nextSnapshot = readQuickShortcutSnapshots({
			descriptors,
			documentRef,
		});
		if (areSnapshotsEqual(snapshot, nextSnapshot)) {
			return;
		}

		snapshot = nextSnapshot;
		notifyListeners();
	}

	function scheduleRefresh() {
		if (disposed || isRefreshQueued) {
			return;
		}

		isRefreshQueued = true;
		queueMicrotaskSafe(() => {
			isRefreshQueued = false;
			refresh();
		});
	}

	if (eventSource) {
		activeEventNames = [eventTypes.SETTINGS_UPDATED].filter(
			(eventName): eventName is string =>
				typeof eventName === "string" && eventName.length > 0,
		);

		for (const eventName of activeEventNames) {
			eventSource.on(eventName, eventRefreshHandler);
		}
	}

	bindSettingListeners();
	bindOptionsObserver();

	return {
		dispose() {
			disposed = true;
			listeners.clear();
			optionsRootObserver?.disconnect();
			optionsRootObserver = null;
			optionsRootElement = null;

			for (const toggleElement of toggleBindings.values()) {
				toggleElement?.removeEventListener(
					"change",
					eventRefreshHandler,
				);
				toggleElement?.removeEventListener(
					"input",
					eventRefreshHandler,
				);
			}
			toggleBindings.clear();

			if (eventSource) {
				for (const eventName of activeEventNames) {
					eventSource.removeListener(eventName, eventRefreshHandler);
				}
			}
			activeEventNames = [];
		},
		getSnapshot() {
			return snapshot;
		},
		refresh() {
			refresh();
		},
		subscribe(listener) {
			listeners.add(listener);

			return () => {
				listeners.delete(listener);
			};
		},
	};
}

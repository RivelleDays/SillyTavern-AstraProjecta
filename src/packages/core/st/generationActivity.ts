import { getStContext } from "@/packages/core/st/context";
import {
	type EventSourceLike,
	type EventTypesLike,
	isRecord,
	resolveEventTypes,
} from "@/packages/core/st/shared";

type Listener = () => void;

type StContextLike = Record<string, unknown> & {
	eventSource?: EventSourceLike;
	eventTypes?: EventTypesLike;
	event_types?: EventTypesLike;
	streamingProcessor?: unknown;
};

export interface GenerationActivitySnapshot {
	isGenerating: boolean;
	isGroupGenerating: boolean;
	isStreaming: boolean;
	updatedAt: number;
}

export interface GenerationActivityStore {
	dispose(): void;
	getSnapshot(): GenerationActivitySnapshot;
	refresh(): void;
	subscribe(listener: Listener): () => void;
}

const IGNORED_GENERATION_TYPES = new Set(["quiet", "impersonate"]);
const STOP_BUTTON_SELECTOR = "#mes_stop, .mes_stop";

function resolveContextSafe(): StContextLike | null {
	try {
		const context = getStContext();
		return isRecord(context) ? (context as StContextLike) : null;
	} catch {
		return null;
	}
}

function isElementVisible(element: Element | null): boolean {
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

function hasVisibleStopButton(documentRef: Document): boolean {
	return Array.from(documentRef.querySelectorAll(STOP_BUTTON_SELECTOR)).some(
		(element) => isElementVisible(element),
	);
}

function hasBodyGeneratingFlag(documentRef: Document): boolean {
	return documentRef.body?.dataset.generating === "true";
}

function hasActiveStreamingProcessor(context: StContextLike | null): boolean {
	const processor = context?.streamingProcessor;
	if (!processor) {
		return false;
	}

	if (!isRecord(processor)) {
		return true;
	}

	return processor.isFinished !== true && processor.isStopped !== true;
}

function isIgnoredGeneration(
	type: unknown,
	options: unknown,
	dryRun: unknown,
): boolean {
	const generationType = typeof type === "string" ? type.toLowerCase() : "";
	const isDryRun =
		dryRun === true || (isRecord(options) && options.dryRun === true);

	return isDryRun || IGNORED_GENERATION_TYPES.has(generationType);
}

function createSnapshot({
	documentRef,
	eventGenerationActive = false,
	groupGenerationActive = false,
	now,
}: {
	documentRef: Document;
	eventGenerationActive?: boolean;
	groupGenerationActive?: boolean;
	now: () => number;
}): GenerationActivitySnapshot {
	const context = resolveContextSafe();
	const isStreaming = hasActiveStreamingProcessor(context);
	const isGenerating =
		eventGenerationActive ||
		groupGenerationActive ||
		isStreaming ||
		hasVisibleStopButton(documentRef);

	return {
		isGenerating,
		isGroupGenerating: groupGenerationActive,
		isStreaming,
		updatedAt: now(),
	};
}

function snapshotsEqual(
	a: GenerationActivitySnapshot,
	b: GenerationActivitySnapshot,
): boolean {
	return (
		a.isGenerating === b.isGenerating &&
		a.isGroupGenerating === b.isGroupGenerating &&
		a.isStreaming === b.isStreaming
	);
}

export function readGenerationActivitySnapshot({
	documentRef = document,
	now = () => 0,
}: {
	documentRef?: Document;
	now?: () => number;
} = {}): GenerationActivitySnapshot {
	return createSnapshot({ documentRef, now });
}

export function createGenerationActivityStore({
	documentRef = document,
	now = Date.now,
}: {
	documentRef?: Document;
	now?: () => number;
} = {}): GenerationActivityStore {
	const context = resolveContextSafe();
	const eventSource = context?.eventSource ?? null;
	const eventTypes = context ? resolveEventTypes(context) : {};
	const canSubscribeToEvents =
		eventSource &&
		typeof eventSource.on === "function" &&
		typeof eventSource.removeListener === "function";
	const listeners = new Set<Listener>();
	let disposed = false;
	let eventGenerationActive = false;
	let groupGenerationActive = false;
	let snapshot = createSnapshot({
		documentRef,
		eventGenerationActive,
		groupGenerationActive,
		now,
	});

	function emit() {
		for (const listener of listeners) {
			listener();
		}
	}

	function updateSnapshot() {
		if (disposed) {
			return;
		}

		const nextSnapshot = createSnapshot({
			documentRef,
			eventGenerationActive,
			groupGenerationActive,
			now,
		});
		if (snapshotsEqual(snapshot, nextSnapshot)) {
			snapshot = nextSnapshot;
			return;
		}

		snapshot = nextSnapshot;
		emit();
	}

	function handleGenerationStarted(
		type?: unknown,
		options?: unknown,
		dryRun?: unknown,
	) {
		if (isIgnoredGeneration(type, options, dryRun)) {
			return;
		}

		eventGenerationActive = true;
		updateSnapshot();
	}

	function handleGenerationSettled() {
		eventGenerationActive = false;
		updateSnapshot();
	}

	function handleGroupWrapperStarted() {
		groupGenerationActive = true;
		updateSnapshot();
	}

	function handleGroupWrapperFinished() {
		groupGenerationActive = false;
		eventGenerationActive = false;
		updateSnapshot();
	}

	function handleContextReset() {
		groupGenerationActive = false;
		eventGenerationActive = false;
		updateSnapshot();
	}

	const eventBindingMap = new Map<string, (...args: unknown[]) => void>();
	const addEventBinding = (
		eventName: string | undefined,
		listener: (...args: unknown[]) => void,
	) => {
		if (!eventName || eventBindingMap.has(eventName)) {
			return;
		}
		eventBindingMap.set(eventName, listener);
	};

	if (canSubscribeToEvents) {
		addEventBinding(
			eventTypes.GENERATION_AFTER_COMMANDS,
			handleGenerationStarted,
		);
		addEventBinding(eventTypes.GENERATION_ENDED, handleGenerationSettled);
		addEventBinding(eventTypes.GENERATION_STOPPED, handleGenerationSettled);
		addEventBinding(
			eventTypes.GROUP_WRAPPER_STARTED,
			handleGroupWrapperStarted,
		);
		addEventBinding(
			eventTypes.GROUP_WRAPPER_FINISHED,
			handleGroupWrapperFinished,
		);
		addEventBinding(
			eventTypes.CHARACTER_MESSAGE_RENDERED,
			handlePostGenerationProbe,
		);
		addEventBinding(eventTypes.MESSAGE_RECEIVED, handlePostGenerationProbe);
		addEventBinding(eventTypes.MESSAGE_UPDATED, handlePostGenerationProbe);
		addEventBinding(eventTypes.CHAT_CHANGED, handleContextReset);
		addEventBinding(eventTypes.CHAT_LOADED, handleContextReset);

		for (const [eventName, listener] of eventBindingMap) {
			eventSource.on(eventName, listener);
		}
	}

	function hasLiveGenerationEvidence(): boolean {
		return (
			groupGenerationActive ||
			hasBodyGeneratingFlag(documentRef) ||
			hasVisibleStopButton(documentRef) ||
			hasActiveStreamingProcessor(resolveContextSafe())
		);
	}

	function refreshFromLiveGenerationEvidence() {
		if (eventGenerationActive && !hasLiveGenerationEvidence()) {
			eventGenerationActive = false;
		}
		updateSnapshot();
	}

	function handlePostGenerationProbe() {
		refreshFromLiveGenerationEvidence();
	}

	return {
		dispose() {
			if (disposed) {
				return;
			}

			disposed = true;
			listeners.clear();

			if (!canSubscribeToEvents) {
				return;
			}

			for (const [eventName, listener] of eventBindingMap) {
				eventSource.removeListener(eventName, listener);
			}
		},
		getSnapshot() {
			return snapshot;
		},
		refresh() {
			if (disposed) {
				return;
			}

			// SillyTavern only emits GENERATION_ENDED from hideStopButton()
			// when the Stop control was visible; early-return generation paths
			// (interrupted commands, failed server ping, blocked backends) end
			// without any settle event, which would wedge this latch forever.
			refreshFromLiveGenerationEvidence();
		},
		subscribe(listener) {
			if (disposed) {
				return () => {};
			}

			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}

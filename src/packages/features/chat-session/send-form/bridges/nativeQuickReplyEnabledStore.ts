import {
	NATIVE_QUICK_REPLY_CONTAINER_ID,
	NATIVE_QUICK_REPLY_ENABLED_TOGGLE_ID,
} from "@/packages/features/chat-session/send-form/contracts/dom";

type Listener = () => void;

export interface NativeQuickReplyEnabledSnapshot {
	hasNativeToggle: boolean;
	isEnabled: boolean;
}

export interface NativeQuickReplyEnabledStore {
	dispose(): void;
	getSnapshot(): NativeQuickReplyEnabledSnapshot;
	refresh(): void;
	subscribe(listener: Listener): () => void;
}

function readNativeToggle(documentRef: Document): HTMLInputElement | null {
	const element = documentRef.getElementById(
		NATIVE_QUICK_REPLY_ENABLED_TOGGLE_ID,
	);
	return element instanceof HTMLInputElement ? element : null;
}

function readQuickReplyContainer(documentRef: Document): HTMLElement | null {
	const element = documentRef.getElementById(
		NATIVE_QUICK_REPLY_CONTAINER_ID,
	);
	return element instanceof HTMLElement ? element : null;
}

function readSnapshot(documentRef: Document): NativeQuickReplyEnabledSnapshot {
	const nativeToggle = readNativeToggle(documentRef);
	return {
		hasNativeToggle: nativeToggle instanceof HTMLInputElement,
		isEnabled: nativeToggle?.checked === true,
	};
}

function areSnapshotsEqual(
	current: NativeQuickReplyEnabledSnapshot,
	next: NativeQuickReplyEnabledSnapshot,
) {
	return (
		current.hasNativeToggle === next.hasNativeToggle &&
		current.isEnabled === next.isEnabled
	);
}

function isElementWithId(node: Node, id: string): boolean {
	return node instanceof Element && node.id === id;
}

function mutationTouchesQuickReplyRoot(records: MutationRecord[]): boolean {
	return records.some((record) => {
		if (record.type !== "childList") {
			return false;
		}

		return [...record.addedNodes, ...record.removedNodes].some((node) =>
			isElementWithId(node, NATIVE_QUICK_REPLY_CONTAINER_ID) ||
			isElementWithId(node, NATIVE_QUICK_REPLY_ENABLED_TOGGLE_ID),
		);
	});
}

export function createNativeQuickReplyEnabledStore({
	documentRef = document,
}: {
	documentRef?: Document;
} = {}): NativeQuickReplyEnabledStore {
	const listeners = new Set<Listener>();
	const MutationObserverConstructor =
		documentRef.defaultView?.MutationObserver ?? globalThis.MutationObserver;
	let activeContainer: HTMLElement | null = null;
	let activeToggle: HTMLInputElement | null = null;
	let bodyObserver: MutationObserver | null = null;
	let containerObserver: MutationObserver | null = null;
	let disposed = false;
	let snapshot = readSnapshot(documentRef);

	function notifyListeners() {
		for (const listener of listeners) {
			listener();
		}
	}

	function bindContainer() {
		const nextContainer = readQuickReplyContainer(documentRef);
		if (activeContainer === nextContainer) {
			return;
		}

		containerObserver?.disconnect();
		containerObserver = null;
		activeContainer = nextContainer;

		if (
			activeContainer instanceof HTMLElement &&
			typeof MutationObserverConstructor === "function"
		) {
			containerObserver = new MutationObserverConstructor(() => {
				refresh();
			});
			containerObserver.observe(activeContainer, {
				childList: true,
				subtree: true,
			});
		}
	}

	function bindToggle() {
		const nextToggle = readNativeToggle(documentRef);
		if (activeToggle === nextToggle) {
			return;
		}

		activeToggle?.removeEventListener("change", refresh);
		activeToggle?.removeEventListener("input", refresh);
		activeToggle = nextToggle;
		activeToggle?.addEventListener("change", refresh);
		activeToggle?.addEventListener("input", refresh);
	}

	function refresh() {
		if (disposed) {
			return;
		}

		bindContainer();
		bindToggle();
		const nextSnapshot = readSnapshot(documentRef);
		if (areSnapshotsEqual(snapshot, nextSnapshot)) {
			return;
		}

		snapshot = nextSnapshot;
		notifyListeners();
	}

	const body = documentRef.body;
	if (
		body instanceof HTMLBodyElement &&
		typeof MutationObserverConstructor === "function"
	) {
		bodyObserver = new MutationObserverConstructor((records) => {
			const containerDisconnected =
				activeContainer instanceof HTMLElement &&
				!activeContainer.isConnected;
			const toggleDisconnected =
				activeToggle instanceof HTMLInputElement &&
				!activeToggle.isConnected;
			if (
				!containerDisconnected &&
				!toggleDisconnected &&
				!mutationTouchesQuickReplyRoot(records)
			) {
				return;
			}

			refresh();
		});
		bodyObserver.observe(body, {
			childList: true,
			subtree: true,
		});
	}

	bindContainer();
	bindToggle();

	return {
		dispose() {
			disposed = true;
			listeners.clear();
			bodyObserver?.disconnect();
			bodyObserver = null;
			containerObserver?.disconnect();
			containerObserver = null;
			activeContainer = null;
			activeToggle?.removeEventListener("change", refresh);
			activeToggle?.removeEventListener("input", refresh);
			activeToggle = null;
		},
		getSnapshot() {
			return snapshot;
		},
		refresh,
		subscribe(listener) {
			listeners.add(listener);

			return () => {
				listeners.delete(listener);
			};
		},
	};
}

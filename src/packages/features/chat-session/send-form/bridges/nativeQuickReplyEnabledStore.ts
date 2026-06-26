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

function getElementConstructor(node: Node): typeof Element | null {
	const ElementConstructor =
		node.ownerDocument?.defaultView?.Element ??
		(typeof Element === "function" ? Element : null);
	return typeof ElementConstructor === "function" ? ElementConstructor : null;
}

function getHTMLElementConstructor(
	documentRef: Document,
): typeof HTMLElement | null {
	const HTMLElementConstructor =
		documentRef.defaultView?.HTMLElement ??
		(typeof HTMLElement === "function" ? HTMLElement : null);
	return typeof HTMLElementConstructor === "function"
		? HTMLElementConstructor
		: null;
}

function getHTMLInputElementConstructor(
	documentRef: Document,
): typeof HTMLInputElement | null {
	const HTMLInputElementConstructor =
		documentRef.defaultView?.HTMLInputElement ??
		(typeof HTMLInputElement === "function" ? HTMLInputElement : null);
	return typeof HTMLInputElementConstructor === "function"
		? HTMLInputElementConstructor
		: null;
}

function isHTMLElementForDocument(
	documentRef: Document,
	value: unknown,
): value is HTMLElement {
	const HTMLElementConstructor = getHTMLElementConstructor(documentRef);
	return Boolean(
		HTMLElementConstructor && value instanceof HTMLElementConstructor,
	);
}

function isHTMLInputElementForDocument(
	documentRef: Document,
	value: unknown,
): value is HTMLInputElement {
	const HTMLInputElementConstructor =
		getHTMLInputElementConstructor(documentRef);
	return Boolean(
		HTMLInputElementConstructor &&
		value instanceof HTMLInputElementConstructor,
	);
}

function readNativeToggle(documentRef: Document): HTMLInputElement | null {
	const element = documentRef.getElementById(
		NATIVE_QUICK_REPLY_ENABLED_TOGGLE_ID,
	);
	return isHTMLInputElementForDocument(documentRef, element) ? element : null;
}

function readQuickReplyContainer(documentRef: Document): HTMLElement | null {
	const element = documentRef.getElementById(NATIVE_QUICK_REPLY_CONTAINER_ID);
	return isHTMLElementForDocument(documentRef, element) ? element : null;
}

function readSnapshot(documentRef: Document): NativeQuickReplyEnabledSnapshot {
	const nativeToggle = readNativeToggle(documentRef);
	return {
		hasNativeToggle: isHTMLInputElementForDocument(
			documentRef,
			nativeToggle,
		),
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
	const ElementConstructor = getElementConstructor(node);
	return Boolean(
		ElementConstructor &&
		node instanceof ElementConstructor &&
		node.id === id,
	);
}

function nodeContainsElementWithId(node: Node, id: string): boolean {
	const ElementConstructor = getElementConstructor(node);
	if (!ElementConstructor || !(node instanceof ElementConstructor)) {
		return false;
	}

	let child = node.firstElementChild;
	while (child) {
		if (child.id === id || nodeContainsElementWithId(child, id)) {
			return true;
		}
		child = child.nextElementSibling;
	}

	return false;
}

function nodeTouchesQuickReplyEnabledRoot(node: Node): boolean {
	return (
		isElementWithId(node, NATIVE_QUICK_REPLY_CONTAINER_ID) ||
		isElementWithId(node, NATIVE_QUICK_REPLY_ENABLED_TOGGLE_ID) ||
		nodeContainsElementWithId(node, NATIVE_QUICK_REPLY_CONTAINER_ID) ||
		nodeContainsElementWithId(node, NATIVE_QUICK_REPLY_ENABLED_TOGGLE_ID)
	);
}

export function shouldRefreshNativeQuickReplyEnabledForMutations(
	records: MutationRecord[],
): boolean {
	return records.some((record) => {
		if (record.type !== "childList") {
			return false;
		}

		return [...record.addedNodes, ...record.removedNodes].some(
			nodeTouchesQuickReplyEnabledRoot,
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
		documentRef.defaultView?.MutationObserver ??
		globalThis.MutationObserver;
	let activeContainer: HTMLElement | null = null;
	let activeToggle: HTMLInputElement | null = null;
	let bodyObserver: MutationObserver | null = null;
	let containerObserver: MutationObserver | null = null;
	let disposed = false;
	let refreshFrameId: number | null = null;
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
			isHTMLElementForDocument(documentRef, activeContainer) &&
			typeof MutationObserverConstructor === "function"
		) {
			containerObserver = new MutationObserverConstructor((records) => {
				if (
					!shouldRefreshNativeQuickReplyEnabledForMutations(records)
				) {
					return;
				}

				scheduleRefresh();
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

	function scheduleRefresh() {
		if (disposed || refreshFrameId !== null) {
			return;
		}

		const view = documentRef.defaultView;
		if (typeof view?.requestAnimationFrame === "function") {
			refreshFrameId = view.requestAnimationFrame(() => {
				refreshFrameId = null;
				refresh();
			});
			return;
		}

		refresh();
	}

	const body = documentRef.body;
	if (
		(() => {
			const HTMLBodyElementConstructor =
				documentRef.defaultView?.HTMLBodyElement ??
				(typeof HTMLBodyElement === "function"
					? HTMLBodyElement
					: null);
			return Boolean(
				HTMLBodyElementConstructor &&
				body instanceof HTMLBodyElementConstructor,
			);
		})() &&
		typeof MutationObserverConstructor === "function"
	) {
		bodyObserver = new MutationObserverConstructor((records) => {
			const containerDisconnected =
				isHTMLElementForDocument(documentRef, activeContainer) &&
				!activeContainer.isConnected;
			const toggleDisconnected =
				isHTMLInputElementForDocument(documentRef, activeToggle) &&
				!activeToggle.isConnected;
			if (
				!containerDisconnected &&
				!toggleDisconnected &&
				!shouldRefreshNativeQuickReplyEnabledForMutations(records)
			) {
				return;
			}

			scheduleRefresh();
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
			if (refreshFrameId !== null) {
				const view = documentRef.defaultView;
				if (typeof view?.cancelAnimationFrame === "function") {
					view.cancelAnimationFrame(refreshFrameId);
				}
				refreshFrameId = null;
			}
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

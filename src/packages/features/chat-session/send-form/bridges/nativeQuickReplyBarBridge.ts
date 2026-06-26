import { NATIVE_QUICK_REPLY_BAR_ID } from "@/packages/features/chat-session/send-form/contracts/dom";

interface QuickReplyBarOriginSnapshot {
	bar: HTMLElement;
	nextSibling: ChildNode | null;
	parent: HTMLElement;
}

export interface NativeQuickReplyBarBridgeSnapshot {
	barNode: HTMLElement | null;
	isAttachedToHost: boolean;
	isAvailable: boolean;
}

export interface NativeQuickReplyBarBridge {
	attachTo(host: HTMLElement): void;
	dispose(): void;
	getSnapshot(): NativeQuickReplyBarBridgeSnapshot;
	restore(): void;
	sync(): void;
}

function areSnapshotsEqual(
	current: NativeQuickReplyBarBridgeSnapshot,
	next: NativeQuickReplyBarBridgeSnapshot,
) {
	return (
		current.barNode === next.barNode &&
		current.isAttachedToHost === next.isAttachedToHost &&
		current.isAvailable === next.isAvailable
	);
}

function getElementConstructor(node: Node): typeof Element | null {
	const ElementConstructor =
		node.ownerDocument?.defaultView?.Element ??
		(typeof Element === "function" ? Element : null);
	return typeof ElementConstructor === "function"
		? ElementConstructor
		: null;
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

function isHTMLElementForDocument(
	documentRef: Document,
	value: unknown,
): value is HTMLElement {
	const HTMLElementConstructor = getHTMLElementConstructor(documentRef);
	return Boolean(
		HTMLElementConstructor && value instanceof HTMLElementConstructor,
	);
}

function resolveQuickReplyBar(documentRef: Document): HTMLElement | null {
	const bar = documentRef.getElementById(NATIVE_QUICK_REPLY_BAR_ID);
	return isHTMLElementForDocument(documentRef, bar) ? bar : null;
}

function nodeContainsQuickReplyBar(node: Node): boolean {
	const ElementConstructor = getElementConstructor(node);
	if (!ElementConstructor || !(node instanceof ElementConstructor)) {
		return false;
	}

	if (node.id === NATIVE_QUICK_REPLY_BAR_ID) {
		return true;
	}

	return node.querySelector(`#${NATIVE_QUICK_REPLY_BAR_ID}`) != null;
}

export function shouldSyncQuickReplyBarForMutations(
	mutations: MutationRecord[],
): boolean {
	return mutations.some((mutation) => {
		if (mutation.type !== "childList") {
			return false;
		}

		for (const node of mutation.addedNodes) {
			if (nodeContainsQuickReplyBar(node)) {
				return true;
			}
		}

		for (const node of mutation.removedNodes) {
			if (nodeContainsQuickReplyBar(node)) {
				return true;
			}
		}

		return false;
	});
}

export function createNativeQuickReplyBarBridge({
	documentRef = document,
}: {
	documentRef?: Document;
} = {}): NativeQuickReplyBarBridge {
	let activeBar: HTMLElement | null = null;
	let attachedHost: HTMLElement | null = null;
	let bodyObserver: MutationObserver | null = null;
	let frameId: number | null = null;
	let originSnapshot: QuickReplyBarOriginSnapshot | null = null;
	let snapshot: NativeQuickReplyBarBridgeSnapshot = {
		barNode: null,
		isAttachedToHost: false,
		isAvailable: false,
	};

	const view = documentRef.defaultView ?? window;

	function cancelFrame(id: number) {
		if (typeof view.cancelAnimationFrame === "function") {
			view.cancelAnimationFrame(id);
			return;
		}

		view.clearTimeout(id);
	}

	function requestFrame(callback: FrameRequestCallback): number {
		if (typeof view.requestAnimationFrame === "function") {
			return view.requestAnimationFrame(callback);
		}

		return view.setTimeout(() => {
			callback(view.performance?.now() ?? Date.now());
		}, 0);
	}

	function emitSnapshot() {
		const nextSnapshot: NativeQuickReplyBarBridgeSnapshot = {
			barNode: activeBar,
			isAttachedToHost:
				isHTMLElementForDocument(documentRef, activeBar) &&
				isHTMLElementForDocument(documentRef, attachedHost) &&
				activeBar.parentElement === attachedHost,
			isAvailable: isHTMLElementForDocument(documentRef, activeBar),
		};

		if (areSnapshotsEqual(snapshot, nextSnapshot)) {
			return;
		}

		snapshot = nextSnapshot;
	}

	function captureOrigin(bar: HTMLElement) {
		if (originSnapshot?.bar === bar) {
			return;
		}

		const parentElement = bar.parentElement;
		if (!isHTMLElementForDocument(documentRef, parentElement)) {
			originSnapshot = null;
			return;
		}

		originSnapshot = {
			bar,
			nextSibling: bar.nextSibling,
			parent: parentElement,
		};
	}

	function restoreBar({
		bar,
		clearAttachedHost = true,
	}: {
		bar: HTMLElement | null;
		clearAttachedHost?: boolean;
	}) {
		if (clearAttachedHost) {
			attachedHost = null;
		}

		if (!isHTMLElementForDocument(documentRef, bar)) {
			emitSnapshot();
			return;
		}

		const resolvedOrigin =
			originSnapshot?.bar === bar ? originSnapshot : null;
		if (
			!resolvedOrigin ||
			!bar.isConnected ||
			!resolvedOrigin.parent.isConnected
		) {
			emitSnapshot();
			return;
		}

		if (
			resolvedOrigin.nextSibling &&
			resolvedOrigin.nextSibling.parentNode === resolvedOrigin.parent
		) {
			resolvedOrigin.parent.insertBefore(bar, resolvedOrigin.nextSibling);
		} else {
			resolvedOrigin.parent.appendChild(bar);
		}

		emitSnapshot();
	}

	function scheduleSync() {
		if (frameId !== null) {
			cancelFrame(frameId);
		}

		frameId = requestFrame(() => {
			frameId = null;
			sync();
		});
	}

	function sync() {
		const nextBar = resolveQuickReplyBar(documentRef);

		if (activeBar && activeBar !== nextBar) {
			restoreBar({
				bar: activeBar,
				clearAttachedHost: false,
			});
			originSnapshot = null;
		}

		activeBar = nextBar;

		if (!isHTMLElementForDocument(documentRef, activeBar)) {
			emitSnapshot();
			return;
		}

		captureOrigin(activeBar);

		if (
			isHTMLElementForDocument(documentRef, attachedHost) &&
			activeBar.parentElement !== attachedHost
		) {
			attachedHost.appendChild(activeBar);
		}

		emitSnapshot();
	}

	const body = documentRef.body;
	const HTMLBodyElementConstructor =
		documentRef.defaultView?.HTMLBodyElement ??
		(typeof HTMLBodyElement === "function" ? HTMLBodyElement : null);
	if (
		HTMLBodyElementConstructor &&
		body instanceof HTMLBodyElementConstructor
	) {
		bodyObserver = new MutationObserver((mutations) => {
			if (shouldSyncQuickReplyBarForMutations(mutations)) {
				scheduleSync();
			}
		});
		bodyObserver.observe(body, {
			childList: true,
			subtree: true,
		});
	}

	sync();

	return {
		attachTo(host: HTMLElement) {
			attachedHost = host;
			sync();
		},
		dispose() {
			bodyObserver?.disconnect();
			bodyObserver = null;

			if (frameId !== null) {
				cancelFrame(frameId);
				frameId = null;
			}

			restoreBar({ bar: activeBar });
			activeBar = null;
			originSnapshot = null;
			snapshot = {
				barNode: null,
				isAttachedToHost: false,
				isAvailable: false,
			};
		},
		getSnapshot() {
			return snapshot;
		},
		restore() {
			restoreBar({
				bar: activeBar,
				clearAttachedHost: false,
			});
		},
		sync,
	};
}

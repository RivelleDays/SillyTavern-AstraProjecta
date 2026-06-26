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

function resolveQuickReplyBar(documentRef: Document): HTMLElement | null {
	const bar = documentRef.getElementById(NATIVE_QUICK_REPLY_BAR_ID);
	return bar instanceof HTMLElement ? bar : null;
}

function nodeContainsQuickReplyBar(node: Node): boolean {
	if (!(node instanceof Element)) {
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
				activeBar instanceof HTMLElement &&
				attachedHost instanceof HTMLElement &&
				activeBar.parentElement === attachedHost,
			isAvailable: activeBar instanceof HTMLElement,
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
		if (!(parentElement instanceof HTMLElement)) {
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

		if (!(bar instanceof HTMLElement)) {
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

		if (!(activeBar instanceof HTMLElement)) {
			emitSnapshot();
			return;
		}

		captureOrigin(activeBar);

		if (
			attachedHost instanceof HTMLElement &&
			activeBar.parentElement !== attachedHost
		) {
			attachedHost.appendChild(activeBar);
		}

		emitSnapshot();
	}

	const body = documentRef.body;
	if (body instanceof HTMLBodyElement) {
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

interface NativeCompanionOriginSnapshot {
	companion: HTMLElement;
	hadSourceAttribute: boolean;
	hadStyleAttribute: boolean;
	parent: HTMLElement;
	portedSourceAttributeValue: string | null;
	previousClassName: string;
	previousStyleAttributeValue: string | null;
	nextSibling: ChildNode | null;
}

export interface NativeCompanionBridgeSnapshot {
	companionNode: HTMLElement | null;
	isAttachedToHost: boolean;
	isAvailable: boolean;
	sourceId: string;
}

export interface NativeCompanionBridge {
	attachTo(host: HTMLElement): void;
	dispose(): void;
	getSnapshot(): NativeCompanionBridgeSnapshot;
	restore(): void;
	sync(): void;
}

interface NativeAttachedVisibility {
	display?: string;
	opacity?: string;
	transition?: string;
}

interface NativeCompanionBridgeOptions {
	documentRef?: Document;
	normalizeAttachedVisibility?: NativeAttachedVisibility;
	normalizeOpenDrawerVisibility?: boolean;
	onSnapshotChange?(snapshot: NativeCompanionBridgeSnapshot): void;
	restoreRemovedSource?: boolean;
	sourceId: string;
}

const PORTED_COMPANION_CLASS = "astra-projecta-native-companion-ported";
const PORTED_COMPANION_SOURCE_ATTRIBUTE =
	"data-astra-projecta-native-companion-source";

function areSnapshotsEqual(
	current: NativeCompanionBridgeSnapshot,
	next: NativeCompanionBridgeSnapshot,
) {
	return (
		current.companionNode === next.companionNode &&
		current.isAttachedToHost === next.isAttachedToHost &&
		current.isAvailable === next.isAvailable &&
		current.sourceId === next.sourceId
	);
}

function restoreCompanionOrigin(origin: NativeCompanionOriginSnapshot) {
	origin.companion.className = origin.previousClassName;

	if (origin.hadStyleAttribute) {
		origin.companion.setAttribute(
			"style",
			origin.previousStyleAttributeValue ?? "",
		);
	} else {
		origin.companion.removeAttribute("style");
	}

	if (origin.hadSourceAttribute) {
		origin.companion.setAttribute(
			PORTED_COMPANION_SOURCE_ATTRIBUTE,
			origin.portedSourceAttributeValue ?? "",
		);
	} else {
		origin.companion.removeAttribute(PORTED_COMPANION_SOURCE_ATTRIBUTE);
	}

	if (!origin.parent.isConnected) {
		return;
	}

	if (origin.nextSibling && origin.nextSibling.parentNode === origin.parent) {
		origin.parent.insertBefore(origin.companion, origin.nextSibling);
		return;
	}

	origin.parent.appendChild(origin.companion);
}

export function createNativeCompanionBridge({
	documentRef = document,
	normalizeAttachedVisibility,
	normalizeOpenDrawerVisibility = false,
	onSnapshotChange,
	restoreRemovedSource = true,
	sourceId,
}: NativeCompanionBridgeOptions): NativeCompanionBridge {
	let activeCompanion: HTMLElement | null = null;
	let attachedHost: HTMLElement | null = null;
	let bodyObserver: MutationObserver | null = null;
	let companionObserver: MutationObserver | null = null;
	let frameId: number | null = null;
	let originSnapshot: NativeCompanionOriginSnapshot | null = null;
	let snapshot: NativeCompanionBridgeSnapshot = {
		companionNode: null,
		isAttachedToHost: false,
		isAvailable: false,
		sourceId,
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
		const nextSnapshot: NativeCompanionBridgeSnapshot = {
			companionNode: activeCompanion,
			isAttachedToHost:
				activeCompanion instanceof HTMLElement &&
				attachedHost instanceof HTMLElement &&
				activeCompanion.parentElement === attachedHost,
			isAvailable: activeCompanion instanceof HTMLElement,
			sourceId,
		};

		if (areSnapshotsEqual(snapshot, nextSnapshot)) {
			return;
		}

		snapshot = nextSnapshot;
		onSnapshotChange?.(snapshot);
	}

	function disconnectBodyObserver() {
		bodyObserver?.disconnect();
		bodyObserver = null;
	}

	function disconnectCompanionObserver() {
		companionObserver?.disconnect();
		companionObserver = null;
	}

	function captureOrigin(companion: HTMLElement) {
		if (originSnapshot?.companion === companion) {
			return;
		}

		const parentElement = companion.parentElement;
		if (!(parentElement instanceof HTMLElement)) {
			originSnapshot = null;
			return;
		}

		originSnapshot = {
			companion,
			hadSourceAttribute: companion.hasAttribute(
				PORTED_COMPANION_SOURCE_ATTRIBUTE,
			),
			hadStyleAttribute: companion.hasAttribute("style"),
			parent: parentElement,
			portedSourceAttributeValue: companion.getAttribute(
				PORTED_COMPANION_SOURCE_ATTRIBUTE,
			),
			previousClassName: companion.className,
			previousStyleAttributeValue: companion.getAttribute("style"),
			nextSibling: companion.nextSibling,
		};
	}

	function markAttachedCompanion(companion: HTMLElement) {
		if (!companion.classList.contains(PORTED_COMPANION_CLASS)) {
			companion.classList.add(PORTED_COMPANION_CLASS);
		}

		if (
			companion.getAttribute(PORTED_COMPANION_SOURCE_ATTRIBUTE) !==
			sourceId
		) {
			companion.setAttribute(PORTED_COMPANION_SOURCE_ATTRIBUTE, sourceId);
		}
	}

	function normalizeDrawerVisibility(companion: HTMLElement) {
		if (!normalizeOpenDrawerVisibility) {
			return;
		}

		const nextDisplay = companion.classList.contains("openDrawer")
			? "block"
			: "none";

		if (companion.style.display !== nextDisplay) {
			companion.style.display = nextDisplay;
		}

		if (companion.style.height) {
			companion.style.removeProperty("height");
		}

		if (companion.style.overflow) {
			companion.style.removeProperty("overflow");
		}
	}

	function normalizeCompanionVisibility(companion: HTMLElement) {
		if (!normalizeAttachedVisibility) {
			return;
		}

		if (
			normalizeAttachedVisibility.display !== undefined &&
			companion.style.display !== normalizeAttachedVisibility.display
		) {
			companion.style.display = normalizeAttachedVisibility.display;
		}

		if (
			normalizeAttachedVisibility.opacity !== undefined &&
			companion.style.opacity !== normalizeAttachedVisibility.opacity
		) {
			companion.style.opacity = normalizeAttachedVisibility.opacity;
		}

		if (
			normalizeAttachedVisibility.transition !== undefined &&
			companion.style.transition !==
				normalizeAttachedVisibility.transition
		) {
			companion.style.transition = normalizeAttachedVisibility.transition;
		}
	}

	function syncCompanionObserver(companion: HTMLElement) {
		if (
			!normalizeOpenDrawerVisibility &&
			normalizeAttachedVisibility === undefined
		) {
			disconnectCompanionObserver();
			return;
		}

		if (companionObserver && activeCompanion === companion) {
			return;
		}

		disconnectCompanionObserver();

		const observer = new MutationObserver(() => {
			normalizeDrawerVisibility(companion);
			normalizeCompanionVisibility(companion);
		});

		observer.observe(companion, {
			attributeFilter: ["class", "style"],
			attributes: true,
		});
		companionObserver = observer;
	}

	function restoreCompanion({
		clearAttachedHost = true,
		companion,
	}: {
		clearAttachedHost?: boolean;
		companion: HTMLElement | null;
	}) {
		if (clearAttachedHost) {
			attachedHost = null;
			disconnectBodyObserver();
			disconnectCompanionObserver();
		}

		if (!(companion instanceof HTMLElement)) {
			emitSnapshot();
			return;
		}

		if (
			!restoreRemovedSource &&
			!companion.isConnected &&
			documentRef.getElementById(sourceId) !== companion
		) {
			if (activeCompanion === companion) {
				activeCompanion = null;
			}

			if (clearAttachedHost) {
				originSnapshot = null;
			}

			emitSnapshot();
			return;
		}

		const resolvedOrigin =
			originSnapshot?.companion === companion ? originSnapshot : null;
		if (resolvedOrigin) {
			restoreCompanionOrigin(resolvedOrigin);
		} else {
			companion.classList.remove(PORTED_COMPANION_CLASS);
			companion.removeAttribute(PORTED_COMPANION_SOURCE_ATTRIBUTE);
		}

		if (clearAttachedHost) {
			originSnapshot = null;
		}

		emitSnapshot();
	}

	function sync() {
		const companionNode = documentRef.getElementById(sourceId);
		const nextCompanion =
			companionNode instanceof HTMLElement ? companionNode : null;

		if (activeCompanion && activeCompanion !== nextCompanion) {
			const previousCompanion = activeCompanion;
			restoreCompanion({
				clearAttachedHost: false,
				companion: previousCompanion,
			});
			disconnectCompanionObserver();
			originSnapshot = null;
		}

		activeCompanion = nextCompanion;

		if (!(activeCompanion instanceof HTMLElement)) {
			originSnapshot = null;
			disconnectCompanionObserver();
			emitSnapshot();
			return;
		}

		if (attachedHost instanceof HTMLElement) {
			captureOrigin(activeCompanion);
			syncCompanionObserver(activeCompanion);

			if (activeCompanion.parentElement !== attachedHost) {
				attachedHost.appendChild(activeCompanion);
			}

			markAttachedCompanion(activeCompanion);
			normalizeDrawerVisibility(activeCompanion);
			normalizeCompanionVisibility(activeCompanion);
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

	function ensureBodyObserver() {
		if (bodyObserver || !(attachedHost instanceof HTMLElement)) {
			return;
		}

		const body = documentRef.body;
		if (!(body instanceof HTMLBodyElement)) {
			return;
		}

		bodyObserver = new MutationObserver(() => {
			scheduleSync();
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
			ensureBodyObserver();
			sync();
		},
		dispose() {
			disconnectBodyObserver();
			disconnectCompanionObserver();

			if (frameId !== null) {
				cancelFrame(frameId);
				frameId = null;
			}

			restoreCompanion({ companion: activeCompanion });

			activeCompanion = null;
			originSnapshot = null;
			snapshot = {
				companionNode: null,
				isAttachedToHost: false,
				isAvailable: false,
				sourceId,
			};
		},
		getSnapshot() {
			return snapshot;
		},
		restore() {
			restoreCompanion({ companion: activeCompanion });
		},
		sync,
	};
}

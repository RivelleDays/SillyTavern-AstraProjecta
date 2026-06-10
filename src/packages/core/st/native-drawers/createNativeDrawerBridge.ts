interface NativeDrawerOriginSnapshot {
	drawer: HTMLElement;
	hadSourceAttribute: boolean;
	hadStyleAttribute: boolean;
	parent: HTMLElement;
	portedSourceAttributeValue: string | null;
	previousClassName: string;
	previousStyleAttributeValue: string | null;
	restoreStyle: boolean;
	nextSibling: ChildNode | null;
}

export interface NativeDrawerBridgeSnapshot {
	drawerNode: HTMLElement | null;
	isAttachedToHost: boolean;
	isAvailable: boolean;
	sourceId: string;
}

export interface NativeDrawerBridge {
	attachTo(host: HTMLElement): void;
	dispose(): void;
	getSnapshot(): NativeDrawerBridgeSnapshot;
	restore(): void;
	sync(): void;
}

interface NativeAttachedVisibility {
	display?: string;
	opacity?: string;
	skipWhenAttribute?: string;
	transition?: string;
}

const PORTED_DRAWER_CLASS = "astra-projecta-native-drawer-ported";
const PORTED_DRAWER_SOURCE_ATTRIBUTE =
	"data-astra-projecta-native-drawer-source";

function areSnapshotsEqual(
	current: NativeDrawerBridgeSnapshot,
	next: NativeDrawerBridgeSnapshot,
) {
	return (
		current.drawerNode === next.drawerNode &&
		current.isAttachedToHost === next.isAttachedToHost &&
		current.isAvailable === next.isAvailable &&
		current.sourceId === next.sourceId
	);
}

function restoreDrawerOrigin(origin: NativeDrawerOriginSnapshot) {
	origin.drawer.className = origin.previousClassName;

	if (origin.restoreStyle) {
		if (origin.hadStyleAttribute) {
			origin.drawer.setAttribute(
				"style",
				origin.previousStyleAttributeValue ?? "",
			);
		} else {
			origin.drawer.removeAttribute("style");
		}
	}

	if (origin.hadSourceAttribute) {
		origin.drawer.setAttribute(
			PORTED_DRAWER_SOURCE_ATTRIBUTE,
			origin.portedSourceAttributeValue ?? "",
		);
	} else {
		origin.drawer.removeAttribute(PORTED_DRAWER_SOURCE_ATTRIBUTE);
	}

	if (!origin.parent.isConnected) {
		return;
	}

	if (origin.nextSibling && origin.nextSibling.parentNode === origin.parent) {
		origin.parent.insertBefore(origin.drawer, origin.nextSibling);
		return;
	}

	origin.parent.appendChild(origin.drawer);
}

export function createNativeDrawerBridge({
	documentRef = document,
	normalizeAttachedVisibility,
	onSnapshotChange,
	sourceId,
}: {
	documentRef?: Document;
	normalizeAttachedVisibility?: NativeAttachedVisibility;
	onSnapshotChange?(snapshot: NativeDrawerBridgeSnapshot): void;
	sourceId: string;
}): NativeDrawerBridge {
	let activeDrawer: HTMLElement | null = null;
	let attachedHost: HTMLElement | null = null;
	let bodyObserver: MutationObserver | null = null;
	let drawerObserver: MutationObserver | null = null;
	let frameId: number | null = null;
	let originSnapshot: NativeDrawerOriginSnapshot | null = null;
	let snapshot: NativeDrawerBridgeSnapshot = {
		drawerNode: null,
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
		const nextSnapshot: NativeDrawerBridgeSnapshot = {
			drawerNode: activeDrawer,
			isAttachedToHost:
				activeDrawer instanceof HTMLElement &&
				attachedHost instanceof HTMLElement &&
				activeDrawer.parentElement === attachedHost,
			isAvailable: activeDrawer instanceof HTMLElement,
			sourceId,
		};

		if (areSnapshotsEqual(snapshot, nextSnapshot)) {
			return;
		}

		snapshot = nextSnapshot;
		onSnapshotChange?.(snapshot);
	}

	function disconnectDrawerObserver() {
		drawerObserver?.disconnect();
		drawerObserver = null;
	}

	function disconnectBodyObserver() {
		bodyObserver?.disconnect();
		bodyObserver = null;
	}

	function captureOrigin(drawer: HTMLElement) {
		if (originSnapshot?.drawer === drawer) {
			return;
		}

		const parentElement = drawer.parentElement;
		if (!(parentElement instanceof HTMLElement)) {
			originSnapshot = null;
			return;
		}

		originSnapshot = {
			drawer,
			hadSourceAttribute: drawer.hasAttribute(
				PORTED_DRAWER_SOURCE_ATTRIBUTE,
			),
			hadStyleAttribute: drawer.hasAttribute("style"),
			parent: parentElement,
			portedSourceAttributeValue: drawer.getAttribute(
				PORTED_DRAWER_SOURCE_ATTRIBUTE,
			),
			previousClassName: drawer.className,
			previousStyleAttributeValue: drawer.getAttribute("style"),
			restoreStyle: normalizeAttachedVisibility !== undefined,
			nextSibling: drawer.nextSibling,
		};
	}

	function normalizeAttachedDrawerVisibility(drawer: HTMLElement) {
		if (!normalizeAttachedVisibility) {
			return;
		}

		if (
			normalizeAttachedVisibility.skipWhenAttribute &&
			drawer.hasAttribute(normalizeAttachedVisibility.skipWhenAttribute)
		) {
			return;
		}

		if (
			normalizeAttachedVisibility.display !== undefined &&
			drawer.style.display !== normalizeAttachedVisibility.display
		) {
			drawer.style.display = normalizeAttachedVisibility.display;
		}

		if (
			normalizeAttachedVisibility.opacity !== undefined &&
			drawer.style.opacity !== normalizeAttachedVisibility.opacity
		) {
			drawer.style.opacity = normalizeAttachedVisibility.opacity;
		}

		if (
			normalizeAttachedVisibility.transition !== undefined &&
			drawer.style.transition !== normalizeAttachedVisibility.transition
		) {
			drawer.style.transition = normalizeAttachedVisibility.transition;
		}
	}

	function normalizeAttachedDrawer(drawer: HTMLElement) {
		if (
			drawer.classList.contains("closedDrawer") ||
			!drawer.classList.contains("openDrawer") ||
			!drawer.classList.contains(PORTED_DRAWER_CLASS)
		) {
			drawer.classList.remove("closedDrawer");
			drawer.classList.add("openDrawer", PORTED_DRAWER_CLASS);
		}

		if (drawer.getAttribute(PORTED_DRAWER_SOURCE_ATTRIBUTE) !== sourceId) {
			drawer.setAttribute(PORTED_DRAWER_SOURCE_ATTRIBUTE, sourceId);
		}

		normalizeAttachedDrawerVisibility(drawer);
	}

	function restoreDrawer({
		clearAttachedHost = true,
		drawer,
	}: {
		clearAttachedHost?: boolean;
		drawer: HTMLElement | null;
	}) {
		if (clearAttachedHost) {
			attachedHost = null;
			disconnectBodyObserver();
			disconnectDrawerObserver();
		}

		if (!(drawer instanceof HTMLElement)) {
			emitSnapshot();
			return;
		}

		const resolvedOrigin =
			originSnapshot?.drawer === drawer ? originSnapshot : null;
		if (resolvedOrigin) {
			restoreDrawerOrigin(resolvedOrigin);
		} else {
			drawer.classList.remove(PORTED_DRAWER_CLASS);
			drawer.removeAttribute(PORTED_DRAWER_SOURCE_ATTRIBUTE);
		}

		if (clearAttachedHost) {
			originSnapshot = null;
		}

		emitSnapshot();
	}

	function syncDrawerObserver(drawer: HTMLElement) {
		if (drawerObserver && activeDrawer === drawer) {
			return;
		}

		disconnectDrawerObserver();

		const observer = new MutationObserver(() => {
			if (
				attachedHost instanceof HTMLElement &&
				activeDrawer instanceof HTMLElement &&
				activeDrawer.parentElement !== attachedHost
			) {
				attachedHost.appendChild(activeDrawer);
			}

			if (
				attachedHost instanceof HTMLElement &&
				activeDrawer === drawer
			) {
				normalizeAttachedDrawer(drawer);
			}

			emitSnapshot();
		});

		observer.observe(drawer, {
			attributeFilter:
				normalizeAttachedVisibility === undefined
					? ["class"]
					: [
							"class",
							"style",
							...(normalizeAttachedVisibility.skipWhenAttribute
								? [
										normalizeAttachedVisibility.skipWhenAttribute,
									]
								: []),
						],
			attributes: true,
		});
		drawerObserver = observer;
	}

	function sync() {
		const drawerNode = documentRef.getElementById(sourceId);
		const nextDrawer =
			drawerNode instanceof HTMLElement ? drawerNode : null;

		if (activeDrawer && activeDrawer !== nextDrawer) {
			const previousDrawer = activeDrawer;
			restoreDrawer({
				clearAttachedHost: false,
				drawer: previousDrawer,
			});
			disconnectDrawerObserver();
			originSnapshot = null;
		}

		activeDrawer = nextDrawer;

		if (!(activeDrawer instanceof HTMLElement)) {
			originSnapshot = null;
			disconnectDrawerObserver();
			emitSnapshot();
			return;
		}

		if (attachedHost instanceof HTMLElement) {
			captureOrigin(activeDrawer);
			syncDrawerObserver(activeDrawer);

			if (activeDrawer.parentElement !== attachedHost) {
				attachedHost.appendChild(activeDrawer);
			}

			normalizeAttachedDrawer(activeDrawer);
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
			disconnectDrawerObserver();

			if (frameId !== null) {
				cancelFrame(frameId);
				frameId = null;
			}

			restoreDrawer({ drawer: activeDrawer });

			activeDrawer = null;
			originSnapshot = null;
			snapshot = {
				drawerNode: null,
				isAttachedToHost: false,
				isAvailable: false,
				sourceId,
			};
		},
		getSnapshot() {
			return snapshot;
		},
		restore() {
			restoreDrawer({ drawer: activeDrawer });
		},
		sync,
	};
}

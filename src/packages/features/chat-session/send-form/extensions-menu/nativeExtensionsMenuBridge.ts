import {
	NATIVE_EXTENSIONS_MENU_BUTTON_ID,
	NATIVE_EXTENSIONS_MENU_ID,
} from "@/packages/features/chat-session/send-form/contracts/dom";

interface MenuOriginSnapshot {
	menu: HTMLElement;
	nextSibling: ChildNode | null;
	parent: HTMLElement;
}

export interface NativeExtensionsMenuBridgeSnapshot {
	hasItems: boolean;
	isAttachedToHost: boolean;
	menuNode: HTMLElement | null;
}

export interface NativeExtensionsMenuBridge {
	attachTo(host: HTMLElement): void;
	dispose(): void;
	getSnapshot(): NativeExtensionsMenuBridgeSnapshot;
	restore(): void;
	sync(): void;
}

function isElementVisible(element: HTMLElement): boolean {
	if (
		!element.isConnected ||
		element.classList.contains("displayNone") ||
		element.hasAttribute("hidden")
	) {
		return false;
	}

	const view = element.ownerDocument.defaultView;
	if (!view || typeof view.getComputedStyle !== "function") {
		return true;
	}

	const style = view.getComputedStyle(element);
	return style.display !== "none" && style.visibility !== "hidden";
}

function getMenuActionElements(menu: HTMLElement): HTMLElement[] {
	const actionElements: HTMLElement[] = [];

	for (const child of Array.from(menu.children)) {
		if (!(child instanceof HTMLElement)) {
			continue;
		}

		if (child.classList.contains("extension_container")) {
			for (const nestedChild of Array.from(child.children)) {
				if (nestedChild instanceof HTMLElement) {
					actionElements.push(nestedChild);
				}
			}
			continue;
		}

		actionElements.push(child);
	}

	return actionElements;
}

function hasVisibleMenuItems(menu: HTMLElement): boolean {
	return getMenuActionElements(menu).some((child) => isElementVisible(child));
}

function areSnapshotsEqual(
	current: NativeExtensionsMenuBridgeSnapshot,
	next: NativeExtensionsMenuBridgeSnapshot,
) {
	return (
		current.hasItems === next.hasItems &&
		current.isAttachedToHost === next.isAttachedToHost &&
		current.menuNode === next.menuNode
	);
}

export function isExtensionsMenuActionTarget({
	menu,
	target,
}: {
	menu: HTMLElement;
	target: EventTarget | null;
}): boolean {
	if (!(target instanceof Node)) {
		return false;
	}

	return getMenuActionElements(menu).some(
		(actionElement) =>
			actionElement === target || actionElement.contains(target),
	);
}

export function createNativeExtensionsMenuBridge({
	documentRef = document,
	onSnapshotChange,
}: {
	documentRef?: Document;
	onSnapshotChange?(snapshot: NativeExtensionsMenuBridgeSnapshot): void;
} = {}): NativeExtensionsMenuBridge {
	let activeMenu: HTMLElement | null = null;
	let activeButton: HTMLElement | null = null;
	let attachedHost: HTMLElement | null = null;
	let bodyObserver: MutationObserver | null = null;
	let menuObserver: MutationObserver | null = null;
	let frameId: number | null = null;
	let originSnapshot: MenuOriginSnapshot | null = null;
	let snapshot: NativeExtensionsMenuBridgeSnapshot = {
		hasItems: false,
		isAttachedToHost: false,
		menuNode: null,
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
		const nextSnapshot: NativeExtensionsMenuBridgeSnapshot = {
			hasItems:
				activeMenu instanceof HTMLElement &&
				activeButton instanceof HTMLElement
					? hasVisibleMenuItems(activeMenu)
					: false,
			isAttachedToHost:
				activeMenu instanceof HTMLElement &&
				attachedHost instanceof HTMLElement &&
				activeMenu.parentElement === attachedHost,
			menuNode: activeMenu,
		};

		if (areSnapshotsEqual(snapshot, nextSnapshot)) {
			return;
		}

		snapshot = nextSnapshot;
		onSnapshotChange?.(snapshot);
	}

	function disconnectMenuObserver() {
		menuObserver?.disconnect();
		menuObserver = null;
	}

	function captureOrigin(menu: HTMLElement) {
		if (originSnapshot?.menu === menu) {
			return;
		}

		const parentElement = menu.parentElement;
		if (!(parentElement instanceof HTMLElement)) {
			originSnapshot = null;
			return;
		}

		originSnapshot = {
			menu,
			nextSibling: menu.nextSibling,
			parent: parentElement,
		};
	}

	function restoreMenu({
		clearAttachedHost = true,
		menu,
	}: {
		clearAttachedHost?: boolean;
		menu: HTMLElement | null;
	}) {
		if (!(menu instanceof HTMLElement)) {
			if (clearAttachedHost) {
				attachedHost = null;
			}
			emitSnapshot();
			return;
		}

		const resolvedOrigin =
			originSnapshot?.menu === menu ? originSnapshot : null;
		if (clearAttachedHost) {
			attachedHost = null;
		}

		if (!resolvedOrigin || !resolvedOrigin.parent.isConnected) {
			emitSnapshot();
			return;
		}

		if (
			resolvedOrigin.nextSibling &&
			resolvedOrigin.nextSibling.parentNode === resolvedOrigin.parent
		) {
			resolvedOrigin.parent.insertBefore(
				menu,
				resolvedOrigin.nextSibling,
			);
		} else {
			resolvedOrigin.parent.appendChild(menu);
		}

		emitSnapshot();
	}

	function syncMenuObserver(menu: HTMLElement) {
		if (menuObserver && activeMenu === menu) {
			return;
		}

		disconnectMenuObserver();

		const observer = new MutationObserver(() => {
			if (
				attachedHost instanceof HTMLElement &&
				activeMenu instanceof HTMLElement &&
				activeMenu.parentElement !== attachedHost
			) {
				attachedHost.appendChild(activeMenu);
			}

			emitSnapshot();
		});

		observer.observe(menu, {
			attributeFilter: ["class", "hidden", "style"],
			attributes: true,
			childList: true,
			subtree: true,
		});
		menuObserver = observer;
	}

	function sync() {
		const menuNode = documentRef.getElementById(NATIVE_EXTENSIONS_MENU_ID);
		const buttonNode = documentRef.getElementById(
			NATIVE_EXTENSIONS_MENU_BUTTON_ID,
		);
		const nextMenu = menuNode instanceof HTMLElement ? menuNode : null;
		const nextButton =
			buttonNode instanceof HTMLElement ? buttonNode : null;

		if (activeMenu && activeMenu !== nextMenu) {
			const previousMenu = activeMenu;
			restoreMenu({
				clearAttachedHost: false,
				menu: previousMenu,
			});
			disconnectMenuObserver();
			originSnapshot = null;
		}

		activeMenu = nextMenu;
		activeButton = nextButton;

		if (!(activeMenu instanceof HTMLElement)) {
			originSnapshot = null;
			disconnectMenuObserver();
			emitSnapshot();
			return;
		}

		captureOrigin(activeMenu);
		syncMenuObserver(activeMenu);

		if (
			attachedHost instanceof HTMLElement &&
			activeMenu.parentElement !== attachedHost
		) {
			attachedHost.appendChild(activeMenu);
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

	const body = documentRef.body;
	if (body instanceof HTMLBodyElement) {
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
			sync();
		},
		dispose() {
			bodyObserver?.disconnect();
			disconnectMenuObserver();

			if (frameId !== null) {
				cancelFrame(frameId);
				frameId = null;
			}

			restoreMenu({ menu: activeMenu });

			activeMenu = null;
			activeButton = null;
			originSnapshot = null;
			snapshot = {
				hasItems: false,
				isAttachedToHost: false,
				menuNode: null,
			};
		},
		getSnapshot() {
			return snapshot;
		},
		restore() {
			restoreMenu({ menu: activeMenu });
		},
		sync,
	};
}

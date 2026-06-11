import * as React from "react";

import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/astra/drawer";
import { UiIcon } from "@/components/ui/shared/icon";
import { WandSparkles } from "@/components/ui/shared/icons";
import { buttonVariants } from "@/components/ui/shadcn/button";
import { cn } from "@/lib/utils";
import { translateAstra } from "@/packages/core/i18n";
import {
	MOBILE_SEND_FORM_EXTENSION_SHORTCUTS_BUTTON_ID,
	MOBILE_SEND_FORM_EXTENSIONS_DRAWER_DESCRIPTION_ID,
	MOBILE_SEND_FORM_EXTENSIONS_DRAWER_ID,
	MOBILE_SEND_FORM_EXTENSIONS_DRAWER_SCROLLABLE_CONTENT_ID,
	MOBILE_SEND_FORM_EXTENSIONS_DRAWER_TITLE_ID,
	MOBILE_SEND_FORM_EXTENSIONS_MENU_HOST_ID,
} from "@/packages/features/chat-session/send-form/contracts/dom";
import {
	createNativeExtensionsMenuBridge,
	isExtensionsMenuActionTarget,
	type NativeExtensionsMenuBridge,
	type NativeExtensionsMenuBridgeSnapshot,
} from "@/packages/features/chat-session/send-form/extensions-menu/nativeExtensionsMenuBridge";
import {
	isMenuOpenKeyboardEvent,
	releaseSendFormFocus,
} from "@/packages/features/chat-session/send-form/bridges/focusRelease";

const EMPTY_SNAPSHOT: NativeExtensionsMenuBridgeSnapshot = {
	hasItems: false,
	isAttachedToHost: false,
	menuNode: null,
};

export function MobileSendFormExtensionsMenu({
	documentRef = document,
	interactionBlocked = false,
}: {
	documentRef?: Document;
	interactionBlocked?: boolean;
}) {
	const bridgeRef = React.useRef<NativeExtensionsMenuBridge | null>(null);
	const [bridgeSnapshot, setBridgeSnapshot] =
		React.useState<NativeExtensionsMenuBridgeSnapshot>(EMPTY_SNAPSHOT);
	const [hostNode, setHostNode] = React.useState<HTMLDivElement | null>(null);
	const [isOpen, setIsOpen] = React.useState(false);
	const triggerLabel = translateAstra("sendForm.extensions.trigger");
	const title = translateAstra("sendForm.extensions.title");
	const description = translateAstra("sendForm.extensions.description");
	const sectionLabel = translateAstra("sendForm.extensions.sectionLabel");

	React.useEffect(() => {
		const bridge = createNativeExtensionsMenuBridge({
			documentRef,
			onSnapshotChange: setBridgeSnapshot,
		});

		bridgeRef.current = bridge;
		setBridgeSnapshot(bridge.getSnapshot());

		return () => {
			bridge.dispose();

			if (bridgeRef.current === bridge) {
				bridgeRef.current = null;
			}
		};
	}, [documentRef]);

	React.useEffect(() => {
		const bridge = bridgeRef.current;
		if (!bridge) {
			return;
		}

		if (isOpen && hostNode) {
			bridge.attachTo(hostNode);
			return;
		}

		bridge.restore();
	}, [hostNode, isOpen]);

	React.useEffect(() => {
		if (bridgeSnapshot.hasItems) {
			return;
		}

		setIsOpen(false);
	}, [bridgeSnapshot.hasItems]);

	React.useEffect(() => {
		if (!(hostNode instanceof HTMLDivElement)) {
			return;
		}

		const view = documentRef.defaultView ?? window;
		const handleClick = (event: MouseEvent) => {
			const menu = bridgeRef.current?.getSnapshot().menuNode;
			if (
				!(menu instanceof HTMLElement) ||
				!isExtensionsMenuActionTarget({
					menu,
					target: event.target,
				})
			) {
				return;
			}

			view.setTimeout(() => {
				setIsOpen(false);
			}, 0);
		};

		hostNode.addEventListener("click", handleClick);
		return () => {
			hostNode.removeEventListener("click", handleClick);
		};
	}, [documentRef, hostNode]);

	const handleOpenRequest = React.useCallback(() => {
		if (interactionBlocked || !bridgeSnapshot.hasItems) {
			return;
		}

		releaseSendFormFocus(documentRef);
		setIsOpen(true);
	}, [bridgeSnapshot.hasItems, documentRef, interactionBlocked]);

	const handleTriggerPointerDownCapture = React.useCallback(() => {
		if (interactionBlocked) {
			return;
		}

		releaseSendFormFocus(documentRef);
	}, [documentRef, interactionBlocked]);

	const handleTriggerKeyDownCapture = React.useCallback(
		(event: React.KeyboardEvent<HTMLButtonElement>) => {
			if (interactionBlocked) {
				return;
			}

			if (!isMenuOpenKeyboardEvent(event.nativeEvent)) {
				return;
			}

			releaseSendFormFocus(documentRef);
		},
		[documentRef, interactionBlocked],
	);

	return (
		<Drawer
			direction="bottom"
			onOpenChange={(nextOpen) => {
				if (
					nextOpen &&
					(interactionBlocked || !bridgeSnapshot.hasItems)
				) {
					return;
				}

				setIsOpen(nextOpen);
			}}
			open={isOpen}
			repositionInputs={false}
		>
			<button
				aria-controls={MOBILE_SEND_FORM_EXTENSIONS_DRAWER_ID}
				aria-expanded={bridgeSnapshot.hasItems ? isOpen : false}
				aria-hidden={bridgeSnapshot.hasItems ? "false" : "true"}
				aria-label={triggerLabel}
				className={cn(
					buttonVariants({
						size: "icon-xs",
						variant: "ghost",
					}),
					"mobile-send-form-input-row__left-control-button",
				)}
				data-availability={bridgeSnapshot.hasItems ? "ready" : "empty"}
				disabled={!bridgeSnapshot.hasItems}
				id={MOBILE_SEND_FORM_EXTENSION_SHORTCUTS_BUTTON_ID}
				tabIndex={bridgeSnapshot.hasItems ? undefined : -1}
				title={triggerLabel}
				type="button"
				onClick={handleOpenRequest}
				onKeyDownCapture={handleTriggerKeyDownCapture}
				onPointerDownCapture={handleTriggerPointerDownCapture}
			>
				<UiIcon aria-hidden={true} icon={WandSparkles} size="sm" />
			</button>
			<DrawerContent
				aria-describedby={
					MOBILE_SEND_FORM_EXTENSIONS_DRAWER_DESCRIPTION_ID
				}
				aria-labelledby={MOBILE_SEND_FORM_EXTENSIONS_DRAWER_TITLE_ID}
				className="mobile-send-form-extensions-drawer"
				id={MOBILE_SEND_FORM_EXTENSIONS_DRAWER_ID}
			>
				<DrawerHeader className="sr-only">
					<DrawerTitle asChild={true}>
						<span>
							<span
								id={MOBILE_SEND_FORM_EXTENSIONS_DRAWER_TITLE_ID}
								data-slot="drawer-title"
							>
								{title}
							</span>
						</span>
					</DrawerTitle>
					<DrawerDescription asChild={true}>
						<span>
							<span
								id={
									MOBILE_SEND_FORM_EXTENSIONS_DRAWER_DESCRIPTION_ID
								}
								data-slot="drawer-description"
							>
								{description}
							</span>
						</span>
					</DrawerDescription>
				</DrawerHeader>
				<DrawerBody
					scrollAreaProps={{
						className:
							"mobile-send-form-extensions-drawer__scroll-area",
					}}
					viewportProps={{
						className:
							"mobile-send-form-extensions-drawer__scrollable-content",
						id: MOBILE_SEND_FORM_EXTENSIONS_DRAWER_SCROLLABLE_CONTENT_ID,
					}}
				>
					<div className="mobile-send-form-extensions-drawer__content">
						<div className="mobile-send-form-options-drawer__group-label mobile-send-form-extensions-drawer__label mobile-send-form-surface-label">
							{sectionLabel}
						</div>
						<div
							className="mobile-send-form-extensions-drawer__menu-host"
							id={MOBILE_SEND_FORM_EXTENSIONS_MENU_HOST_ID}
							ref={setHostNode}
						/>
					</div>
				</DrawerBody>
			</DrawerContent>
		</Drawer>
	);
}

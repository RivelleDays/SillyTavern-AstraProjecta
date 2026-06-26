import * as React from "react";
import { Dialog as DialogPrimitive, Slot } from "radix-ui";

import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerTitle,
	useAstraDrawerClose,
} from "@/components/ui/astra/drawer";
import { ScrollArea } from "@/components/ui/astra/scroll-area";
import { AstraChatAvatar } from "@/components/ui/shared/chat-avatar";
import { cn } from "@/lib/utils";
import { useIsMobileLayout } from "@/hooks/use-mobile";
import { getAstraProjectaPortalContainer } from "@/packages/core/runtime/uiScope";

export interface ResponsiveDialogIdentity {
	avatarUrl?: string;
	groupAvatarUrls?: string[];
	name?: string;
}

export interface ResponsiveDialogHeadingRenderProps {
	descriptionNode: React.ReactNode;
	titleNode: React.ReactNode;
}

export interface ResponsiveDialogProps {
	children: React.ReactNode;
	className?: string;
	container?: HTMLElement | null;
	contentId?: string;
	description?: React.ReactNode;
	exitDurationMs?: number;
	footer?: React.ReactNode;
	forceMountContent?: boolean;
	headerContent?: React.ReactNode;
	hideHeading?: boolean;
	icon?: React.ReactNode;
	identity?: ResponsiveDialogIdentity | null;
	id?: string;
	onExitComplete?: () => void;
	onOpenAutoFocus?: (event: Event) => void;
	onOpenChange(nextValue: boolean): void;
	open: boolean;
	renderHeading?: (
		props: ResponsiveDialogHeadingRenderProps,
	) => React.ReactNode;
	scrollBody?: boolean;
	title: React.ReactNode;
}

const RESPONSIVE_DIALOG_EXIT_MS = 500;
const ResponsiveDialogCloseContext = React.createContext<(() => void) | null>(
	null,
);

type ResponsiveDialogCloseProps = Omit<
	React.ComponentPropsWithoutRef<"button">,
	"onClick"
> & {
	asChild?: boolean;
	onClick?: React.MouseEventHandler<HTMLElement>;
};

function useLatestRef<T>(value: T) {
	const ref = React.useRef(value);
	React.useEffect(() => {
		ref.current = value;
	}, [value]);
	return ref;
}

function resolvePortalContainer(container?: HTMLElement | null) {
	return container ?? getAstraProjectaPortalContainer() ?? undefined;
}

function useDelayedResponsiveDialogState({
	enabled,
	exitDurationMs,
	onExitComplete,
	onOpenChange,
	open,
}: {
	enabled: boolean;
	exitDurationMs: number;
	onExitComplete?: () => void;
	onOpenChange(nextValue: boolean): void;
	open: boolean;
}) {
	const [visualOpen, setVisualOpen] = React.useState(open);
	const [isExitPending, setIsExitPending] = React.useState(false);
	const visualOpenRef = React.useRef(visualOpen);
	const exitTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const isExitPendingRef = React.useRef(false);
	const shouldNotifyParentOnExitRef = React.useRef(false);
	const exitDurationMsRef = useLatestRef(exitDurationMs);
	const onExitCompleteRef = useLatestRef(onExitComplete);
	const onOpenChangeRef = useLatestRef(onOpenChange);

	const cancelExitTimer = React.useCallback(() => {
		if (exitTimerRef.current) {
			clearTimeout(exitTimerRef.current);
			exitTimerRef.current = null;
		}

		isExitPendingRef.current = false;
		shouldNotifyParentOnExitRef.current = false;
		setIsExitPending(false);
	}, []);

	const completeExit = React.useCallback(() => {
		exitTimerRef.current = null;

		if (!isExitPendingRef.current) {
			return;
		}

		const shouldNotifyParent = shouldNotifyParentOnExitRef.current;
		isExitPendingRef.current = false;
		shouldNotifyParentOnExitRef.current = false;
		setIsExitPending(false);

		onExitCompleteRef.current?.();

		if (shouldNotifyParent) {
			onOpenChangeRef.current(false);
		}
	}, [onExitCompleteRef, onOpenChangeRef]);

	const requestClose = React.useCallback(
		({ notifyParent = true }: { notifyParent?: boolean } = {}) => {
			if (!enabled) {
				onOpenChangeRef.current(false);
				return;
			}

			if (!visualOpenRef.current) {
				if (isExitPendingRef.current && notifyParent) {
					shouldNotifyParentOnExitRef.current = true;
				}

				return;
			}

			shouldNotifyParentOnExitRef.current =
				shouldNotifyParentOnExitRef.current || notifyParent;

			visualOpenRef.current = false;
			setVisualOpen(false);
			isExitPendingRef.current = true;
			setIsExitPending(true);

			if (exitTimerRef.current) {
				clearTimeout(exitTimerRef.current);
			}

			exitTimerRef.current = setTimeout(
				completeExit,
				exitDurationMsRef.current,
			);
		},
		[completeExit, enabled, exitDurationMsRef, onOpenChangeRef],
	);

	const handleOpenChange = React.useCallback(
		(nextOpen: boolean) => {
			if (!nextOpen) {
				requestClose({ notifyParent: true });
				return;
			}

			cancelExitTimer();
			visualOpenRef.current = true;
			setVisualOpen(true);
			setIsExitPending(false);
			onOpenChangeRef.current(true);
		},
		[cancelExitTimer, onOpenChangeRef, requestClose],
	);

	React.useEffect(() => {
		if (!enabled) {
			cancelExitTimer();
			visualOpenRef.current = open;
			setVisualOpen(open);
			setIsExitPending(false);
			return;
		}

		if (open) {
			cancelExitTimer();
			visualOpenRef.current = true;
			setVisualOpen(true);
			setIsExitPending(false);
			return;
		}

		if (visualOpenRef.current) {
			requestClose({ notifyParent: false });
		}
	}, [cancelExitTimer, enabled, open, requestClose]);

	React.useEffect(() => {
		return () => {
			if (exitTimerRef.current) {
				clearTimeout(exitTimerRef.current);
			}
		};
	}, []);

	return { handleOpenChange, isExitPending, requestClose, visualOpen };
}

function ResponsiveDialogMobileCloseProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const requestClose = useAstraDrawerClose();

	return (
		<ResponsiveDialogCloseContext.Provider value={requestClose}>
			{children}
		</ResponsiveDialogCloseContext.Provider>
	);
}

export function useResponsiveDialogClose() {
	const requestClose = React.useContext(ResponsiveDialogCloseContext);

	if (!requestClose) {
		throw new Error(
			"useResponsiveDialogClose must be used inside ResponsiveDialog.",
		);
	}

	return requestClose;
}

export const ResponsiveDialogClose = React.forwardRef<
	HTMLButtonElement,
	ResponsiveDialogCloseProps
>(({ asChild = false, onClick, type, ...props }, ref) => {
	const requestClose = useResponsiveDialogClose();
	const Comp = asChild ? Slot.Root : "button";

	return (
		<Comp
			ref={ref}
			data-slot="dialog-close"
			type={asChild ? undefined : (type ?? "button")}
			{...props}
			onClick={(event) => {
				onClick?.(event);

				if (!event.defaultPrevented) {
					requestClose();
				}
			}}
		/>
	);
});
ResponsiveDialogClose.displayName = "ResponsiveDialogClose";

export function ResponsiveDialog({
	children,
	className,
	container,
	contentId,
	description,
	exitDurationMs = RESPONSIVE_DIALOG_EXIT_MS,
	footer,
	forceMountContent = false,
	headerContent,
	hideHeading = false,
	id,
	icon,
	identity,
	onExitComplete,
	onOpenAutoFocus,
	onOpenChange,
	open,
	renderHeading,
	scrollBody = false,
	title,
}: ResponsiveDialogProps) {
	const isMobileLayout = useIsMobileLayout();
	const resolvedContainer = React.useMemo(
		() => resolvePortalContainer(container),
		[container],
	);
	const desktopDialogState = useDelayedResponsiveDialogState({
		enabled: !isMobileLayout,
		exitDurationMs,
		onExitComplete,
		onOpenChange,
		open,
	});
	const forceMount = forceMountContent ? true : undefined;
	const desktopForceMount =
		forceMountContent || desktopDialogState.isExitPending
			? true
			: undefined;
	const contentElementId = id ?? contentId;
	const titleId = contentElementId ? `${contentElementId}-title` : undefined;
	const descriptionId = contentElementId
		? `${contentElementId}-description`
		: undefined;
	const stableTitleNode = titleId ? (
		<span className="astra-dialog-title" id={titleId}>
			{title}
		</span>
	) : (
		title
	);
	const stableDescriptionNode = descriptionId ? (
		<div
			className={cn(
				"astra-dialog-description",
				!description && "sr-only",
			)}
			id={descriptionId}
		>
			{description ?? "Dialog details"}
		</div>
	) : (
		(description ?? "Dialog details")
	);
	const titleNode = isMobileLayout ? (
		<DrawerTitle className="astra-dialog-title">
			{stableTitleNode}
		</DrawerTitle>
	) : (
		<DialogPrimitive.Title className="astra-dialog-title">
			{stableTitleNode}
		</DialogPrimitive.Title>
	);
	const descriptionNode = isMobileLayout ? (
		<DrawerDescription asChild={true}>
			<div
				className={cn(
					"astra-dialog-description",
					!description && "sr-only",
				)}
			>
				{stableDescriptionNode}
			</div>
		</DrawerDescription>
	) : (
		<DialogPrimitive.Description asChild={true}>
			<div
				className={cn(
					"astra-dialog-description",
					!description && "sr-only",
				)}
			>
				{stableDescriptionNode}
			</div>
		</DialogPrimitive.Description>
	);
	const headingIcon = icon ? (
		<span aria-hidden={true} className="astra-dialog-icon">
			{icon}
		</span>
	) : null;
	const header = (
		<div className="astra-dialog-header">
			{headerContent ?? <DialogIdentity identity={identity} />}
		</div>
	);
	const heading = renderHeading?.({ descriptionNode, titleNode }) ?? (
		<div className="astra-dialog-heading">
			{headingIcon}
			<div className="astra-dialog-headingContent">
				{titleNode}
				{descriptionNode}
			</div>
		</div>
	);
	const renderedHeading = hideHeading ? (
		<div className="sr-only">
			{titleNode}
			{descriptionNode}
		</div>
	) : (
		heading
	);
	const body = scrollBody ? (
		<div className="astra-dialog-body" data-scroll-area="true">
			<ScrollArea.Root
				className="astra-dialog-body__scroll-root"
				data-astra-scroll-affordance="surface"
			>
				<ScrollArea.Viewport className="astra-dialog-body__viewport">
					<ScrollArea.Content className="astra-dialog-content">
						{children}
					</ScrollArea.Content>
				</ScrollArea.Viewport>
				<ScrollArea.Scrollbar
					className="astra-dialog-body__scrollbar"
					orientation="vertical"
				>
					<ScrollArea.Thumb className="astra-dialog-body__thumb" />
				</ScrollArea.Scrollbar>
				<ScrollArea.Corner />
			</ScrollArea.Root>
		</div>
	) : (
		<div className="astra-dialog-body">
			<div className="astra-dialog-content">{children}</div>
		</div>
	);
	const footerNode = footer ? (
		<div className="astra-dialog-footer">{footer}</div>
	) : null;

	if (isMobileLayout) {
		return (
			<Drawer
				container={resolvedContainer}
				direction="bottom"
				exitDurationMs={exitDurationMs}
				onExitComplete={onExitComplete}
				onOpenChange={onOpenChange}
				open={open}
				repositionInputs={false}
			>
				<DrawerContent
					className={cn("astra-drawer-surface", className)}
					container={resolvedContainer}
					forceMount={forceMount}
					id={contentElementId}
					onOpenAutoFocus={onOpenAutoFocus}
				>
					<ResponsiveDialogMobileCloseProvider>
						{header}
						{renderedHeading}
						{body}
						{footerNode}
					</ResponsiveDialogMobileCloseProvider>
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<DialogPrimitive.Root
			open={desktopDialogState.visualOpen}
			onOpenChange={desktopDialogState.handleOpenChange}
		>
			<DialogPrimitive.Portal
				container={resolvedContainer}
				forceMount={desktopForceMount}
			>
				<DialogPrimitive.Overlay
					className="astra-dialog-overlay fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
					data-slot="dialog-overlay"
					forceMount={desktopForceMount}
				/>
				<DialogPrimitive.Content
					className={cn(
						"astra-dialog-surface fixed top-[50%] left-[50%] z-50 w-full translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-background shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
						className,
					)}
					data-slot="dialog-content"
					forceMount={desktopForceMount}
					id={contentElementId}
					onOpenAutoFocus={onOpenAutoFocus}
				>
					<ResponsiveDialogCloseContext.Provider
						value={desktopDialogState.requestClose}
					>
						{header}
						{renderedHeading}
						{body}
						{footerNode}
					</ResponsiveDialogCloseContext.Provider>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}

function DialogIdentity({
	identity,
}: {
	identity?: ResponsiveDialogIdentity | null;
}) {
	if (!identity) {
		return null;
	}

	const label =
		typeof identity.name === "string" && identity.name.trim()
			? identity.name.trim()
			: "Character";
	const avatarUrl =
		typeof identity.avatarUrl === "string" ? identity.avatarUrl : "";
	const groupAvatarUrls = Array.isArray(identity.groupAvatarUrls)
		? identity.groupAvatarUrls
		: [];

	return (
		<div className="astra-dialog-identity">
			<div className="astra-dialog-identityAvatar">
				{avatarUrl || groupAvatarUrls.length > 0 ? (
					<AstraChatAvatar
						alt={`${label} avatar`}
						avatarUrl={avatarUrl}
						className="astra-dialog-identityImage"
						groupAvatarUrls={groupAvatarUrls}
						loading="lazy"
					/>
				) : null}
			</div>
			<span className="astra-dialog-identityName" title={label}>
				{label}
			</span>
		</div>
	);
}

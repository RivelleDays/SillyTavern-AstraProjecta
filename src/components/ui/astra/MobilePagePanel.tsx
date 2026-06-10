import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";
import { getAstraProjectaPortalContainer } from "@/packages/core/runtime/uiScope";

function resolvePortalContainer(container?: HTMLElement | null) {
	return container ?? getAstraProjectaPortalContainer() ?? undefined;
}

function resolveAccessibleTitleText(node: React.ReactNode): string {
	if (typeof node === "string" || typeof node === "number") {
		return String(node);
	}

	if (Array.isArray(node)) {
		return node.map(resolveAccessibleTitleText).join("");
	}

	if (React.isValidElement(node)) {
		const props = node.props as {
			"aria-hidden"?: boolean | "false" | "true";
			children?: React.ReactNode;
		};
		if (props["aria-hidden"] === true || props["aria-hidden"] === "true") {
			return "";
		}

		return resolveAccessibleTitleText(props.children);
	}

	return "";
}

export interface MobilePagePanelProps {
	accessibleTitle: React.ReactNode;
	children: React.ReactNode;
	className?: string;
	container?: HTMLElement | null;
	forceMount?: boolean;
	id?: string;
	onOpenChange(nextValue: boolean): void;
	open: boolean;
	side?: "left" | "right" | "top" | "bottom";
}

export function MobilePagePanel({
	accessibleTitle,
	children,
	className,
	container,
	forceMount = false,
	id,
	onOpenChange,
	open,
	side = "right",
}: MobilePagePanelProps) {
	const resolvedContainer = React.useMemo(
		() => resolvePortalContainer(container),
		[container],
	);
	const accessibleTitleText = resolveAccessibleTitleText(accessibleTitle);
	const accessibleTitleId = id ? `${id}-accessible-title` : undefined;

	return (
		<DialogPrimitive.Root
			modal={false}
			open={open}
			onOpenChange={onOpenChange}
		>
			<DialogPrimitive.Portal
				container={resolvedContainer}
				forceMount={forceMount ? true : undefined}
			>
				<DialogPrimitive.Content
					aria-describedby={undefined}
					className={cn("astra-mobile-page-panel", className)}
					data-astra-component="MobilePagePanel"
					data-side={side}
					data-slot="mobile-page-panel"
					forceMount={forceMount ? true : undefined}
					id={id}
					onEscapeKeyDown={(event) => {
						event.preventDefault();
					}}
					onInteractOutside={(event) => {
						event.preventDefault();
					}}
					onOpenAutoFocus={(event) => {
						event.preventDefault();
					}}
					onPointerDownOutside={(event) => {
						event.preventDefault();
					}}
					{...(open ? {} : ({ inert: "" } as Record<string, string>))}
				>
					<DialogPrimitive.Title asChild={true}>
						<span className="sr-only">
							{accessibleTitleId ? (
								<span id={accessibleTitleId}>
									{accessibleTitleText}
								</span>
							) : (
								accessibleTitleText
							)}
						</span>
					</DialogPrimitive.Title>
					{children}
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}

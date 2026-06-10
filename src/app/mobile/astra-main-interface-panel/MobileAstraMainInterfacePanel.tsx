import * as React from "react";

import { ScrollArea } from "@/components/ui/astra/scroll-area";
import { UiIcon } from "@/components/ui/shared/icon";
import { ChevronsRight } from "@/components/ui/shared/icons";
import { MobilePagePanel } from "@/components/ui/astra/MobilePagePanel";
import { Button } from "@/components/ui/shadcn/button";
import { translateAstra } from "@/packages/core/i18n";
import {
	MOBILE_ASTRA_MAIN_INTERFACE_CLOSE_BUTTON_ID,
	MOBILE_ASTRA_MAIN_INTERFACE_CLOSE_BUTTON_WRAPPER_ID,
	MOBILE_ASTRA_MAIN_INTERFACE_CONTENT_ID,
	MOBILE_ASTRA_MAIN_INTERFACE_PANEL_ID,
	MOBILE_ASTRA_MAIN_INTERFACE_TITLE_ID,
} from "@/app/mobile/astra-main-interface-panel/contracts/dom";

export interface MobileAstraMainInterfacePanelProps {
	bodyStart?: React.ReactNode;
	children?: React.ReactNode;
	contentScrollMode?: "panel" | "children";
	headerContent?: React.ReactNode;
	headerTitle?: string;
	onOpenChange(nextOpen: boolean): void;
	open: boolean;
}

export function MobileAstraMainInterfacePanel({
	bodyStart = null,
	children = null,
	contentScrollMode = "panel",
	headerContent = null,
	headerTitle,
	onOpenChange,
	open,
}: MobileAstraMainInterfacePanelProps) {
	const accessibleTitle = translateAstra("astraMainInterface.title");
	const visibleTitle = headerTitle?.trim() || accessibleTitle;
	const contentStyle: React.CSSProperties = {
		boxSizing: "border-box",
		minWidth: "0",
		width: "100%",
	};
	const content = (
		<div
			className="astra-main-interface-panel__content"
			id={MOBILE_ASTRA_MAIN_INTERFACE_CONTENT_ID}
			style={contentStyle}
		>
			{children}
		</div>
	);

	return (
		<MobilePagePanel
			accessibleTitle={accessibleTitle}
			className="astra-main-interface-panel"
			forceMount={true}
			id={MOBILE_ASTRA_MAIN_INTERFACE_PANEL_ID}
			open={open}
			side="left"
			onOpenChange={onOpenChange}
		>
			<div className="astra-main-interface-panel__header">
				<div className="astra-main-interface-panel__header-bar">
					<div className="astra-main-interface-panel__header-main">
						<div
							className="astra-main-interface-panel__title"
							id={MOBILE_ASTRA_MAIN_INTERFACE_TITLE_ID}
						>
							{visibleTitle}
						</div>
					</div>
					<div
						className="astra-main-interface-panel__header-end"
						id={MOBILE_ASTRA_MAIN_INTERFACE_CLOSE_BUTTON_WRAPPER_ID}
					>
						<Button
							aria-label={translateAstra(
								"astraMainInterface.close",
							)}
							className="astra-main-interface-panel__close-button"
							id={MOBILE_ASTRA_MAIN_INTERFACE_CLOSE_BUTTON_ID}
							size="icon-sm"
							type="button"
							variant="ghost"
							onClick={() => {
								onOpenChange(false);
							}}
						>
							<UiIcon
								aria-hidden={true}
								icon={ChevronsRight}
								size="sm"
							/>
						</Button>
					</div>
				</div>
				{headerContent ? (
					<div className="astra-main-interface-panel__header-content">
						{headerContent}
					</div>
				) : null}
			</div>
			<div className="astra-main-interface-panel__body">
				{bodyStart}
				{contentScrollMode === "children" ? (
					content
				) : (
					<ScrollArea.Root
						className="astra-main-interface-panel__scroll-area"
						data-astra-scroll-affordance="surface"
					>
						<ScrollArea.Viewport className="astra-main-interface-panel__viewport">
							<ScrollArea.Content
								className="astra-main-interface-panel__content"
								id={MOBILE_ASTRA_MAIN_INTERFACE_CONTENT_ID}
								style={contentStyle}
							>
								{children}
							</ScrollArea.Content>
						</ScrollArea.Viewport>
						<ScrollArea.Scrollbar
							className="astra-main-interface-panel__scrollbar"
							keepMounted={true}
							orientation="vertical"
						>
							<ScrollArea.Thumb />
						</ScrollArea.Scrollbar>
						<ScrollArea.Corner />
					</ScrollArea.Root>
				)}
			</div>
		</MobilePagePanel>
	);
}

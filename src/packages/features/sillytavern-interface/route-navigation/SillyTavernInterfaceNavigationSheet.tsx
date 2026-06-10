import * as React from "react";

import { ScrollArea } from "@/components/ui/astra/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/astra/sheet";
import { UiIcon } from "@/components/ui/shared/icon";
import { Button } from "@/components/ui/shadcn/button";
import { translateAstra } from "@/packages/core/i18n";
import {
	SILLYTAVERN_INTERFACE_MENU_SHEET_ID,
	SILLYTAVERN_INTERFACE_MENU_SHEET_TITLE_ID,
} from "@/packages/features/sillytavern-interface/contracts/dom";
import type { SillyTavernInterfacePageNavigationItem } from "@/packages/features/sillytavern-interface/routes/types";

export interface SillyTavernInterfaceNavigationSheetProps {
	activePageKey: string;
	items: SillyTavernInterfacePageNavigationItem[];
	onOpenChange(nextOpen: boolean): void;
	onPageSelect(pageKey: string): void;
	open: boolean;
}

function NavigationPageButton({
	activePageKey,
	item,
	onPageSelect,
}: {
	activePageKey: string;
	item: SillyTavernInterfacePageNavigationItem;
	onPageSelect(pageKey: string): void;
}) {
	const isActive = item.pageKey === activePageKey;

	return (
		<Button
			aria-current={isActive ? "page" : undefined}
			className="sillytavern-interface__menu-item"
			data-active={isActive ? "true" : "false"}
			size="default"
			type="button"
			variant="ghost"
			onClick={() => {
				onPageSelect(item.pageKey);
			}}
		>
			<UiIcon
				aria-hidden={true}
				className="sillytavern-interface__menu-item-icon"
				icon={item.icon}
				size="sm"
			/>
			<span className="sillytavern-interface__menu-item-label">
				{item.label}
			</span>
		</Button>
	);
}

export function SillyTavernInterfaceNavigationSheet({
	activePageKey,
	items,
	onOpenChange,
	onPageSelect,
	open,
}: SillyTavernInterfaceNavigationSheetProps) {
	const menuTitle = translateAstra("sillyTavernInterface.menu.title");

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				className="sillytavern-interface__menu-sheet"
				id={SILLYTAVERN_INTERFACE_MENU_SHEET_ID}
				side="left"
			>
				<SheetTitle asChild={true}>
					<span className="sr-only">
						<span id={SILLYTAVERN_INTERFACE_MENU_SHEET_TITLE_ID}>
							{menuTitle}
						</span>
					</span>
				</SheetTitle>
				<ScrollArea.Root
					className="sillytavern-interface__menu-scroll-area"
					data-astra-scroll-affordance="surface"
				>
					<ScrollArea.Viewport className="sillytavern-interface__menu-viewport">
						<ScrollArea.Content className="sillytavern-interface__menu-content">
							<div
								aria-hidden={true}
								className="sillytavern-interface__menu-metadata"
							>
								{menuTitle}
							</div>
							<div className="sillytavern-interface__menu-list">
								{items.map((item) => (
									<NavigationPageButton
										activePageKey={activePageKey}
										item={item}
										key={item.key}
										onPageSelect={onPageSelect}
									/>
								))}
							</div>
						</ScrollArea.Content>
					</ScrollArea.Viewport>
					<ScrollArea.Scrollbar orientation="vertical">
						<ScrollArea.Thumb />
					</ScrollArea.Scrollbar>
					<ScrollArea.Corner />
				</ScrollArea.Root>
			</SheetContent>
		</Sheet>
	);
}

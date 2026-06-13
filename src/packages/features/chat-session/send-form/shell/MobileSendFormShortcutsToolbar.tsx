import * as React from "react";

import { Button } from "@/components/ui/shadcn/button";
import { UiIcon } from "@/components/ui/shared/icon";
import { BrainCircuit, ChevronDown } from "@/components/ui/shared/icons";
import type { LucideIcon } from "@/components/ui/shared/icons";
import type { ChatContextUsageSnapshot } from "@/packages/core/st/chatContextUsage";
import { SILLYTAVERN_INTERFACE_TRIGGER_ID } from "@/packages/features/chat-session/send-form/contracts/dom";
import { MobileChatContextUsageShortcut } from "@/packages/features/chat-session/send-form/context-usage/MobileChatContextUsageShortcut";

export interface VisibleMobileSendFormShortcut {
	icon: LucideIcon;
	id: string;
	label: string;
}

export interface MobileSendFormShortcutsToolbarProps {
	contextUsageSnapshot: ChatContextUsageSnapshot;
	label: string;
	onSillyTavernInterfaceOpen(): void;
	onQuickShortcutClick(shortcutId: string): void;
	sillyTavernInterfaceTriggerLabel: string;
	showContextUsageShortcut: boolean;
	visibleQuickShortcuts: readonly VisibleMobileSendFormShortcut[];
}

export function MobileSendFormShortcutsToolbar({
	contextUsageSnapshot,
	label,
	onSillyTavernInterfaceOpen,
	onQuickShortcutClick,
	sillyTavernInterfaceTriggerLabel,
	showContextUsageShortcut,
	visibleQuickShortcuts,
}: MobileSendFormShortcutsToolbarProps) {
	return (
		<div
			aria-label={label}
			className="mobile-send-form-shortcuts"
			data-slot="mobile-send-form-shortcuts"
			role="toolbar"
		>
			<div className="mobile-send-form-shortcuts__strip">
				<span className="mobile-send-form-shortcuts__item">
					<Button
						id={SILLYTAVERN_INTERFACE_TRIGGER_ID}
						className="mobile-send-form-shortcuts__button"
						size="sm"
						type="button"
						variant="outline"
						onClick={onSillyTavernInterfaceOpen}
					>
						<UiIcon
							aria-hidden={true}
							data-icon="inline-start"
							icon={BrainCircuit}
							size="md"
						/>
						{sillyTavernInterfaceTriggerLabel}
						<span className="mobile-send-form-shortcuts__button-chevron">
							<UiIcon
								aria-hidden={true}
								icon={ChevronDown}
								size="xs"
							/>
						</span>
					</Button>
				</span>
				{visibleQuickShortcuts.map((item) => {
					const ShortcutIcon = item.icon;

					return (
						<span
							className="mobile-send-form-shortcuts__item"
							key={item.id}
						>
							<Button
								aria-label={item.label}
								className="mobile-send-form-shortcuts__button"
								size="icon-sm"
								type="button"
								variant="ghost"
								onClick={() => {
									onQuickShortcutClick(item.id);
								}}
							>
								<UiIcon
									aria-hidden={true}
									icon={ShortcutIcon}
									size="md"
								/>
							</Button>
						</span>
					);
				})}
			</div>
			{showContextUsageShortcut ? (
				<div className="mobile-send-form-shortcuts__context-slot">
					<MobileChatContextUsageShortcut
						snapshot={contextUsageSnapshot}
					/>
				</div>
			) : null}
		</div>
	);
}

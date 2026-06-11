import * as React from "react";

import { Button } from "@/components/ui/shadcn/button";
import { UiIcon } from "@/components/ui/shared/icon";
import {
	Astroid,
	MessageCircleReply,
	TextCursorInput,
} from "@/components/ui/shared/icons";
import type { LucideIcon } from "@/components/ui/shared/icons";
import type { ChatContextUsageSnapshot } from "@/packages/core/st/chatContextUsage";
import { SILLYTAVERN_INTERFACE_TRIGGER_ID } from "@/packages/features/sillytavern-interface/contracts/dom";
import { MOBILE_SEND_FORM_QUICK_REPLY_TOGGLE_ID } from "@/packages/features/chat-session/send-form/contracts/dom";
import { MobileChatContextUsageShortcut } from "@/packages/features/chat-session/send-form/context-usage/MobileChatContextUsageShortcut";

export interface VisibleMobileSendFormShortcut {
	icon: LucideIcon;
	id: string;
	label: string;
}

export interface MobileSendFormShortcutsToolbarProps {
	contextUsageSnapshot: ChatContextUsageSnapshot;
	isQuickReplyHostVisible: boolean;
	label: string;
	quickReplyVisibilityToggleLabel: string;
	onSillyTavernInterfaceOpen(): void;
	onQuickReplyHostVisibilityToggle(): void;
	onQuickShortcutClick(shortcutId: string): void;
	sillyTavernInterfaceTriggerLabel: string;
	showContextUsageShortcut: boolean;
	showQuickReplyVisibilityToggle: boolean;
	visibleQuickShortcuts: readonly VisibleMobileSendFormShortcut[];
}

export function MobileSendFormShortcutsToolbar({
	contextUsageSnapshot,
	isQuickReplyHostVisible,
	label,
	onSillyTavernInterfaceOpen,
	onQuickReplyHostVisibilityToggle,
	onQuickShortcutClick,
	quickReplyVisibilityToggleLabel,
	sillyTavernInterfaceTriggerLabel,
	showContextUsageShortcut,
	showQuickReplyVisibilityToggle,
	visibleQuickShortcuts,
}: MobileSendFormShortcutsToolbarProps) {
	const QuickReplyToggleIcon = isQuickReplyHostVisible
		? MessageCircleReply
		: TextCursorInput;

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
						className="mobile-send-form-shortcuts__button"
						id={SILLYTAVERN_INTERFACE_TRIGGER_ID}
						size="sm"
						type="button"
						variant="outline"
						onClick={onSillyTavernInterfaceOpen}
					>
						<UiIcon
							aria-hidden={true}
							data-icon="inline-start"
							icon={Astroid}
							size="md"
						/>
						{sillyTavernInterfaceTriggerLabel}
					</Button>
				</span>
				{showQuickReplyVisibilityToggle ? (
					<span className="mobile-send-form-shortcuts__item">
						<Button
							aria-label={quickReplyVisibilityToggleLabel}
							className="mobile-send-form-shortcuts__button"
							id={MOBILE_SEND_FORM_QUICK_REPLY_TOGGLE_ID}
							size="icon-sm"
							type="button"
							variant="ghost"
							onClick={onQuickReplyHostVisibilityToggle}
						>
							<UiIcon
								aria-hidden={true}
								icon={QuickReplyToggleIcon}
								size="md"
							/>
						</Button>
					</span>
				) : null}
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

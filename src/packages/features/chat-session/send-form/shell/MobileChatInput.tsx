import * as React from "react";

import { Button } from "@/components/ui/shadcn/button";
import { UiIcon } from "@/components/ui/shared/icon";
import type { LucideIcon } from "@/components/ui/shared/icons";
import type { PrimarySendActionSnapshot } from "@/packages/core/st/primarySendAction";
import type { CurrentUserAvatarSnapshot } from "@/packages/core/st/currentUserAvatar";
import {
	MOBILE_CHAT_MAIN_MENU_DRAWER_ID,
	MOBILE_CHAT_MAIN_MENU_TRIGGER_ID,
	MOBILE_CHAT_QUICK_REPLIES_HOST_ID,
} from "@/packages/features/chat-session/send-form/contracts/dom";
import { MobileSendFormExtensionsMenu } from "@/packages/features/chat-session/send-form/extensions-menu/MobileSendFormExtensionsMenu";
import { MobileSendFormOptionsMenu } from "@/packages/features/chat-session/send-form/options-menu/MobileSendFormOptionsMenu";
import { MobileSendFormQuickReplyToggleButton } from "@/packages/features/chat-session/send-form/shell/MobileSendFormQuickReplyToggleButton";

export interface MobileChatInputProps {
	currentUserAvatarLabel: string;
	documentRef: Document;
	inputRowLabel: string;
	isMainMenuOpen: boolean;
	isQuickReplyHostVisible: boolean;
	isTextareaMultiline: boolean;
	leftControlsLabel: string;
	onMainMenuOpen(): void;
	onMainMenuTriggerKeyDownCapture(
		event: React.KeyboardEvent<HTMLButtonElement>,
	): void;
	onMainMenuTriggerPointerDownCapture(): void;
	onPrimarySendActionClick(): void;
	onQuickReplyHostChange(host: HTMLDivElement | null): void;
	onQuickReplyHostVisibilityToggle(): void;
	onShortcutsToolbarVisibilityChange(nextValue: boolean): void;
	onTextareaHostChange(host: HTMLDivElement | null): void;
	primarySendActionIcon: LucideIcon;
	primarySendActionSnapshot: PrimarySendActionSnapshot;
	quickReplyVisibilityToggleLabel: string;
	showQuickReplyVisibilityToggle: boolean;
	showShortcutsToolbar: boolean;
	userAvatarSnapshot: CurrentUserAvatarSnapshot;
}

export function MobileChatInput({
	currentUserAvatarLabel,
	documentRef,
	inputRowLabel,
	isMainMenuOpen,
	isQuickReplyHostVisible,
	isTextareaMultiline,
	leftControlsLabel,
	onMainMenuOpen,
	onMainMenuTriggerKeyDownCapture,
	onMainMenuTriggerPointerDownCapture,
	onPrimarySendActionClick,
	onQuickReplyHostChange,
	onQuickReplyHostVisibilityToggle,
	onShortcutsToolbarVisibilityChange,
	onTextareaHostChange,
	primarySendActionIcon: PrimarySendActionIcon,
	primarySendActionSnapshot,
	quickReplyVisibilityToggleLabel,
	showQuickReplyVisibilityToggle,
	showShortcutsToolbar,
	userAvatarSnapshot,
}: MobileChatInputProps) {
	return (
		<div
			aria-label={inputRowLabel}
			className="mobile-chat-input"
			data-input-state="default"
			data-slot="mobile-chat-input"
			data-active-panel={
				isQuickReplyHostVisible ? "quick-reply" : "textarea"
			}
			data-textarea-layout={
				isTextareaMultiline ? "multi-line" : "single-line"
			}
		>
			<div className="mobile-chat-input__content">
				<div
					className="mobile-chat-input__field"
					data-avatar-source={userAvatarSnapshot.source}
				>
					<div
						className="mobile-chat-input__textarea-slot"
						hidden={isQuickReplyHostVisible}
						ref={onTextareaHostChange}
					/>
					<div
						id={MOBILE_CHAT_QUICK_REPLIES_HOST_ID}
						className="mobile-chat-quick-replies-host"
						hidden={!isQuickReplyHostVisible}
						ref={onQuickReplyHostChange}
					/>
					<div
						className="mobile-chat-input__toolbar"
						data-slot="mobile-send-form-input-controls"
					>
						<div
							aria-label={leftControlsLabel}
							className="mobile-chat-input__tools"
							data-left-state="default"
							role="toolbar"
						>
							<div className="mobile-chat-input__tool-list">
								<button
									aria-controls={
										MOBILE_CHAT_MAIN_MENU_DRAWER_ID
									}
									aria-expanded={isMainMenuOpen}
									aria-haspopup="dialog"
									aria-label={currentUserAvatarLabel}
									id={MOBILE_CHAT_MAIN_MENU_TRIGGER_ID}
									className="mobile-chat-input__avatar-button mobile-chat-main-menu__trigger"
									data-avatar-source={
										userAvatarSnapshot.source
									}
									type="button"
									onClick={onMainMenuOpen}
									onKeyDownCapture={
										onMainMenuTriggerKeyDownCapture
									}
									onPointerDownCapture={
										onMainMenuTriggerPointerDownCapture
									}
								>
									<img
										alt={currentUserAvatarLabel}
										className="mobile-chat-input__avatar-image"
										draggable={false}
										loading="eager"
										src={userAvatarSnapshot.thumbnailUrl}
									/>
								</button>
								<MobileSendFormOptionsMenu
									documentRef={documentRef}
									showShortcutsToolbar={showShortcutsToolbar}
									onShowShortcutsToolbarChange={
										onShortcutsToolbarVisibilityChange
									}
								/>
								<MobileSendFormExtensionsMenu
									documentRef={documentRef}
								/>
							</div>
						</div>
						<div className="mobile-chat-input__actions">
							{showQuickReplyVisibilityToggle ? (
								<MobileSendFormQuickReplyToggleButton
									className="mobile-chat-input__quick-reply-toggle"
									isQuickReplyHostVisible={
										isQuickReplyHostVisible
									}
									label={quickReplyVisibilityToggleLabel}
									onClick={onQuickReplyHostVisibilityToggle}
								/>
							) : null}
							{primarySendActionSnapshot.visible ? (
								<Button
									aria-label={primarySendActionSnapshot.label}
									className="mobile-chat-input__send-button data-[action-kind=stop]:[&_svg]:fill-current"
									data-action-kind={
										primarySendActionSnapshot.kind
									}
									disabled={
										primarySendActionSnapshot.disabled
									}
									size="icon"
									title={primarySendActionSnapshot.label}
									type="button"
									variant="default"
									onClick={onPrimarySendActionClick}
								>
									<UiIcon
										aria-hidden={true}
										icon={PrimarySendActionIcon}
										size="sm"
									/>
								</Button>
							) : null}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

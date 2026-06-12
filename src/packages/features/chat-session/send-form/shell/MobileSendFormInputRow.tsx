import * as React from "react";

import { Button } from "@/components/ui/shadcn/button";
import { UiIcon } from "@/components/ui/shared/icon";
import type { LucideIcon } from "@/components/ui/shared/icons";
import type { PrimarySendActionSnapshot } from "@/packages/core/st/primarySendAction";
import type { CurrentUserAvatarSnapshot } from "@/packages/core/st/currentUserAvatar";
import {
	MOBILE_CHAT_MAIN_MENU_DRAWER_ID,
	MOBILE_CHAT_MAIN_MENU_TRIGGER_ID,
} from "@/packages/features/chat-session/send-form/contracts/dom";
import { MobileSendFormExtensionsMenu } from "@/packages/features/chat-session/send-form/extensions-menu/MobileSendFormExtensionsMenu";
import { MobileSendFormOptionsMenu } from "@/packages/features/chat-session/send-form/options-menu/MobileSendFormOptionsMenu";
import { MobileSendFormQuickReplyToggleButton } from "@/packages/features/chat-session/send-form/shell/MobileSendFormQuickReplyToggleButton";

export interface MobileSendFormInputRowProps {
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

export function MobileSendFormInputRow({
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
	onQuickReplyHostVisibilityToggle,
	onShortcutsToolbarVisibilityChange,
	onTextareaHostChange,
	primarySendActionIcon: PrimarySendActionIcon,
	primarySendActionSnapshot,
	quickReplyVisibilityToggleLabel,
	showQuickReplyVisibilityToggle,
	showShortcutsToolbar,
	userAvatarSnapshot,
}: MobileSendFormInputRowProps) {
	return (
		<div
			aria-label={inputRowLabel}
			className="mobile-send-form-input-row"
			data-input-state="default"
			data-slot="mobile-send-form-input-row"
			data-textarea-layout={
				isTextareaMultiline ? "multi-line" : "single-line"
			}
		>
			<div className="mobile-send-form-input-row__left">
				<div
					className="mobile-send-form-input-row__textarea-host"
					data-avatar-source={userAvatarSnapshot.source}
				>
					<div
						className="mobile-send-form-input-row__textarea-main"
						ref={onTextareaHostChange}
					/>
					<div
						className="mobile-send-form-input-row__controls-row"
						data-slot="mobile-send-form-input-controls"
					>
						<div
							aria-label={leftControlsLabel}
							className="mobile-send-form-input-row__left-controls"
							data-left-state="default"
							role="toolbar"
						>
							<div className="mobile-send-form-input-row__left-controls-default">
								<button
									aria-controls={
										MOBILE_CHAT_MAIN_MENU_DRAWER_ID
									}
									aria-expanded={isMainMenuOpen}
									aria-haspopup="dialog"
									aria-label={currentUserAvatarLabel}
									className="mobile-send-form-input-row__avatar mobile-chat-main-menu__trigger"
									data-avatar-source={
										userAvatarSnapshot.source
									}
									id={MOBILE_CHAT_MAIN_MENU_TRIGGER_ID}
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
										className="mobile-send-form-input-row__avatar-image"
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
						<div className="mobile-send-form-input-row__textarea-actions">
							{showQuickReplyVisibilityToggle ? (
								<MobileSendFormQuickReplyToggleButton
									className="mobile-send-form-input-row__quick-reply-toggle"
									isQuickReplyHostVisible={
										isQuickReplyHostVisible
									}
									label={quickReplyVisibilityToggleLabel}
									onClick={
										onQuickReplyHostVisibilityToggle
									}
								/>
							) : null}
							{primarySendActionSnapshot.visible ? (
								<Button
									aria-label={primarySendActionSnapshot.label}
									className="mobile-send-form-input-row__send-button data-[action-kind=stop]:[&_svg]:fill-current"
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

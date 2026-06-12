import * as React from "react";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/astra/select";
import { translateAstra } from "@/packages/core/i18n";
import { MOBILE_CHAT_MAIN_MENU_CONNECTION_PROFILE_SELECT_ID } from "@/packages/features/chat-session/send-form/contracts/dom";
import type { CurrentPresetProfileControlsSnapshot } from "@/packages/core/st/currentPresetProfileControls";

const NONE_OPTION_VALUE = "__astra-none__";
const DETACHED_OPTION_VALUE = "__astra-detached__";

function DrawerSelectControl({
	disabled,
	id,
	label,
	options,
	placeholder,
	selectedValue,
	onValueChange,
}: {
	disabled?: boolean;
	id: string;
	label: string;
	options: ReadonlyArray<{
		disabled?: boolean;
		label: string;
		value: string;
	}>;
	placeholder: string;
	selectedValue: string;
	onValueChange?(value: string): void;
}) {
	const normalizedValue = selectedValue
		? selectedValue
		: options.some((option) => option.value === "")
			? NONE_OPTION_VALUE
			: undefined;
	const selectedOption = normalizedValue
		? options.find(
				(option) =>
					(option.value === "" ? NONE_OPTION_VALUE : option.value) ===
					normalizedValue,
			)
		: undefined;
	const triggerTitle = selectedOption?.label ?? placeholder;

	return (
		<div
			className={`mobile-chat-main-menu-drawer__control group relative${
				disabled
					? " mobile-chat-main-menu-drawer__control--disabled"
					: ""
			}`}
		>
			<label
				className="mobile-chat-main-menu-drawer__control-label"
				htmlFor={id}
			>
				{label}
			</label>
			<Select
				disabled={disabled}
				value={normalizedValue}
				onValueChange={(nextValue) => {
					onValueChange?.(
						nextValue === NONE_OPTION_VALUE ? "" : nextValue,
					);
				}}
			>
					<SelectTrigger
						aria-label={label}
						className="mobile-chat-main-menu-drawer__control-trigger"
						disabled={disabled}
						id={id}
						size="sm"
						title={triggerTitle}
					>
						<span className="mobile-chat-main-menu-drawer__control-value">
							<SelectValue placeholder={placeholder} />
						</span>
					</SelectTrigger>
				<SelectContent
					align="start"
					className="mobile-chat-main-menu-drawer__control-content"
					position="popper"
				>
					{options.map((option) => (
						<SelectItem
							className="mobile-chat-main-menu-drawer__control-option"
							disabled={option.disabled}
							key={`${option.value || NONE_OPTION_VALUE}-${option.label}`}
							textValue={option.label}
							value={
								option.value === ""
									? NONE_OPTION_VALUE
									: option.value
							}
						>
							<span
								className="mobile-chat-main-menu-drawer__control-option-label"
								title={option.label}
							>
								{option.label}
							</span>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

export function MobileChatMainMenuDrawerControls({
	busy = false,
	snapshot,
	onConnectionProfileChange,
}: {
	busy?: boolean;
	snapshot: CurrentPresetProfileControlsSnapshot;
	onConnectionProfileChange?(value: string): void;
}) {
	const profileControl = snapshot.connectionProfiles;
	const showConnectionProfile = profileControl.status === "ready";

	if (!showConnectionProfile) {
		return null;
	}

	const detachedHelper =
		profileControl.authority === "detached" &&
		profileControl.detachedReason === "settings-changed"
			? translateAstra(
					"sendForm.mainMenu.controls.connectionProfileDetachedHelper",
				)
			: null;
	const options =
		profileControl.authority === "detached"
			? [
					{
						disabled: true,
						label: translateAstra(
							"sendForm.mainMenu.controls.connectionProfileDetached",
						),
						value: DETACHED_OPTION_VALUE,
					},
					...profileControl.options,
				]
			: profileControl.options;
	const selectedValue =
		profileControl.authority === "detached"
			? DETACHED_OPTION_VALUE
			: profileControl.selectedProfileId;

	return (
		<div className="mobile-chat-main-menu-drawer__controls-section">
			<DrawerSelectControl
				disabled={busy}
				id={MOBILE_CHAT_MAIN_MENU_CONNECTION_PROFILE_SELECT_ID}
				label={translateAstra(
					"sendForm.mainMenu.controls.connectionProfile",
				)}
				options={options}
				placeholder={translateAstra(
					"sendForm.mainMenu.controls.connectionProfilePlaceholder",
				)}
				selectedValue={selectedValue}
				onValueChange={onConnectionProfileChange}
			/>
			{detachedHelper ? (
				<p className="mobile-chat-main-menu-drawer__control-helper">
					{detachedHelper}
				</p>
			) : null}
		</div>
	);
}

import {
	HatGlasses,
	MessageCirclePlus,
	RefreshCcw,
	StepForward,
} from "@/components/ui/shared/icons";
import type { LucideIcon } from "@/components/ui/shared/icons";
import type { I18nKey } from "@/types/i18n";

export interface SendFormShortcutDescriptor {
	fallbackLabelKey: I18nKey;
	fallbackOptionId: string;
	icon: LucideIcon;
	id: string;
	nativeButtonId: string;
	settingKey: string;
}

export type SendFormPermanentShortcutActionDescriptor =
	| {
			fallbackLabelKey: I18nKey;
			icon: LucideIcon;
			id: "start-new-chat";
			kind: "native-option";
			nativeOptionId: string;
	  }
	| {
			fallbackLabelKey: I18nKey;
			icon: LucideIcon;
			id: "reload-page";
			kind: "page-reload";
	  };

export const SEND_FORM_PERMANENT_SHORTCUT_ACTIONS = [
	{
		fallbackLabelKey: "sendForm.options.action.startNewChat",
		icon: MessageCirclePlus,
		id: "start-new-chat",
		kind: "native-option",
		nativeOptionId: "option_start_new_chat",
	},
	{
		fallbackLabelKey: "sendForm.options.action.reloadPage",
		icon: RefreshCcw,
		id: "reload-page",
		kind: "page-reload",
	},
] as const satisfies readonly SendFormPermanentShortcutActionDescriptor[];

export const SEND_FORM_SHORTCUTS = [
	{
		fallbackLabelKey: "sendForm.shortcuts.impersonate",
		fallbackOptionId: "option_impersonate",
		icon: HatGlasses,
		id: "impersonate",
		nativeButtonId: "mes_impersonate",
		settingKey: "quick_impersonate",
	},
	{
		fallbackLabelKey: "sendForm.shortcuts.continue",
		fallbackOptionId: "option_continue",
		icon: StepForward,
		id: "continue",
		nativeButtonId: "mes_continue",
		settingKey: "quick_continue",
	},
] as const satisfies readonly SendFormShortcutDescriptor[];

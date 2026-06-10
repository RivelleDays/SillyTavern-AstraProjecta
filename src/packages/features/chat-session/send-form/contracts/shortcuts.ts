import { HatGlasses, StepForward } from "@/components/ui/shared/icons";
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

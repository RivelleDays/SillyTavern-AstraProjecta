import {
	ChartPie,
	CheckCheck,
	Contact,
	HatGlasses,
	MessageCirclePlus,
	MessageCircleX,
	RefreshCw,
	Scale,
	SendToBack,
	StepForward,
	StickyNote,
	Trash2,
	Users,
	X,
} from "@/components/ui/shared/icons";
import { translateAstra } from "@/packages/core/i18n";
import { getStContext } from "@/packages/core/st/context";
import { NATIVE_OPTIONS_ROOT_ID } from "@/packages/features/chat-session/send-form/contracts/dom";
import type {
	MobileSendFormMenuActionDescriptor,
	MobileSendFormMenuGroupDescriptor,
	MobileSendFormMenuGroupKey,
} from "@/packages/features/chat-session/send-form/options-menu/types";
import type { I18nKey } from "@/types/i18n";

interface StContextLike {
	Popup?: {
		show?: {
			confirm?: unknown;
		};
	};
	characterId?: unknown;
	characters?: unknown;
	chatId?: unknown;
	chatMetadata?: unknown;
	executeSlashCommandsWithOptions?: unknown;
	groupId?: unknown;
}

interface CheckpointVisibilityState {
	backToParent: boolean;
	convertToGroup: boolean;
	saveCheckpoint: boolean;
}

type MenuActionSeed =
	| {
			group: MobileSendFormMenuGroupKey;
			icon: MobileSendFormMenuActionDescriptor["icon"];
			key: MobileSendFormMenuActionDescriptor["key"];
			kind: "native-option";
			labelKey: I18nKey;
			nativeOptionId: string;
			variant: MobileSendFormMenuActionDescriptor["variant"];
	  }
	| {
			command: string;
			confirmTitleKey: I18nKey;
			group: MobileSendFormMenuGroupKey;
			icon: MobileSendFormMenuActionDescriptor["icon"];
			key: MobileSendFormMenuActionDescriptor["key"];
			kind: "slash-command";
			labelKey: I18nKey;
			requiresActiveChat: boolean;
			variant: MobileSendFormMenuActionDescriptor["variant"];
	  };

const GROUP_ORDER: readonly MobileSendFormMenuGroupKey[] = [
	"prompt-panels",
	"checkpoints",
	"generation",
	"chat-session",
	"danger-zone",
] as const;

const GROUP_LABELS: Record<MobileSendFormMenuGroupKey, I18nKey> = {
	"chat-session": "sendForm.options.group.chatSession",
	checkpoints: "sendForm.options.group.checkpoints",
	"danger-zone": "sendForm.options.group.dangerZone",
	generation: "sendForm.options.group.generation",
	"prompt-panels": "sendForm.options.group.promptPanels",
};

const MENU_ACTIONS: readonly MenuActionSeed[] = [
	{
		group: "prompt-panels",
		icon: StickyNote,
		key: "author_note",
		kind: "native-option",
		labelKey: "sendForm.options.action.authorNote",
		nativeOptionId: "option_toggle_AN",
		variant: "default",
	},
	{
		group: "prompt-panels",
		icon: Scale,
		key: "cfg_scale",
		kind: "native-option",
		labelKey: "sendForm.options.action.cfgScale",
		nativeOptionId: "option_toggle_CFG",
		variant: "default",
	},
	{
		group: "prompt-panels",
		icon: ChartPie,
		key: "token_probabilities",
		kind: "native-option",
		labelKey: "sendForm.options.action.tokenProbabilities",
		nativeOptionId: "option_toggle_logprobs",
		variant: "default",
	},
	{
		group: "checkpoints",
		icon: CheckCheck,
		key: "save_checkpoint",
		kind: "native-option",
		labelKey: "sendForm.options.action.saveCheckpoint",
		nativeOptionId: "option_new_bookmark",
		variant: "default",
	},
	{
		group: "checkpoints",
		icon: SendToBack,
		key: "back_to_parent_chat",
		kind: "native-option",
		labelKey: "sendForm.options.action.backToParentChat",
		nativeOptionId: "option_back_to_main",
		variant: "default",
	},
	{
		group: "generation",
		icon: RefreshCw,
		key: "regenerate",
		kind: "native-option",
		labelKey: "sendForm.options.action.regenerate",
		nativeOptionId: "option_regenerate",
		variant: "default",
	},
	{
		group: "generation",
		icon: StepForward,
		key: "continue",
		kind: "native-option",
		labelKey: "sendForm.options.action.continue",
		nativeOptionId: "option_continue",
		variant: "default",
	},
	{
		group: "generation",
		icon: HatGlasses,
		key: "impersonate",
		kind: "native-option",
		labelKey: "sendForm.options.action.impersonate",
		nativeOptionId: "option_impersonate",
		variant: "default",
	},
	{
		group: "chat-session",
		icon: Users,
		key: "convert_to_group",
		kind: "native-option",
		labelKey: "sendForm.options.action.convertToGroup",
		nativeOptionId: "option_convert_to_group",
		variant: "default",
	},
	{
		group: "chat-session",
		icon: MessageCirclePlus,
		key: "start_new_chat",
		kind: "native-option",
		labelKey: "sendForm.options.action.startNewChat",
		nativeOptionId: "option_start_new_chat",
		variant: "default",
	},
	{
		group: "chat-session",
		icon: Contact,
		key: "manage_chat_files",
		kind: "native-option",
		labelKey: "sendForm.options.action.manageChatFiles",
		nativeOptionId: "option_select_chat",
		variant: "default",
	},
	{
		group: "chat-session",
		icon: X,
		key: "close_chat",
		kind: "native-option",
		labelKey: "sendForm.options.action.closeChat",
		nativeOptionId: "option_close_chat",
		variant: "default",
	},
	{
		group: "danger-zone",
		icon: MessageCircleX,
		key: "delete_messages",
		kind: "native-option",
		labelKey: "sendForm.options.action.deleteMessages",
		nativeOptionId: "option_delete_mes",
		variant: "destructive",
	},
	{
		command: "/delchat",
		confirmTitleKey: "sendForm.options.action.deleteChatConfirm",
		group: "danger-zone",
		icon: Trash2,
		key: "delete_chat",
		kind: "slash-command",
		labelKey: "sendForm.options.action.deleteChat",
		requiresActiveChat: true,
		variant: "destructive",
	},
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getContextSafe(): StContextLike | null {
	try {
		const context = getStContext();
		return isRecord(context) ? (context as StContextLike) : null;
	} catch {
		return null;
	}
}

function isElementVisible(element: HTMLElement): boolean {
	if (
		!element.isConnected ||
		element.classList.contains("displayNone") ||
		element.hasAttribute("hidden")
	) {
		return false;
	}

	if (
		typeof window === "undefined" ||
		typeof window.getComputedStyle !== "function"
	) {
		return true;
	}

	const style = window.getComputedStyle(element);
	return style.display !== "none" && style.visibility !== "hidden";
}

function getNativeOptionElements(
	nativeOptionId: string,
	documentRef: Document,
): HTMLElement[] {
	return Array.from(
		documentRef.querySelectorAll<HTMLElement>(
			`#${NATIVE_OPTIONS_ROOT_ID} [id="${nativeOptionId}"]`,
		),
	);
}

function hasNativeOption(nativeOptionId: string, documentRef: Document) {
	return getNativeOptionElements(nativeOptionId, documentRef).length > 0;
}

function hasVisibleNativeOption(nativeOptionId: string, documentRef: Document) {
	return getNativeOptionElements(nativeOptionId, documentRef).some(
		(element) => isElementVisible(element),
	);
}

function resolveCharacterHasChat(context: StContextLike): boolean {
	const characters = context.characters;
	if (!Array.isArray(characters)) {
		return false;
	}

	const numericCharacterId =
		typeof context.characterId === "number"
			? context.characterId
			: Number.parseInt(String(context.characterId ?? ""), 10);

	if (!Number.isFinite(numericCharacterId) || numericCharacterId < 0) {
		return false;
	}

	const characterRecord = characters[numericCharacterId];
	if (!isRecord(characterRecord)) {
		return false;
	}

	return (
		typeof characterRecord.chat === "string" &&
		characterRecord.chat.trim().length > 0
	);
}

function resolveCheckpointVisibility(
	context: StContextLike | null,
): CheckpointVisibilityState {
	try {
		if (!context) {
			return {
				backToParent: false,
				convertToGroup: false,
				saveCheckpoint: false,
			};
		}

		const inGroupChat = context.groupId != null;
		const metadata = isRecord(context.chatMetadata)
			? context.chatMetadata
			: {};
		const hasMainChat =
			typeof metadata.main_chat === "string" &&
			metadata.main_chat.trim().length > 0;
		const characterHasChat = resolveCharacterHasChat(context);
		const convertToGroup = !inGroupChat;

		if (hasMainChat) {
			return {
				backToParent: true,
				convertToGroup,
				saveCheckpoint: true,
			};
		}

		if (!inGroupChat && !characterHasChat) {
			return {
				backToParent: false,
				convertToGroup,
				saveCheckpoint: false,
			};
		}

		return {
			backToParent: false,
			convertToGroup,
			saveCheckpoint: true,
		};
	} catch {
		return {
			backToParent: false,
			convertToGroup: false,
			saveCheckpoint: false,
		};
	}
}

function resolveActiveChatId(context: StContextLike | null) {
	const chatId = context?.chatId;
	return typeof chatId === "string" ? chatId.trim() : "";
}

function supportsSlashCommandActions(context: StContextLike | null) {
	if (!context) {
		return false;
	}

	return (
		typeof context.executeSlashCommandsWithOptions === "function" &&
		typeof context.Popup?.show?.confirm === "function"
	);
}

function resolveActionVisibility(
	action: MenuActionSeed,
	checkpoints: CheckpointVisibilityState,
	context: StContextLike | null,
	documentRef: Document,
) {
	if (action.kind === "slash-command") {
		return (
			supportsSlashCommandActions(context) &&
			(!action.requiresActiveChat ||
				resolveActiveChatId(context).length > 0)
		);
	}

	switch (action.key) {
		case "save_checkpoint":
			return checkpoints.saveCheckpoint;
		case "back_to_parent_chat":
			return checkpoints.backToParent;
		case "convert_to_group":
			return checkpoints.convertToGroup;
		default:
			return hasVisibleNativeOption(action.nativeOptionId, documentRef);
	}
}

export function buildMobileSendFormMenuGroups({
	documentRef = document,
}: {
	documentRef?: Document;
} = {}): MobileSendFormMenuGroupDescriptor[] {
	const context = getContextSafe();
	const checkpoints = resolveCheckpointVisibility(context);

	const actions = MENU_ACTIONS.map(
		(action): MobileSendFormMenuActionDescriptor => {
			const isVisible = resolveActionVisibility(
				action,
				checkpoints,
				context,
				documentRef,
			);
			const isEnabled =
				action.kind === "native-option"
					? isVisible &&
						hasNativeOption(action.nativeOptionId, documentRef)
					: isVisible;

			if (action.kind === "native-option") {
				return {
					isEnabled,
					isVisible,
					group: action.group,
					icon: action.icon,
					key: action.key,
					kind: action.kind,
					label: translateAstra(action.labelKey),
					nativeOptionId: action.nativeOptionId,
					variant: action.variant,
				};
			}

			return {
				confirmTitle: translateAstra(action.confirmTitleKey),
				command: action.command,
				group: action.group,
				icon: action.icon,
				isEnabled: isVisible,
				isVisible,
				key: action.key,
				kind: action.kind,
				label: translateAstra(action.labelKey),
				requiresActiveChat: action.requiresActiveChat,
				variant: action.variant,
			};
		},
	).filter((action) => action.isVisible);

	return GROUP_ORDER.map((groupKey) => {
		return {
			actions: actions.filter((action) => action.group === groupKey),
			key: groupKey,
			label: translateAstra(GROUP_LABELS[groupKey]),
		};
	}).filter((group) => group.actions.length > 0);
}

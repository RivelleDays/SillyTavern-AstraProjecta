import type { LucideIcon } from "@/components/ui/shared/icons";

export type MobileSendFormMenuGroupKey =
	| "prompt-panels"
	| "checkpoints"
	| "generation"
	| "chat-session"
	| "danger-zone";

export type MobileSendFormMenuActionKey =
	| "author_note"
	| "cfg_scale"
	| "token_probabilities"
	| "save_checkpoint"
	| "back_to_parent_chat"
	| "regenerate"
	| "continue"
	| "impersonate"
	| "convert_to_group"
	| "start_new_chat"
	| "manage_chat_files"
	| "close_chat"
	| "delete_messages"
	| "delete_chat";

interface MobileSendFormMenuActionBase {
	group: MobileSendFormMenuGroupKey;
	icon: LucideIcon;
	isEnabled: boolean;
	isVisible: boolean;
	key: MobileSendFormMenuActionKey;
	label: string;
	variant: "default" | "destructive";
}

export interface MobileSendFormNativeOptionAction extends MobileSendFormMenuActionBase {
	kind: "native-option";
	nativeOptionId: string;
}

export interface MobileSendFormSlashCommandAction extends MobileSendFormMenuActionBase {
	command: string;
	confirmTitle: string;
	kind: "slash-command";
	requiresActiveChat: boolean;
}

export type MobileSendFormMenuActionDescriptor =
	| MobileSendFormNativeOptionAction
	| MobileSendFormSlashCommandAction;

export interface MobileSendFormMenuGroupDescriptor {
	actions: MobileSendFormMenuActionDescriptor[];
	key: MobileSendFormMenuGroupKey;
	label: string;
}

import * as React from "react";

import { Button } from "@/components/ui/shadcn/button";
import { UiIcon } from "@/components/ui/shared/icon";
import { Keyboard, MessageCircleReply } from "@/components/ui/shared/icons";
import { MOBILE_SEND_FORM_QUICK_REPLY_TOGGLE_ID } from "@/packages/features/chat-session/send-form/contracts/dom";

export interface MobileSendFormQuickReplyToggleButtonProps {
	className: string;
	isQuickReplyHostVisible: boolean;
	label: string;
	onClick(): void;
}

export function MobileSendFormQuickReplyToggleButton({
	className,
	isQuickReplyHostVisible,
	label,
	onClick,
}: MobileSendFormQuickReplyToggleButtonProps) {
	const QuickReplyToggleIcon = isQuickReplyHostVisible
		? Keyboard
		: MessageCircleReply;

	return (
		<Button
			aria-label={label}
			id={MOBILE_SEND_FORM_QUICK_REPLY_TOGGLE_ID}
			className={className}
			size="icon-sm"
			type="button"
			variant="ghost"
			onClick={onClick}
		>
			<UiIcon aria-hidden={true} icon={QuickReplyToggleIcon} size="md" />
		</Button>
	);
}

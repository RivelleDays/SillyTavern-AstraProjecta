import * as React from "react";

import { Separator } from "@/components/ui/shadcn/separator";

type MobileChatMainMenuDrawerDetailRow = {
	key: string;
	node: React.ReactElement;
};

// Keep the existing catalog entries reserved until a future visibility mode reuses
// them; the i18n pipeline rejects dead keys in locales/en.json.
const MOBILE_CHAT_MAIN_MENU_RESERVED_DETAIL_COPY_KEYS = [
	"sendForm.mainMenu.details.less",
	"sendForm.mainMenu.details.more",
] as const;

void MOBILE_CHAT_MAIN_MENU_RESERVED_DETAIL_COPY_KEYS;

function renderDetailRows(rows: MobileChatMainMenuDrawerDetailRow[]) {
	return rows.map(({ key, node }, index) => (
		<React.Fragment key={key}>
			{index > 0 ? (
				<Separator className="mobile-chat-main-menu-drawer__detail-separator" />
			) : null}
			{node}
		</React.Fragment>
	));
}

export function MobileChatMainMenuDrawerDetails({
	helperText,
	rows,
}: {
	helperText: string;
	rows: MobileChatMainMenuDrawerDetailRow[];
}) {
	if (rows.length === 0) {
		return null;
	}

	return (
		<div className="mobile-chat-main-menu-drawer__detail-section">
			{renderDetailRows(rows)}
			{helperText ? (
				<>
					<Separator className="mobile-chat-main-menu-drawer__detail-separator" />
					<p
						aria-live="polite"
						className="mobile-chat-main-menu-drawer__detail-helper"
					>
						{helperText}
					</p>
				</>
			) : null}
		</div>
	);
}

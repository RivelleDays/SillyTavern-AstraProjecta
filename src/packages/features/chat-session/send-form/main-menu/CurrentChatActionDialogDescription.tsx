import * as React from "react";

export function CurrentChatActionDialogDescription({
	chatFileName,
	text,
}: {
	chatFileName: string;
	text: string;
}) {
	return (
		<div className="astra-dialog-current-chat-file-description">
			<span>{`${text} `}</span>
			<span className="astra-dialog-current-chat-file-token">
				<span className="astra-dialog-current-chat-file-name">
					{chatFileName || "-"}
				</span>
				.
			</span>
		</div>
	);
}

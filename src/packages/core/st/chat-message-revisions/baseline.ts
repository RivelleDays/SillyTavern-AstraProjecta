export type RevisionBaselineMessage = Record<string, unknown> & {
	mes?: unknown;
	swipe_id?: unknown;
	swipes?: unknown;
};

export interface RevisionBaselineTracker<
	TMessage extends RevisionBaselineMessage,
> {
	readFirstObservedMessageTexts(
		message: TMessage,
		messageId: number,
	): string[];
	seedChatBaselines(chat: unknown[]): void;
	seedMessageBaseline(message: TMessage | null, messageId: number): void;
}

export function createRevisionBaselineTracker<
	TMessage extends RevisionBaselineMessage,
>({
	asMessage,
	isValidMessageText,
	readMessageTextFromDom,
}: {
	asMessage(value: unknown): TMessage | null;
	isValidMessageText(value: unknown): value is string;
	readMessageTextFromDom(messageId: number): string;
}): RevisionBaselineTracker<TMessage> {
	const firstObservedMessageTexts = new WeakMap<TMessage, string[]>();

	function asIndex(value: unknown): number {
		return typeof value === "number" &&
			Number.isInteger(value) &&
			value >= 0
			? value
			: 0;
	}

	function readMessageBaselineText(
		message: TMessage,
		messageId: number,
		swipeIndex: number,
		activeSwipeIndex: number,
	): string {
		if (
			Array.isArray(message.swipes) &&
			isValidMessageText(message.swipes[swipeIndex])
		) {
			return message.swipes[swipeIndex];
		}

		if (swipeIndex !== activeSwipeIndex) {
			return "";
		}

		if (isValidMessageText(message.mes)) {
			return message.mes;
		}

		const domText = readMessageTextFromDom(messageId);
		return isValidMessageText(domText) ? domText : "";
	}

	function readCurrentMessageBaselineTexts(
		message: TMessage,
		messageId: number,
	): string[] {
		const activeSwipeIndex = asIndex(message.swipe_id);
		const swipeTotal =
			Array.isArray(message.swipes) && message.swipes.length > 0
				? message.swipes.length
				: 1;

		return Array.from({ length: swipeTotal }, (_, swipeIndex) =>
			readMessageBaselineText(
				message,
				messageId,
				swipeIndex,
				activeSwipeIndex,
			),
		);
	}

	function seedMessageBaseline(
		message: TMessage | null,
		messageId: number,
	): void {
		if (!message || firstObservedMessageTexts.has(message)) {
			return;
		}

		firstObservedMessageTexts.set(
			message,
			readCurrentMessageBaselineTexts(message, messageId),
		);
	}

	return {
		readFirstObservedMessageTexts(message, messageId) {
			seedMessageBaseline(message, messageId);
			return firstObservedMessageTexts.get(message) ?? [];
		},
		seedChatBaselines(chat) {
			chat.forEach((entry, messageId) => {
				seedMessageBaseline(asMessage(entry), messageId);
			});
		},
		seedMessageBaseline,
	};
}

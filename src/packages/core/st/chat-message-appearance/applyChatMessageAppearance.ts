import { CHAT_TIMELINE_HIDDEN_BODY_CLASS } from "@/packages/core/constants";
import {
	createChatMessageAppearanceStore,
	type ChatMessageLineHeight,
	type ChatMessageTextAlign,
} from "@/packages/core/st/chat-message-appearance";

const LINE_HEIGHT_CSS_VAR = "--astra-mes-line-height";
const TEXT_ALIGN_CSS_VAR = "--astra-mes-text-align";

const LINE_HEIGHT_VALUE: Record<ChatMessageLineHeight, string> = {
	sm: "calc(var(--mainFontSize) + 0.4rem)",
	md: "calc(var(--mainFontSize) + 0.6rem)",
	lg: "calc(var(--mainFontSize) + 0.8rem)",
};

interface ChatMessageAppearanceStoreLike {
	getSnapshot(): {
		lineHeight: ChatMessageLineHeight;
		showTimeline: boolean;
		textAlign: ChatMessageTextAlign;
	};
}

export interface ChatMessageAppearanceObservableStore extends ChatMessageAppearanceStoreLike {
	dispose(): void;
	subscribe(listener: () => void): () => void;
}

export interface ChatMessageAppearanceRuntimeBridge {
	dispose(): void;
	store: ChatMessageAppearanceObservableStore;
}

export function applyChatMessageAppearanceVariables({
	documentRef = document,
	store,
}: {
	documentRef?: Document;
	store: ChatMessageAppearanceStoreLike;
}) {
	const snapshot = store.getSnapshot();
	documentRef.body?.style.setProperty(
		LINE_HEIGHT_CSS_VAR,
		LINE_HEIGHT_VALUE[snapshot.lineHeight],
	);
	documentRef.body?.style.setProperty(TEXT_ALIGN_CSS_VAR, snapshot.textAlign);
	documentRef.body?.classList.toggle(
		CHAT_TIMELINE_HIDDEN_BODY_CLASS,
		!snapshot.showTimeline,
	);
}

export function createChatMessageAppearanceRuntimeBridge({
	createStore = createChatMessageAppearanceStore,
	documentRef = document,
}: {
	createStore?: () => ChatMessageAppearanceObservableStore;
	documentRef?: Document;
} = {}): ChatMessageAppearanceRuntimeBridge {
	const store = createStore();
	applyChatMessageAppearanceVariables({ documentRef, store });
	const unsubscribe = store.subscribe(() => {
		applyChatMessageAppearanceVariables({ documentRef, store });
	});

	return {
		dispose() {
			unsubscribe();
			store.dispose();
		},
		store,
	};
}

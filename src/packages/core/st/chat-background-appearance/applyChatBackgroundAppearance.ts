import { createChatBackgroundAppearanceStore } from "@/packages/core/st/chat-background-appearance";

const BLUR_CSS_VAR = "--astra-chat-bg-blur";
const OPACITY_CSS_VAR = "--astra-chat-bg-opacity";

interface ChatBackgroundAppearanceStoreLike {
	getSnapshot(): { blurPx: number; opacityPercent: number };
}

export interface ChatBackgroundAppearanceObservableStore
	extends ChatBackgroundAppearanceStoreLike {
	dispose(): void;
	subscribe(listener: () => void): () => void;
}

export interface ChatBackgroundAppearanceRuntimeBridge {
	dispose(): void;
	store: ChatBackgroundAppearanceObservableStore;
}

export function applyChatBackgroundAppearanceVariables({
	documentRef = document,
	store,
}: {
	documentRef?: Document;
	store: ChatBackgroundAppearanceStoreLike;
}) {
	const snapshot = store.getSnapshot();
	documentRef.body?.style.setProperty(BLUR_CSS_VAR, `${snapshot.blurPx}px`);
	documentRef.body?.style.setProperty(
		OPACITY_CSS_VAR,
		`${snapshot.opacityPercent / 100}`,
	);
}

export function createChatBackgroundAppearanceRuntimeBridge({
	createStore = createChatBackgroundAppearanceStore,
	documentRef = document,
}: {
	createStore?: () => ChatBackgroundAppearanceObservableStore;
	documentRef?: Document;
} = {}): ChatBackgroundAppearanceRuntimeBridge {
	const store = createStore();
	applyChatBackgroundAppearanceVariables({ documentRef, store });
	const unsubscribe = store.subscribe(() => {
		applyChatBackgroundAppearanceVariables({ documentRef, store });
	});

	return {
		dispose() {
			unsubscribe();
			store.dispose();
		},
		store,
	};
}

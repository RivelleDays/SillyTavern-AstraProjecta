import { createFrameScheduler } from "@/packages/features/chat-session/message-actions/frameScheduler";

export interface ChatDomReconciler {
	start(): void;
	stop(): void;
}

export function createChatDomReconciler({
	documentRef = document,
	onReconcile,
}: {
	documentRef?: Document;
	onReconcile(): void;
}): ChatDomReconciler {
	const scheduler = createFrameScheduler({
		callback: onReconcile,
		documentRef,
	});
	let observer: MutationObserver | null = null;

	function start() {
		if (observer) {
			return;
		}

		const chatRoot = documentRef.getElementById("chat");
		const view = documentRef.defaultView;
		if (!chatRoot || !view?.MutationObserver) {
			return;
		}

		observer = new view.MutationObserver(() => {
			scheduler.schedule();
		});
		observer.observe(chatRoot, {
			childList: true,
		});
	}

	function stop() {
		observer?.disconnect();
		observer = null;
		scheduler.cancel();
	}

	return {
		start,
		stop,
	};
}

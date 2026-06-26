import { createFrameScheduler } from "@/packages/features/chat-session/message-actions/frameScheduler";

export interface ChatDomReconciler {
	start(): void;
	stop(): void;
}

function isMessageElement(node: Node): boolean {
	return (
		node instanceof Element &&
		node.classList.contains("mes") &&
		node.hasAttribute("mesid")
	);
}

function nodeContainsMessage(node: Node): boolean {
	return (
		isMessageElement(node) ||
		(node instanceof Element && Boolean(node.querySelector(".mes[mesid]")))
	);
}

export function shouldReconcileChatDomForMutations(
	mutations: MutationRecord[],
): boolean {
	return mutations.some((mutation) => {
		if (mutation.type !== "childList") {
			return false;
		}

		return [...mutation.addedNodes, ...mutation.removedNodes].some(
			nodeContainsMessage,
		);
	});
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

		observer = new view.MutationObserver((mutations) => {
			if (shouldReconcileChatDomForMutations(mutations)) {
				scheduler.schedule();
			}
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

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

function isMessageStructureElement(node: Node): boolean {
	return (
		node instanceof Element &&
		(isMessageElement(node) ||
			node.classList.contains("mes_block") ||
			node.classList.contains("mes_text"))
	);
}

function nodeContainsMessageStructure(node: Node): boolean {
	if (!(node instanceof Element)) {
		return false;
	}

	return (
		isMessageStructureElement(node) ||
		Boolean(node.querySelector(".mes[mesid], .mes_block, .mes_text"))
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
			nodeContainsMessageStructure,
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
			subtree: true,
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

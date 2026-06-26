import type { ReactNode } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";

import { withAstraErrorBoundary } from "@/packages/core/runtime/AstraErrorBoundary";
import type { LoadedMessageElement } from "@/packages/features/chat-session/message-actions/contracts/dom";

const MESSAGE_HEADER_ACTIONS_CLASS = "astra-mesHeaderActions";
const MESSAGE_HEADER_ACTIONS_COMPONENT = "mes-header-actions";

interface HeaderActionRootState {
	host: HTMLDivElement;
	messageElement: Element;
	root: Root;
}

export interface MessageHeaderActionRoots {
	render(loadedMessages: LoadedMessageElement[]): void;
	unmountAll(): void;
}

function findDirectMessageHeader(
	messageElement: Element,
): HTMLDivElement | null {
	for (const child of Array.from(messageElement.children)) {
		if (
			child instanceof HTMLDivElement &&
			child.classList.contains("astra-mesHeader")
		) {
			return child;
		}
	}

	return null;
}

function findDirectHeaderActionsHost(
	headerElement: Element,
): HTMLDivElement | null {
	for (const child of Array.from(headerElement.children)) {
		if (
			child instanceof HTMLDivElement &&
			child.classList.contains(MESSAGE_HEADER_ACTIONS_CLASS) &&
			child.dataset.astraComponent === MESSAGE_HEADER_ACTIONS_COMPONENT
		) {
			return child;
		}
	}

	return null;
}

function ensureHeaderActionsHost(
	messageElement: Element,
): HTMLDivElement | null {
	const headerElement = findDirectMessageHeader(messageElement);
	if (!headerElement) {
		return null;
	}

	const existingHost = findDirectHeaderActionsHost(headerElement);
	if (existingHost) {
		return existingHost;
	}

	const host = messageElement.ownerDocument.createElement("div");
	host.className = MESSAGE_HEADER_ACTIONS_CLASS;
	host.dataset.astraComponent = MESSAGE_HEADER_ACTIONS_COMPONENT;
	headerElement.appendChild(host);
	return host;
}

export function createMessageHeaderActionRoots({
	renderActions,
}: {
	renderActions(messageId: number): ReactNode;
}): MessageHeaderActionRoots {
	const roots = new Map<number, HeaderActionRootState>();

	function unmount(messageId: number) {
		const state = roots.get(messageId);
		if (!state) {
			return;
		}

		state.root.unmount();
		state.host.remove();
		roots.delete(messageId);
	}

	function unmountAll() {
		for (const messageId of Array.from(roots.keys())) {
			unmount(messageId);
		}
	}

	return {
		render(loadedMessages) {
			const nextMessageIds = new Set(
				loadedMessages.map(({ messageId }) => messageId),
			);

			for (const [messageId, state] of Array.from(roots)) {
				if (
					!nextMessageIds.has(messageId) ||
					!state.messageElement.isConnected ||
					!state.host.isConnected
				) {
					unmount(messageId);
				}
			}

			for (const { messageElement, messageId } of loadedMessages) {
				const host = ensureHeaderActionsHost(messageElement);
				if (!host) {
					unmount(messageId);
					continue;
				}

				let state = roots.get(messageId);
				if (
					!state ||
					state.host !== host ||
					state.messageElement !== messageElement
				) {
					unmount(messageId);
					state = {
						host,
						messageElement,
						root: createRoot(host),
					};
					roots.set(messageId, state);
				}

				state.root.render(
					withAstraErrorBoundary({
						children: renderActions(messageId),
						source: "message-header-actions",
					}),
				);
			}
		},
		unmountAll,
	};
}

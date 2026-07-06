export interface MessageDrawerHandoffScheduler {
	cancel(): void;
	schedule(callback: () => void): void;
}

export function createMessageDrawerHandoffScheduler({
	documentRef = document,
}: {
	documentRef?: Document;
} = {}): MessageDrawerHandoffScheduler {
	let frameId: number | null = null;

	function cancel() {
		if (frameId === null) {
			return;
		}

		const view = documentRef.defaultView;
		if (typeof view?.cancelAnimationFrame === "function") {
			view.cancelAnimationFrame(frameId);
		}
		frameId = null;
	}

	return {
		cancel,
		schedule(callback) {
			cancel();
			const view = documentRef.defaultView;
			if (typeof view?.requestAnimationFrame === "function") {
				frameId = view.requestAnimationFrame(() => {
					frameId = null;
					callback();
				});
				return;
			}

			callback();
		},
	};
}

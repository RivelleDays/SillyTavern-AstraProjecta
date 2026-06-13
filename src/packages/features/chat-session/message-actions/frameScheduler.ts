export interface FrameScheduler {
	cancel(): void;
	isScheduled(): boolean;
	schedule(): void;
}

export function createFrameScheduler({
	callback,
	documentRef = document,
}: {
	callback(): void;
	documentRef?: Document;
}): FrameScheduler {
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

	function runFrame() {
		frameId = null;
		callback();
	}

	return {
		cancel,
		isScheduled() {
			return frameId !== null;
		},
		schedule() {
			if (frameId !== null) {
				return;
			}

			const view = documentRef.defaultView;
			if (typeof view?.requestAnimationFrame === "function") {
				frameId = view.requestAnimationFrame(runFrame);
				return;
			}

			callback();
		},
	};
}

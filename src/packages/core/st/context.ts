import { EXTENSION_LOG_PREFIX } from "@/packages/core/constants";

interface SillyTavernLike {
	getContext?: () => unknown;
}

function getSillyTavernApi(): SillyTavernLike | undefined {
	return (globalThis as typeof globalThis & { SillyTavern?: SillyTavernLike })
		.SillyTavern;
}

export function getStContext(): unknown {
	const sillyTavern = getSillyTavernApi();

	if (!sillyTavern || typeof sillyTavern.getContext !== "function") {
		throw new Error(
			`${EXTENSION_LOG_PREFIX} SillyTavern context is unavailable.`,
		);
	}

	return sillyTavern.getContext();
}

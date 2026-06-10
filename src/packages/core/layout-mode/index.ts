import { EXTENSION_SETTINGS_KEY } from "@/packages/core/constants";

export const AUTO_LAYOUT_MODE_MEDIA_QUERY = "screen and (max-width: 1000px)";
export const DEFAULT_LAYOUT_MODE_PREFERENCE = "auto";
export const LAYOUT_MODE_PREFERENCE_SETTING_KEY = "layout_mode_preference";
export const LAYOUT_MODE_PREFERENCE_SETTINGS_PATH = `${EXTENSION_SETTINGS_KEY}.${LAYOUT_MODE_PREFERENCE_SETTING_KEY}`;

export type LayoutModePreference = "auto" | "force-mobile" | "force-desktop";

export type ResolvedLayoutMode = "mobile" | "desktop";

export interface LayoutModeSnapshot {
	matchesAutoModeMediaQuery: boolean;
	mediaQuery: string;
	preference: LayoutModePreference;
	resolvedMode: ResolvedLayoutMode;
}

export interface LayoutModeStore {
	dispose(): void;
	getSnapshot(): LayoutModeSnapshot;
	subscribe(listener: () => void): () => void;
	sync(): void;
}

interface MatchMediaLike {
	addEventListener?: (
		type: "change",
		listener: (event: MediaQueryListEvent) => void,
	) => void;
	addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
	matches: boolean;
	removeEventListener?: (
		type: "change",
		listener: (event: MediaQueryListEvent) => void,
	) => void;
	removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
}

export interface LayoutModeWindowLike {
	matchMedia?: (query: string) => MatchMediaLike;
}

function areSnapshotsEqual(
	left: LayoutModeSnapshot,
	right: LayoutModeSnapshot,
): boolean {
	return (
		left.matchesAutoModeMediaQuery === right.matchesAutoModeMediaQuery &&
		left.mediaQuery === right.mediaQuery &&
		left.preference === right.preference &&
		left.resolvedMode === right.resolvedMode
	);
}

export function normalizeLayoutModePreference(
	preference: unknown,
): LayoutModePreference {
	if (preference === "force-mobile" || preference === "force-desktop") {
		return preference;
	}

	return DEFAULT_LAYOUT_MODE_PREFERENCE;
}

export function resolveLayoutMode({
	matchesAutoModeMediaQuery,
	preference,
}: {
	matchesAutoModeMediaQuery: boolean;
	preference: LayoutModePreference;
}): ResolvedLayoutMode {
	if (preference === "force-mobile") {
		return "mobile";
	}

	if (preference === "force-desktop") {
		return "desktop";
	}

	return matchesAutoModeMediaQuery ? "mobile" : "desktop";
}

export function createLayoutModeStore({
	getPreference = () => DEFAULT_LAYOUT_MODE_PREFERENCE,
	mediaQuery = AUTO_LAYOUT_MODE_MEDIA_QUERY,
	windowRef = typeof window === "undefined" ? undefined : window,
}: {
	getPreference?: () => unknown;
	mediaQuery?: string;
	windowRef?: LayoutModeWindowLike;
} = {}): LayoutModeStore {
	const listeners = new Set<() => void>();
	const mediaQueryList =
		typeof windowRef?.matchMedia === "function"
			? windowRef.matchMedia(mediaQuery)
			: null;

	const computeSnapshot = (): LayoutModeSnapshot => {
		const preference = normalizeLayoutModePreference(getPreference());
		const matchesAutoModeMediaQuery = mediaQueryList?.matches ?? false;

		return {
			matchesAutoModeMediaQuery,
			mediaQuery,
			preference,
			resolvedMode: resolveLayoutMode({
				matchesAutoModeMediaQuery,
				preference,
			}),
		};
	};

	let snapshot = computeSnapshot();

	const emitIfChanged = () => {
		const nextSnapshot = computeSnapshot();

		if (areSnapshotsEqual(snapshot, nextSnapshot)) {
			return;
		}

		snapshot = nextSnapshot;

		for (const listener of listeners) {
			listener();
		}
	};

	const handleMediaQueryChange = () => {
		if (snapshot.preference !== "auto") {
			return;
		}

		emitIfChanged();
	};

	if (mediaQueryList) {
		if (typeof mediaQueryList.addEventListener === "function") {
			mediaQueryList.addEventListener("change", handleMediaQueryChange);
		} else {
			mediaQueryList.addListener?.(handleMediaQueryChange);
		}
	}

	return {
		dispose() {
			listeners.clear();

			if (!mediaQueryList) {
				return;
			}

			if (typeof mediaQueryList.removeEventListener === "function") {
				mediaQueryList.removeEventListener(
					"change",
					handleMediaQueryChange,
				);
				return;
			}

			mediaQueryList.removeListener?.(handleMediaQueryChange);
		},
		getSnapshot() {
			return snapshot;
		},
		subscribe(listener) {
			listeners.add(listener);

			return () => {
				listeners.delete(listener);
			};
		},
		sync() {
			emitIfChanged();
		},
	};
}

let defaultLayoutModePreferenceReader: () => unknown = () =>
	DEFAULT_LAYOUT_MODE_PREFERENCE;
let defaultLayoutModeStore: LayoutModeStore | null = null;

export function getDefaultLayoutModeStore({
	windowRef = typeof window === "undefined" ? undefined : window,
}: {
	windowRef?: LayoutModeWindowLike;
} = {}): LayoutModeStore {
	if (!defaultLayoutModeStore) {
		defaultLayoutModeStore = createLayoutModeStore({
			getPreference: () => defaultLayoutModePreferenceReader(),
			windowRef,
		});
	}

	return defaultLayoutModeStore;
}

export function setDefaultLayoutModePreferenceReader(
	reader: () => unknown,
): void {
	defaultLayoutModePreferenceReader = reader;
	defaultLayoutModeStore?.sync();
}

export function resetDefaultLayoutModeStoreForTests(): void {
	defaultLayoutModeStore?.dispose();
	defaultLayoutModeStore = null;
	defaultLayoutModePreferenceReader = () => DEFAULT_LAYOUT_MODE_PREFERENCE;
}

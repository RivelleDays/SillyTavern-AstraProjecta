export interface MountableRuntimeFeature {
	mount(): void;
	unmount(): void;
}

export interface RuntimeCleanupOptions {
	onCleanupError?: (
		error: unknown,
		feature?: MountableRuntimeFeature,
	) => void;
}

export function unmountFeaturesSafely(
	features: readonly MountableRuntimeFeature[],
	{ onCleanupError }: RuntimeCleanupOptions = {},
): void {
	for (const feature of [...features].reverse()) {
		try {
			feature.unmount();
		} catch (error) {
			onCleanupError?.(error, feature);
		}
	}
}

export function mountFeaturesTransactionally(
	features: readonly MountableRuntimeFeature[],
	options: RuntimeCleanupOptions = {},
): void {
	const mounted: MountableRuntimeFeature[] = [];

	try {
		for (const feature of features) {
			feature.mount();
			mounted.push(feature);
		}
	} catch (error) {
		unmountFeaturesSafely(mounted, options);
		throw error;
	}
}

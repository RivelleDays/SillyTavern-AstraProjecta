import { getStContext } from "@/packages/core/st/context";
import { isRecord } from "@/packages/core/st/shared";

export type CharacterLibraryOpenResult =
	| {
			kind: "opened";
			method:
				| "execute-slash-command"
				| "launcher-dropdown-item"
				| "slash-command-callback"
				| "top-bar-button";
	  }
	| {
			kind: "missing";
	  };

interface CharacterLibraryOpenOptions {
	documentRef?: Document;
}

type GallerySlashCommand = {
	callback?: unknown;
};

type StContextLike = {
	SlashCommandParser?: {
		commands?: Record<string, GallerySlashCommand | undefined>;
	};
	executeSlashCommandsWithOptions?: unknown;
};

function resolveContextSafe(): StContextLike | null {
	try {
		const context = getStContext();
		return isRecord(context) ? (context as StContextLike) : null;
	} catch {
		return null;
	}
}

function getCharacterLibraryTopBarButton(
	documentRef: Document | undefined,
): HTMLElement | null {
	const button = documentRef?.getElementById("st-gallery-btn");
	return button instanceof HTMLElement ? button : null;
}

// With Character Library's "Show launcher dropdown" enabled, the standalone
// top-bar button is removed and CL is reached through its launcher dropdown's
// library item instead; clicking that item is CL's own user-facing entry point.
function getCharacterLibraryLauncherDropdownItem(
	documentRef: Document | undefined,
): HTMLElement | null {
	const item = documentRef?.querySelector(
		"#charlib-launcher-dropdown [data-action='library']",
	);
	return item instanceof HTMLElement ? item : null;
}

function getGallerySlashCommand(
	context: StContextLike | null,
): GallerySlashCommand | null {
	const command = context?.SlashCommandParser?.commands?.gallery;
	return isRecord(command) ? command : null;
}

export function openCharacterLibrary({
	documentRef = document,
}: CharacterLibraryOpenOptions = {}): CharacterLibraryOpenResult {
	const topBarButton = getCharacterLibraryTopBarButton(documentRef);
	if (topBarButton) {
		topBarButton.click();
		return {
			kind: "opened",
			method: "top-bar-button",
		};
	}

	const launcherDropdownItem =
		getCharacterLibraryLauncherDropdownItem(documentRef);
	if (launcherDropdownItem) {
		launcherDropdownItem.click();
		return {
			kind: "opened",
			method: "launcher-dropdown-item",
		};
	}

	const context = resolveContextSafe();
	const galleryCommand = getGallerySlashCommand(context);
	const callback = galleryCommand?.callback;
	if (typeof callback === "function") {
		callback({}, "");
		return {
			kind: "opened",
			method: "slash-command-callback",
		};
	}

	const executeSlashCommandsWithOptions =
		context?.executeSlashCommandsWithOptions;
	if (
		galleryCommand &&
		typeof executeSlashCommandsWithOptions === "function"
	) {
		executeSlashCommandsWithOptions("/gallery");
		return {
			kind: "opened",
			method: "execute-slash-command",
		};
	}

	return {
		kind: "missing",
	};
}

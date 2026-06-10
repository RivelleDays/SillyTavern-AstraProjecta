export const ASTRA_PROJECTA_UI_ROOT_ATTR = "data-astra-projecta-ui-root";
export const ASTRA_PROJECTA_ROOT_ID = "astra-projecta-root";
export const ASTRA_PROJECTA_PORTAL_ID = "astra-projecta-ui-portals";

export function markAstraProjectaUiRoot<T extends HTMLElement>(element: T): T {
	element.setAttribute(ASTRA_PROJECTA_UI_ROOT_ATTR, "");
	element.classList.add("dark");
	return element;
}

export function ensureAstraProjectaUiInfrastructure({
	documentRef = document,
}: {
	documentRef?: Document;
} = {}): HTMLDivElement | null {
	if (typeof document === "undefined") {
		return null;
	}

	let rootElement = documentRef.getElementById(ASTRA_PROJECTA_ROOT_ID);
	if (!(rootElement instanceof HTMLDivElement)) {
		rootElement = documentRef.createElement("div");
		rootElement.id = ASTRA_PROJECTA_ROOT_ID;
		markAstraProjectaUiRoot(rootElement);
		(documentRef.body ?? documentRef.documentElement).appendChild(
			rootElement,
		);
	} else {
		markAstraProjectaUiRoot(rootElement);
	}

	let portalElement: HTMLDivElement | null = documentRef.getElementById(
		ASTRA_PROJECTA_PORTAL_ID,
	) as HTMLDivElement | null;
	if (!(portalElement instanceof HTMLDivElement)) {
		portalElement = documentRef.createElement("div");
		portalElement.id = ASTRA_PROJECTA_PORTAL_ID;
		rootElement.appendChild(portalElement);
	}

	return portalElement;
}

export function getAstraProjectaPortalContainer(): HTMLElement | null {
	if (typeof document === "undefined") {
		return null;
	}

	return document.getElementById(ASTRA_PROJECTA_PORTAL_ID);
}

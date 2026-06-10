import {
	persistStoredPersonaManagementTabValue,
	readStoredPersonaManagementTabValue,
	type StoredPersonaManagementTabValue,
} from "@/packages/features/sillytavern-interface/routes/subheaderStorage";

export type PersonaManagementTabValue = StoredPersonaManagementTabValue;

export const PERSONA_MANAGEMENT_PAGE_KEY = "persona-management";
const PERSONA_MANAGEMENT_TAB_VALUE_REQUEST_EVENT =
	"astra-projecta:persona-management-tab-value-request";

const requestedPersonaManagementTabValues = new WeakMap<
	Document,
	PersonaManagementTabValue
>();

export function getDefaultPersonaManagementDocumentRef(): Document | null {
	if (typeof document === "undefined") {
		return null;
	}

	return document;
}

export function isPersonaManagementSillyTavernInterfaceRoute(pageKey: string) {
	return pageKey === PERSONA_MANAGEMENT_PAGE_KEY;
}

function getPersonaManagementStorage(documentRef: Document | null) {
	return documentRef?.defaultView?.localStorage ?? null;
}

export function readPersonaManagementTabValue(
	documentRef: Document | null,
): PersonaManagementTabValue {
	if (!documentRef) {
		return "personas";
	}

	return (
		requestedPersonaManagementTabValues.get(documentRef) ??
		readStoredPersonaManagementTabValue(
			getPersonaManagementStorage(documentRef),
		)
	);
}

export function readPreferredPersonaManagementTabValue({
	documentRef,
}: {
	documentRef: Document | null;
}): PersonaManagementTabValue {
	return readPersonaManagementTabValue(documentRef);
}

export function requestPersonaManagementTabValue({
	documentRef,
	value,
}: {
	documentRef: Document | null;
	value: PersonaManagementTabValue;
}) {
	if (!documentRef) {
		return;
	}

	requestedPersonaManagementTabValues.set(documentRef, value);
	persistStoredPersonaManagementTabValue(
		getPersonaManagementStorage(documentRef),
		value,
	);
	documentRef.dispatchEvent(
		new CustomEvent<PersonaManagementTabValue>(
			PERSONA_MANAGEMENT_TAB_VALUE_REQUEST_EVENT,
			{
				detail: value,
			},
		),
	);
}

export function observePersonaManagementTabValue({
	documentRef,
	onValueChange,
}: {
	documentRef: Document;
	onValueChange(value: PersonaManagementTabValue): void;
}) {
	const handleValueChange = (event: Event) => {
		const { detail } = event as CustomEvent<PersonaManagementTabValue>;
		onValueChange(
			detail === "edit" || detail === "personas"
				? detail
				: readPersonaManagementTabValue(documentRef),
		);
	};

	documentRef.addEventListener(
		PERSONA_MANAGEMENT_TAB_VALUE_REQUEST_EVENT,
		handleValueChange as EventListener,
	);

	return () => {
		documentRef.removeEventListener(
			PERSONA_MANAGEMENT_TAB_VALUE_REQUEST_EVENT,
			handleValueChange as EventListener,
		);
	};
}

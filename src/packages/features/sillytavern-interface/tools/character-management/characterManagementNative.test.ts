import { describe, expect, test, vi } from "vitest";

import {
	CHARACTER_MANAGEMENT_ADVANCED_CLOSE_PENDING_ATTRIBUTE,
	closeNativeCharacterAdvancedPopup,
	closeNativeCharacterGallery,
	hideNativeCharacterAdvancedPopup,
	isCharacterAdvancedPopupVisible,
	observeCharacterManagementTabValue,
	openNativeCharacterAdvancedPopup,
	openNativeCharacterGallery,
	readCharacterManagementTabValue,
} from "@/packages/features/sillytavern-interface/tools/character-management/characterManagementNative";

describe("characterManagementNative", () => {
	test.each([
		{
			expectedVisible: true,
			opacity: "1",
			style: "display: flex; opacity: 1;",
		},
		{
			expectedVisible: false,
			opacity: "0",
			style: "display: flex; opacity: 0;",
		},
		{
			expectedVisible: false,
			opacity: "1",
			style: "display: none; opacity: 1;",
		},
	])(
		'treats the Advanced popup as $expectedVisible when styled with "$style"',
		({ expectedVisible, style }) => {
			document.body.innerHTML = `
                <div id="character-management-root">
                    <nav id="right-nav-panel" data-menu-type="characters"></nav>
                    <div id="character_popup" style="${style}"></div>
                </div>
            `;

			expect(isCharacterAdvancedPopupVisible(document)).toBe(
				expectedVisible,
			);
		},
	);

	test("falls back to the primary drawer tab when the Advanced popup is faded out but not yet display none", () => {
		document.body.innerHTML = `
            <div id="character-management-root">
                <nav id="right-nav-panel" data-menu-type="character_edit"></nav>
                <div id="character_popup" style="display: flex; opacity: 0;"></div>
            </div>
        `;

		expect(readCharacterManagementTabValue(document)).toBe("edit");
	});

	test("treats the Advanced popup as hidden while its panel close marker is present", () => {
		document.body.innerHTML = `
            <div id="character-management-root">
                <nav id="right-nav-panel" data-menu-type="characters"></nav>
                <div
                    id="character_popup"
                    ${CHARACTER_MANAGEMENT_ADVANCED_CLOSE_PENDING_ATTRIBUTE}="true"
                    style="display: flex; opacity: 1;"
                ></div>
            </div>
        `;

		expect(isCharacterAdvancedPopupVisible(document)).toBe(false);
		expect(readCharacterManagementTabValue(document)).toBe("cards");
	});

	test("marks the Advanced popup as panel-close-pending when closing or hiding it", () => {
		const onCloseClick = vi.fn();
		document.body.innerHTML = `
            <div id="character-management-root">
                <button id="character_cross" type="button">Close</button>
                <div id="character_popup" style="display: flex; opacity: 1;"></div>
            </div>
        `;

		document
			.getElementById("character_cross")
			?.addEventListener("click", onCloseClick);

		closeNativeCharacterAdvancedPopup(document);

		const popup = document.getElementById("character_popup") as HTMLElement;
		expect(onCloseClick).toHaveBeenCalledTimes(1);
		expect(popup).toHaveAttribute(
			CHARACTER_MANAGEMENT_ADVANCED_CLOSE_PENDING_ATTRIBUTE,
			"true",
		);
		expect(popup.style.display).toBe("none");
		expect(popup.style.opacity).toBe("0");
		expect(isCharacterAdvancedPopupVisible(document)).toBe(false);

		popup.removeAttribute(
			CHARACTER_MANAGEMENT_ADVANCED_CLOSE_PENDING_ATTRIBUTE,
		);
		popup.style.display = "flex";
		popup.style.opacity = "1";

		hideNativeCharacterAdvancedPopup(document);

		expect(popup).toHaveAttribute(
			CHARACTER_MANAGEMENT_ADVANCED_CLOSE_PENDING_ATTRIBUTE,
			"true",
		);
		expect(popup.style.display).toBe("none");
		expect(popup.style.opacity).toBe("0");
	});

	test("clears the Advanced close-pending marker before opening the popup", () => {
		const onOpenClick = vi.fn();
		document.body.innerHTML = `
            <div id="character-management-root">
                <button id="advanced_div" type="button">Open advanced</button>
                <div
                    id="character_popup"
                    ${CHARACTER_MANAGEMENT_ADVANCED_CLOSE_PENDING_ATTRIBUTE}="true"
                    style="display: none; opacity: 0;"
                ></div>
            </div>
        `;

		const popup = document.getElementById("character_popup") as HTMLElement;
		document
			.getElementById("advanced_div")
			?.addEventListener("click", () => {
				onOpenClick();
				popup.style.display = "flex";
				popup.style.opacity = "1";
			});

		openNativeCharacterAdvancedPopup(document);

		expect(onOpenClick).toHaveBeenCalledTimes(1);
		expect(popup).not.toHaveAttribute(
			CHARACTER_MANAGEMENT_ADVANCED_CLOSE_PENDING_ATTRIBUTE,
		);
		expect(isCharacterAdvancedPopupVisible(document)).toBe(true);
	});

	test("treats an existing native Gallery draggable as the images tab", () => {
		document.body.innerHTML = `
            <div id="movingDivs">
                <div class="draggable no-scrollbar" forchar="gallery" id="gallery">
                    <div id="dragGallery">Images</div>
                </div>
            </div>
            <nav id="right-nav-panel" data-menu-type="character_edit"></nav>
        `;

		expect(readCharacterManagementTabValue(document)).toBe("images");
	});

	test("emits a Gallery tab value only once while native Gallery subtree mutations keep it active", async () => {
		document.body.innerHTML = `
            <div id="movingDivs">
                <div class="draggable no-scrollbar" forchar="gallery" id="gallery" style="display: flex; opacity: 1;">
                    <div id="dragGallery">Images</div>
                </div>
            </div>
            <nav id="right-nav-panel" data-menu-type="characters"></nav>
        `;

		const onValueChange = vi.fn();
		const disconnect = observeCharacterManagementTabValue({
			documentRef: document,
			onValueChange,
		});

		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenLastCalledWith("images");

		const gallery = document.getElementById("gallery") as HTMLElement;
		gallery.style.opacity = "0.98";
		gallery.appendChild(document.createElement("span"));

		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(onValueChange).toHaveBeenCalledTimes(1);

		disconnect();
	});

	test("opens the native Gallery through the Character Management dropdown when the option is available", () => {
		const onChange = vi.fn();
		document.body.innerHTML = `
            <select id="char-management-dropdown">
                <option id="default">Default</option>
                <option id="show_char_gallery" value="gallery">Show Gallery</option>
            </select>
        `;
		document
			.getElementById("char-management-dropdown")
			?.addEventListener("change", onChange);

		openNativeCharacterGallery(document);

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(
			(
				document.getElementById(
					"char-management-dropdown",
				) as HTMLSelectElement
			).selectedOptions[0].id,
		).toBe("show_char_gallery");
	});

	test("falls back to the Gallery wand button when the Character Management dropdown option is unavailable", () => {
		const onClick = vi.fn();
		document.body.innerHTML = `
            <select id="char-management-dropdown">
                <option id="default">Default</option>
            </select>
            <button id="show_gallery_wand_button" type="button">Show Gallery</button>
        `;
		document
			.getElementById("show_gallery_wand_button")
			?.addEventListener("click", onClick);

		openNativeCharacterGallery(document);

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	test("falls back to the public SillyTavern character-management event route when native controls are unavailable", () => {
		const emit = vi.fn();
		Object.defineProperty(window, "SillyTavern", {
			configurable: true,
			value: {
				getContext: () => ({
					eventSource: { emit },
					eventTypes: {
						CHARACTER_MANAGEMENT_DROPDOWN: "charManagementDropdown",
					},
				}),
			},
		});

		openNativeCharacterGallery(document);

		expect(emit).toHaveBeenCalledWith(
			"charManagementDropdown",
			"show_char_gallery",
		);
	});

	test("restores the native Gallery to movingDivs before triggering its delegated close control", () => {
		const closeEvents: string[] = [];
		document.body.innerHTML = `
            <div id="movingDivs"></div>
            <div id="sillytavern-interface-panel-character-management-host">
                <div class="draggable no-scrollbar" forchar="gallery" id="gallery">
                    <div id="galleryclose" class="dragClose" data-related-id="gallery"></div>
                    <div id="dragGallery">Images</div>
                </div>
            </div>
        `;

		document
			.getElementById("movingDivs")
			?.addEventListener("click", (event) => {
				if (
					event.target instanceof HTMLElement &&
					event.target.matches(".dragClose")
				) {
					closeEvents.push(
						document.getElementById("gallery")?.parentElement?.id ??
							"",
					);
					document.getElementById("gallery")?.remove();
				}
			});

		closeNativeCharacterGallery(document);

		expect(closeEvents).toEqual(["movingDivs"]);
		expect(document.getElementById("gallery")).toBeNull();
	});

	test("removes the native Gallery after triggering its delegated animated close control", () => {
		const closeEvents: string[] = [];
		document.body.innerHTML = `
            <div id="movingDivs"></div>
            <div id="sillytavern-interface-panel-character-management-host">
                <div class="draggable no-scrollbar" forchar="gallery" id="gallery">
                    <div id="galleryclose" class="dragClose" data-related-id="gallery"></div>
                    <div id="dragGallery">Images</div>
                </div>
            </div>
        `;

		document
			.getElementById("movingDivs")
			?.addEventListener("click", (event) => {
				if (
					event.target instanceof HTMLElement &&
					event.target.matches(".dragClose")
				) {
					closeEvents.push(
						document.getElementById("gallery")?.parentElement?.id ??
							"",
					);
				}
			});

		closeNativeCharacterGallery(document);

		expect(closeEvents).toEqual(["movingDivs"]);
		expect(document.getElementById("gallery")).toBeNull();
	});
});

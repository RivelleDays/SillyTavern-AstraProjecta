import { waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { createNativeCompanionBridge } from "@/packages/core/st/native-companions/createNativeCompanionBridge";

describe("createNativeCompanionBridge", () => {
	test("ports a live companion node without changing hidden display and restores original attributes", () => {
		document.body.innerHTML = `
      <div id="origin">
        <div id="completion_prompt_manager_popup" class="drawer-content closedDrawer extra" style="display: none;">
          <button type="button">Close</button>
        </div>
        <div id="after"></div>
      </div>
      <div id="host"></div>
    `;

		const host = document.getElementById("host") as HTMLElement;
		const origin = document.getElementById("origin") as HTMLElement;
		const popup = document.getElementById(
			"completion_prompt_manager_popup",
		) as HTMLElement;
		const originalNextSibling = popup.nextSibling;
		const originalClassName = popup.className;
		const originalStyleAttribute = popup.getAttribute("style");
		const bridge = createNativeCompanionBridge({
			documentRef: document,
			sourceId: "completion_prompt_manager_popup",
		});

		bridge.attachTo(host);

		expect(popup.parentElement).toBe(host);
		expect(popup).toHaveStyle({ display: "none" });
		expect(popup).toHaveClass("drawer-content");
		expect(popup).toHaveClass("closedDrawer");
		expect(popup).toHaveClass("extra");
		expect(popup).toHaveClass("astra-projecta-native-companion-ported");
		expect(popup).toHaveAttribute(
			"data-astra-projecta-native-companion-source",
			"completion_prompt_manager_popup",
		);
		expect(bridge.getSnapshot()).toMatchObject({
			companionNode: popup,
			isAttachedToHost: true,
			isAvailable: true,
			sourceId: "completion_prompt_manager_popup",
		});

		popup.classList.add("openDrawer");
		popup.style.display = "block";

		bridge.restore();

		expect(popup.parentElement).toBe(origin);
		expect(popup.nextSibling).toBe(originalNextSibling);
		expect(popup.className).toBe(originalClassName);
		expect(popup.getAttribute("style")).toBe(originalStyleAttribute);
		expect(popup).not.toHaveClass("astra-projecta-native-companion-ported");
		expect(popup).not.toHaveAttribute(
			"data-astra-projecta-native-companion-source",
		);
		expect(bridge.getSnapshot()).toMatchObject({
			companionNode: popup,
			isAttachedToHost: false,
			isAvailable: true,
			sourceId: "completion_prompt_manager_popup",
		});

		bridge.dispose();
	});

	test("locks configured attached companion visibility while ported and restores the original style", async () => {
		document.body.innerHTML = `
      <div id="movingDivs">
        <div id="gallery" class="draggable no-scrollbar" style="display: block; opacity: 0; transition: opacity 300ms;">
          <div id="dragGallery">Images</div>
        </div>
      </div>
      <div id="host"></div>
    `;

		const host = document.getElementById("host") as HTMLElement;
		const gallery = document.getElementById("gallery") as HTMLElement;
		const originalStyleAttribute = gallery.getAttribute("style");
		const bridge = createNativeCompanionBridge({
			documentRef: document,
			normalizeAttachedVisibility: {
				display: "flex",
				opacity: "1",
				transition: "none",
			},
			sourceId: "gallery",
		});

		bridge.attachTo(host);

		expect(gallery.parentElement).toBe(host);
		expect(gallery.style.display).toBe("flex");
		expect(gallery.style.opacity).toBe("1");
		expect(gallery.style.transition).toBe("none");

		gallery.style.display = "none";
		gallery.style.opacity = "0";
		gallery.style.transition = "opacity 300ms";

		await waitFor(() => {
			expect(gallery.style.display).toBe("flex");
			expect(gallery.style.opacity).toBe("1");
			expect(gallery.style.transition).toBe("none");
		});

		bridge.restore();

		expect(gallery.getAttribute("style")).toBe(originalStyleAttribute);
	});

	test("restores the original node before taking over a replacement source node", () => {
		document.body.innerHTML = `
      <div id="origin">
        <div id="completion_prompt_manager_popup" class="drawer-content closedDrawer" style="display: none;"></div>
        <div id="after"></div>
      </div>
      <div id="host"></div>
    `;

		const bridge = createNativeCompanionBridge({
			documentRef: document,
			sourceId: "completion_prompt_manager_popup",
		});
		const host = document.getElementById("host") as HTMLElement;
		const originalPopup = document.getElementById(
			"completion_prompt_manager_popup",
		) as HTMLElement;
		const originalParent = originalPopup.parentElement;
		const originalSibling = originalPopup.nextSibling;

		bridge.attachTo(host);

		const replacementPopup = document.createElement("div");
		replacementPopup.id = "completion_prompt_manager_popup";
		replacementPopup.className = "drawer-content closedDrawer replacement";
		replacementPopup.setAttribute("style", "display: none;");

		originalPopup.remove();
		document.body.appendChild(replacementPopup);

		bridge.sync();

		expect(originalPopup.parentElement).toBe(originalParent);
		expect(originalPopup.nextSibling).toBe(originalSibling);
		expect(originalPopup.className).toBe("drawer-content closedDrawer");
		expect(originalPopup.getAttribute("style")).toBe("display: none;");
		expect(replacementPopup.parentElement).toBe(host);
		expect(replacementPopup).toHaveClass(
			"astra-projecta-native-companion-ported",
		);
		expect(bridge.getSnapshot()).toMatchObject({
			companionNode: replacementPopup,
			isAttachedToHost: true,
			isAvailable: true,
			sourceId: "completion_prompt_manager_popup",
		});

		bridge.dispose();
	});

	test("no-ops cleanly when the companion source is missing", () => {
		document.body.innerHTML = '<div id="host"></div>';

		const bridge = createNativeCompanionBridge({
			documentRef: document,
			sourceId: "completion_prompt_manager_popup",
		});
		const host = document.getElementById("host") as HTMLElement;

		bridge.attachTo(host);
		bridge.restore();
		bridge.dispose();

		expect(bridge.getSnapshot()).toMatchObject({
			companionNode: null,
			isAttachedToHost: false,
			isAvailable: false,
			sourceId: "completion_prompt_manager_popup",
		});
	});

	test("keeps a companion source attached after body mutations", async () => {
		document.body.innerHTML = `
      <div id="origin">
        <div id="completion_prompt_manager_popup" class="drawer-content closedDrawer" style="display: none;"></div>
      </div>
      <div id="host"></div>
    `;

		const bridge = createNativeCompanionBridge({
			documentRef: document,
			sourceId: "completion_prompt_manager_popup",
		});
		const host = document.getElementById("host") as HTMLElement;
		const popup = document.getElementById(
			"completion_prompt_manager_popup",
		) as HTMLElement;

		bridge.attachTo(host);
		document.body.appendChild(document.createElement("div"));

		await waitFor(() => {
			expect(popup.parentElement).toBe(host);
			expect(popup).toHaveClass("astra-projecta-native-companion-ported");
		});

		bridge.dispose();
	});

	test("normalizes ported openDrawer visibility without waiting for jQuery slide animations", async () => {
		document.body.innerHTML = `
      <div id="origin">
        <div id="completion_prompt_manager_popup" class="drawer-content closedDrawer" style="display: none; height: 0px; overflow: hidden;"></div>
        <div id="after"></div>
      </div>
      <div id="host"></div>
    `;

		const bridge = createNativeCompanionBridge({
			documentRef: document,
			normalizeOpenDrawerVisibility: true,
			sourceId: "completion_prompt_manager_popup",
		});
		const host = document.getElementById("host") as HTMLElement;
		const popup = document.getElementById(
			"completion_prompt_manager_popup",
		) as HTMLElement;
		const originalStyleAttribute = popup.getAttribute("style");

		bridge.attachTo(host);

		expect(popup).toHaveStyle({ display: "none" });

		popup.classList.add("openDrawer");
		popup.style.display = "none";
		popup.style.height = "0px";
		popup.style.overflow = "hidden";

		await waitFor(() => {
			expect(popup.style.display).toBe("block");
			expect(popup.style.height).toBe("");
			expect(popup.style.overflow).toBe("");
		});

		popup.classList.remove("openDrawer");
		popup.style.display = "block";
		popup.style.height = "420px";
		popup.style.overflow = "hidden";

		await waitFor(() => {
			expect(popup.style.display).toBe("none");
			expect(popup.style.height).toBe("");
			expect(popup.style.overflow).toBe("");
		});

		bridge.restore();

		expect(popup.getAttribute("style")).toBe(originalStyleAttribute);
		bridge.dispose();
	});
});

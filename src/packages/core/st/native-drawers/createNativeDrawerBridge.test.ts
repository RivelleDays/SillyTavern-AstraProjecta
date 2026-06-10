import { waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { createNativeDrawerBridge } from "@/packages/core/st/native-drawers/createNativeDrawerBridge";

describe("createNativeDrawerBridge", () => {
	test("attaches a live drawer to a host and keeps it open while attached", async () => {
		document.body.innerHTML = `
      <div id="origin">
        <section id="user-settings-block" class="drawer-content closedDrawer extra"></section>
        <div id="after"></div>
      </div>
      <div id="host"></div>
    `;

		const host = document.getElementById("host") as HTMLElement;
		const origin = document.getElementById("origin") as HTMLElement;
		const drawer = document.getElementById(
			"user-settings-block",
		) as HTMLElement;
		const originalNextSibling = drawer.nextSibling;
		const bridge = createNativeDrawerBridge({
			documentRef: document,
			sourceId: "user-settings-block",
		});

		bridge.attachTo(host);

		expect(drawer.parentElement).toBe(host);
		expect(drawer).toHaveClass("openDrawer");
		expect(drawer).not.toHaveClass("closedDrawer");
		expect(drawer).toHaveClass("astra-projecta-native-drawer-ported");
		expect(drawer).toHaveAttribute(
			"data-astra-projecta-native-drawer-source",
			"user-settings-block",
		);
		expect(bridge.getSnapshot()).toMatchObject({
			drawerNode: drawer,
			isAttachedToHost: true,
			isAvailable: true,
			sourceId: "user-settings-block",
		});

		drawer.classList.remove("openDrawer");
		drawer.classList.add("closedDrawer");

		await waitFor(() => {
			expect(drawer).toHaveClass("openDrawer");
			expect(drawer).not.toHaveClass("closedDrawer");
		});

		bridge.restore();

		expect(drawer.parentElement).toBe(origin);
		expect(drawer.nextSibling).toBe(originalNextSibling);
		expect(drawer.className).toBe("drawer-content closedDrawer extra");
		expect(drawer).not.toHaveClass("astra-projecta-native-drawer-ported");
		expect(drawer).not.toHaveAttribute(
			"data-astra-projecta-native-drawer-source",
		);
		expect(bridge.getSnapshot()).toMatchObject({
			drawerNode: drawer,
			isAttachedToHost: false,
			isAvailable: true,
			sourceId: "user-settings-block",
		});

		bridge.dispose();
	});

	test("locks configured attached drawer visibility while ported and restores the original style", async () => {
		document.body.innerHTML = `
      <div id="origin">
        <section id="character_popup" class="flex-container" style="display: none; opacity: 0; transition: opacity 300ms;"></section>
        <div id="after"></div>
      </div>
      <div id="host"></div>
    `;

		const host = document.getElementById("host") as HTMLElement;
		const drawer = document.getElementById(
			"character_popup",
		) as HTMLElement;
		const originalStyleAttribute = drawer.getAttribute("style");
		const bridge = createNativeDrawerBridge({
			documentRef: document,
			normalizeAttachedVisibility: {
				display: "flex",
				opacity: "1",
				transition: "none",
			},
			sourceId: "character_popup",
		});

		bridge.attachTo(host);

		expect(drawer.parentElement).toBe(host);
		expect(drawer.style.display).toBe("flex");
		expect(drawer.style.opacity).toBe("1");
		expect(drawer.style.transition).toBe("none");

		drawer.style.display = "none";
		drawer.style.opacity = "0";
		drawer.style.transition = "opacity 300ms";

		await waitFor(() => {
			expect(drawer.style.display).toBe("flex");
			expect(drawer.style.opacity).toBe("1");
			expect(drawer.style.transition).toBe("none");
		});

		bridge.restore();

		expect(drawer.getAttribute("style")).toBe(originalStyleAttribute);
	});

	test("skips configured attached drawer visibility while the configured marker attribute is present", () => {
		document.body.innerHTML = `
      <div id="origin">
        <section
          id="character_popup"
          class="flex-container"
          data-astra-projecta-character-management-advanced-close-pending="true"
          style="display: none; opacity: 0; transition: opacity 300ms;"
        ></section>
        <div id="after"></div>
      </div>
      <div id="host"></div>
    `;

		const host = document.getElementById("host") as HTMLElement;
		const drawer = document.getElementById(
			"character_popup",
		) as HTMLElement;
		const bridge = createNativeDrawerBridge({
			documentRef: document,
			normalizeAttachedVisibility: {
				display: "flex",
				opacity: "1",
				skipWhenAttribute:
					"data-astra-projecta-character-management-advanced-close-pending",
				transition: "none",
			},
			sourceId: "character_popup",
		});

		bridge.attachTo(host);

		expect(drawer.parentElement).toBe(host);
		expect(drawer.style.display).toBe("none");
		expect(drawer.style.opacity).toBe("0");
		expect(drawer.style.transition).toBe("opacity 300ms");

		drawer.removeAttribute(
			"data-astra-projecta-character-management-advanced-close-pending",
		);
		bridge.sync();

		expect(drawer.style.display).toBe("flex");
		expect(drawer.style.opacity).toBe("1");
		expect(drawer.style.transition).toBe("none");
	});

	test("restores the original node before taking over a replacement source node", () => {
		document.body.innerHTML = `
      <div id="origin">
        <section id="user-settings-block" class="drawer-content closedDrawer"></section>
        <div id="after"></div>
      </div>
      <div id="host"></div>
    `;

		const bridge = createNativeDrawerBridge({
			documentRef: document,
			sourceId: "user-settings-block",
		});
		const host = document.getElementById("host") as HTMLElement;
		const originalDrawer = document.getElementById(
			"user-settings-block",
		) as HTMLElement;
		const originalParent = originalDrawer.parentElement;
		const originalSibling = originalDrawer.nextSibling;

		bridge.attachTo(host);

		const replacementDrawer = document.createElement("section");
		replacementDrawer.id = "user-settings-block";
		replacementDrawer.className = "drawer-content closedDrawer replacement";

		originalDrawer.remove();
		document.body.appendChild(replacementDrawer);

		bridge.sync();

		expect(originalDrawer.parentElement).toBe(originalParent);
		expect(originalDrawer.nextSibling).toBe(originalSibling);
		expect(originalDrawer.className).toBe("drawer-content closedDrawer");
		expect(replacementDrawer.parentElement).toBe(host);
		expect(replacementDrawer).toHaveClass("openDrawer");
		expect(replacementDrawer).not.toHaveClass("closedDrawer");
		expect(bridge.getSnapshot()).toMatchObject({
			drawerNode: replacementDrawer,
			isAttachedToHost: true,
			isAvailable: true,
			sourceId: "user-settings-block",
		});

		bridge.dispose();
	});

	test("disposes by restoring the active drawer to its origin and resetting state", () => {
		document.body.innerHTML = `
      <div id="origin">
        <section id="user-settings-block" class="drawer-content closedDrawer"></section>
        <div id="after"></div>
      </div>
      <div id="host"></div>
    `;

		const bridge = createNativeDrawerBridge({
			documentRef: document,
			sourceId: "user-settings-block",
		});
		const host = document.getElementById("host") as HTMLElement;
		const drawer = document.getElementById(
			"user-settings-block",
		) as HTMLElement;
		const origin = drawer.parentElement;
		const sibling = drawer.nextSibling;

		bridge.attachTo(host);
		bridge.dispose();

		expect(drawer.parentElement).toBe(origin);
		expect(drawer.nextSibling).toBe(sibling);
		expect(drawer.className).toBe("drawer-content closedDrawer");
		expect(bridge.getSnapshot()).toMatchObject({
			drawerNode: null,
			isAttachedToHost: false,
			isAvailable: false,
			sourceId: "user-settings-block",
		});
	});

	test("no-ops cleanly when the source drawer is missing", () => {
		document.body.innerHTML = '<div id="host"></div>';

		const bridge = createNativeDrawerBridge({
			documentRef: document,
			sourceId: "user-settings-block",
		});
		const host = document.getElementById("host") as HTMLElement;

		bridge.attachTo(host);
		bridge.restore();
		bridge.dispose();

		expect(bridge.getSnapshot()).toMatchObject({
			drawerNode: null,
			isAttachedToHost: false,
			isAvailable: false,
			sourceId: "user-settings-block",
		});
	});

	test("uses a timeout fallback when animation frame APIs are unavailable", async () => {
		document.body.innerHTML = `
      <div id="origin">
        <section id="user-settings-block" class="drawer-content closedDrawer"></section>
      </div>
      <div id="host"></div>
    `;

		const view = document.defaultView as Window &
			typeof globalThis & {
				cancelAnimationFrame?: typeof window.cancelAnimationFrame;
				requestAnimationFrame?: typeof window.requestAnimationFrame;
			};
		const originalCancelAnimationFrame = view.cancelAnimationFrame;
		const originalRequestAnimationFrame = view.requestAnimationFrame;

		Object.defineProperty(view, "cancelAnimationFrame", {
			configurable: true,
			value: undefined,
		});
		Object.defineProperty(view, "requestAnimationFrame", {
			configurable: true,
			value: undefined,
		});

		try {
			const bridge = createNativeDrawerBridge({
				documentRef: document,
				sourceId: "user-settings-block",
			});
			const host = document.getElementById("host") as HTMLElement;
			const drawer = document.getElementById(
				"user-settings-block",
			) as HTMLElement;

			bridge.attachTo(host);
			document.body.appendChild(document.createElement("div"));

			await waitFor(() => {
				expect(drawer.parentElement).toBe(host);
				expect(drawer).toHaveClass("openDrawer");
			});

			bridge.dispose();
		} finally {
			Object.defineProperty(view, "cancelAnimationFrame", {
				configurable: true,
				value: originalCancelAnimationFrame,
			});
			Object.defineProperty(view, "requestAnimationFrame", {
				configurable: true,
				value: originalRequestAnimationFrame,
			});
		}
	});
});

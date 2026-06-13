import { screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import {
	ASTRA_PROJECTA_PORTAL_ID,
	ASTRA_PROJECTA_UI_ROOT_ATTR,
	ensureAstraProjectaUiInfrastructure,
} from "@/packages/core/runtime/uiScope";
import { createAstraReactPortalRootManager } from "@/packages/core/runtime/reactPortalRootManager";

describe("createAstraReactPortalRootManager", () => {
	test("creates a marked host under the Astra portal and renders into it", async () => {
		const portal = ensureAstraProjectaUiInfrastructure({
			documentRef: document,
		});
		const manager = createAstraReactPortalRootManager({
			documentRef: document,
			id: "astra-test-drawer-host",
		});

		manager.render(<div>Managed drawer content</div>);

		const host = document.getElementById("astra-test-drawer-host");
		expect(host).toBe(manager.getHost());
		expect(host).toHaveAttribute(ASTRA_PROJECTA_UI_ROOT_ATTR);
		expect(host?.parentElement).toBe(portal);
		expect(
			await screen.findByText("Managed drawer content"),
		).toBeInTheDocument();

		manager.unmount();
	});

	test("recreates the root when the previous host is disconnected", async () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const manager = createAstraReactPortalRootManager({
			documentRef: document,
			id: "astra-recreated-drawer-host",
		});

		manager.render(<div>First render</div>);
		const firstHost = manager.getHost();
		firstHost?.remove();
		manager.render(<div>Second render</div>);

		const secondHost = manager.getHost();
		expect(firstHost).not.toBe(secondHost);
		expect(secondHost?.isConnected).toBe(true);
		expect(screen.queryByText("First render")).toBeNull();
		expect(await screen.findByText("Second render")).toBeInTheDocument();

		manager.unmount();
	});

	test("removes the host on unmount", () => {
		ensureAstraProjectaUiInfrastructure({ documentRef: document });
		const manager = createAstraReactPortalRootManager({
			documentRef: document,
			id: "astra-cleaned-drawer-host",
		});

		manager.render(<div>Temporary drawer content</div>);
		manager.unmount();

		expect(document.getElementById("astra-cleaned-drawer-host")).toBeNull();
		expect(screen.queryByText("Temporary drawer content")).toBeNull();
	});

	test("falls back to document body when the Astra portal is absent", async () => {
		const manager = createAstraReactPortalRootManager({
			documentRef: document,
			id: "astra-body-drawer-host",
		});

		manager.render(<div>Body hosted content</div>);

		const host = document.getElementById("astra-body-drawer-host");
		expect(document.getElementById(ASTRA_PROJECTA_PORTAL_ID)).toBeNull();
		expect(host?.parentElement).toBe(document.body);
		expect(
			await screen.findByText("Body hosted content"),
		).toBeInTheDocument();

		manager.unmount();
	});
});

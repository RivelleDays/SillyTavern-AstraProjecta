import * as React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
	SILLYTAVERN_INTERFACE_ROUTES,
	type SillyTavernInterfaceRouteIconKey,
} from "@/app/shared/sillytavern-interface";
import {
	createMobileSillyTavernInterfacePanelFeature,
	type MobileSillyTavernInterfacePanelFeature,
} from "@/app/mobile/sillytavern-interface-panel";
import {
	SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
	SILLYTAVERN_INTERFACE_AI_SETTINGS_ACTIVE_PAGE_KEY_STORAGE_KEY,
} from "@/packages/features/sillytavern-interface/contracts/dom";

const { panelState } = vi.hoisted(() => {
	return {
		panelState: {
			lastProps: null as {
				activePageKey?: string;
				onActivePageKeyChange?(pageKey: string): void;
				onOpenChange(nextOpen: boolean): void;
				open: boolean;
			} | null,
		},
	};
});

vi.mock(
	"@/packages/features/sillytavern-interface/panel-shell/MobileSillyTavernInterfacePanel",
	() => {
		return {
			MobileSillyTavernInterfacePanel(props: {
				activePageKey?: string;
				onActivePageKeyChange?(pageKey: string): void;
				onOpenChange(nextOpen: boolean): void;
				open: boolean;
			}) {
				panelState.lastProps = props;

				return (
					<div
						data-active-page-key={props.activePageKey}
						data-open={props.open ? "true" : "false"}
						data-testid="sillytavern-interface-panel"
					/>
				);
			},
		};
	},
);

vi.mock(
	"@/packages/features/sillytavern-interface/icons/SillyTavernInterfaceRouteIcon",
	() => {
		return {
			SillyTavernInterfaceRouteIcon({
				className,
				iconKey,
			}: {
				className?: string;
				iconKey: SillyTavernInterfaceRouteIconKey;
			}) {
				return (
					<span
						className={className}
						data-icon-key={iconKey}
						data-testid="route-icon"
					/>
				);
			},
		};
	},
);

function createFeature(): MobileSillyTavernInterfacePanelFeature {
	return createMobileSillyTavernInterfacePanelFeature({
		documentRef: document,
	});
}

describe("createMobileSillyTavernInterfacePanelFeature", () => {
	afterEach(() => {
		cleanup();
		panelState.lastProps = null;
		window.localStorage.clear();
		document.body.innerHTML = "";
	});

	test("mounts the panel wrapper, opens stored/current routes, renders route icons, and cleans up", async () => {
		window.localStorage.setItem(
			SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
			SILLYTAVERN_INTERFACE_ROUTES.userSettings,
		);
		window.localStorage.setItem(
			SILLYTAVERN_INTERFACE_AI_SETTINGS_ACTIVE_PAGE_KEY_STORAGE_KEY,
			"advanced-formatting",
		);
		const feature = createFeature();
		const adapter = feature.getSendFormAdapter();

		feature.mount();

		await waitFor(() => {
			expect(
				screen.getByTestId("sillytavern-interface-panel"),
			).toHaveAttribute(
				"data-active-page-key",
				SILLYTAVERN_INTERFACE_ROUTES.userSettings,
			);
			expect(
				screen.getByTestId("sillytavern-interface-panel"),
			).toHaveAttribute("data-open", "false");
		});

		adapter.openCurrentPage();

		await waitFor(() => {
			expect(
				screen.getByTestId("sillytavern-interface-panel"),
			).toHaveAttribute("data-open", "true");
			expect(
				screen.getByTestId("sillytavern-interface-panel"),
			).toHaveAttribute(
				"data-active-page-key",
				SILLYTAVERN_INTERFACE_ROUTES.userSettings,
			);
		});

		panelState.lastProps?.onOpenChange(false);

		await waitFor(() => {
			expect(
				screen.getByTestId("sillytavern-interface-panel"),
			).toHaveAttribute("data-open", "false");
		});

		adapter.openRoute(SILLYTAVERN_INTERFACE_ROUTES.aiSettings);

		await waitFor(() => {
			expect(
				screen.getByTestId("sillytavern-interface-panel"),
			).toHaveAttribute("data-open", "true");
			expect(
				screen.getByTestId("sillytavern-interface-panel"),
			).toHaveAttribute("data-active-page-key", "advanced-formatting");
			expect(
				window.localStorage.getItem(
					SILLYTAVERN_INTERFACE_ACTIVE_PAGE_KEY_STORAGE_KEY,
				),
			).toBe("advanced-formatting");
		});

		const iconRender = render(
			<>
				{adapter.renderRouteIcon({
					className: "tile-icon",
					iconKey: "lorebook",
				})}
			</>,
		);

		expect(iconRender.getByTestId("route-icon")).toHaveAttribute(
			"data-icon-key",
			"lorebook",
		);
		expect(iconRender.getByTestId("route-icon")).toHaveClass("tile-icon");

		feature.unmount();

		await waitFor(() => {
			expect(
				screen.queryByTestId("sillytavern-interface-panel"),
			).not.toBeInTheDocument();
		});

		feature.dispose();
	});
});

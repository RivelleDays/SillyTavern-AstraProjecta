import * as React from "react";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { BookText, Bot, Settings } from "@/components/ui/shared/icons";
import { SillyTavernInterfaceMainNavigationStrip } from "@/packages/features/sillytavern-interface/route-navigation/SillyTavernInterfaceMainNavigationStrip";
import type { SillyTavernInterfacePageMainNavigationItem } from "@/packages/features/sillytavern-interface/routes/types";

const MAIN_NAV_ITEMS = [
	{
		activePageKeys: [
			"ai-response-configuration",
			"connection-profile",
			"advanced-formatting",
		],
		icon: Bot,
		key: "ai-settings",
		label: "AI Settings",
		pageKey: "ai-response-configuration",
	},
	{
		icon: Settings,
		key: "user-settings",
		label: "User Settings",
		pageKey: "user-settings",
	},
	{
		icon: BookText,
		key: "lorebook",
		label: "Lorebook",
		pageKey: "worlds-lorebooks",
	},
] as const satisfies readonly SillyTavernInterfacePageMainNavigationItem[];

function renderMainNavigationStrip({
	activePageKey = "ai-response-configuration",
	onPageSelect = vi.fn(),
	visible = true,
}: {
	activePageKey?: string;
	onPageSelect?: ReturnType<typeof vi.fn>;
	visible?: boolean;
} = {}) {
	render(
		<SillyTavernInterfaceMainNavigationStrip
			activePageKey={activePageKey}
			ariaLabel="Page shortcuts"
			id="sillytavern-interface-panel-main-navigation"
			items={MAIN_NAV_ITEMS}
			visible={visible}
			onPageSelect={onPageSelect}
		/>,
	);

	const navigation = document.getElementById(
		"sillytavern-interface-panel-main-navigation",
	) as HTMLElement;
	const list = navigation.querySelector(
		".sillytavern-interface__main-nav-list",
	) as HTMLElement;

	return {
		list,
		navigation,
		onPageSelect,
	};
}

function fireSwipe(
	target: HTMLElement,
	{
		endX,
		endY = 20,
		pointerId = 1,
		pointerType = "touch",
		startX,
		startY = 20,
	}: {
		endX: number;
		endY?: number;
		pointerId?: number;
		pointerType?: "mouse" | "pen" | "touch";
		startX: number;
		startY?: number;
	},
) {
	fireEvent.pointerDown(target, {
		clientX: startX,
		clientY: startY,
		pointerId,
		pointerType,
	});
	fireEvent.pointerMove(target, {
		clientX: endX,
		clientY: endY,
		pointerId,
		pointerType,
	});
	fireEvent.pointerUp(target, {
		clientX: endX,
		clientY: endY,
		pointerId,
		pointerType,
	});
}

function startSwipe(
	target: HTMLElement,
	{
		pointerId = 1,
		pointerType = "touch",
		startX,
		startY = 20,
	}: {
		pointerId?: number;
		pointerType?: "mouse" | "pen" | "touch";
		startX: number;
		startY?: number;
	},
) {
	fireEvent.pointerDown(target, {
		clientX: startX,
		clientY: startY,
		pointerId,
		pointerType,
	});
}

function moveSwipe(
	target: HTMLElement,
	{
		endX,
		endY = 20,
		pointerId = 1,
		pointerType = "touch",
	}: {
		endX: number;
		endY?: number;
		pointerId?: number;
		pointerType?: "mouse" | "pen" | "touch";
	},
) {
	fireEvent.pointerMove(target, {
		clientX: endX,
		clientY: endY,
		pointerId,
		pointerType,
	});
}

function endSwipe(
	target: HTMLElement,
	{
		endX,
		endY = 20,
		pointerId = 1,
		pointerType = "touch",
	}: {
		endX: number;
		endY?: number;
		pointerId?: number;
		pointerType?: "mouse" | "pen" | "touch";
	},
) {
	fireEvent.pointerUp(target, {
		clientX: endX,
		clientY: endY,
		pointerId,
		pointerType,
	});
}

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("SillyTavernInterfaceMainNavigationStrip", () => {
	test("switches to the next main navigation item on a left swipe from an AI child page", () => {
		const onPageSelect = vi.fn();
		const { list } = renderMainNavigationStrip({
			activePageKey: "connection-profile",
			onPageSelect,
		});

		fireSwipe(list, {
			endX: 32,
			startX: 116,
		});

		expect(onPageSelect).toHaveBeenCalledTimes(1);
		expect(onPageSelect).toHaveBeenCalledWith("user-settings");
	});

	test("switches as soon as the swipe crosses the threshold instead of waiting for pointerup", () => {
		const onPageSelect = vi.fn();
		const { list } = renderMainNavigationStrip({
			activePageKey: "connection-profile",
			onPageSelect,
		});

		startSwipe(list, {
			startX: 116,
		});
		moveSwipe(list, {
			endX: 82,
		});

		expect(onPageSelect).toHaveBeenCalledTimes(1);
		expect(onPageSelect).toHaveBeenCalledWith("user-settings");

		endSwipe(list, {
			endX: 82,
		});

		expect(onPageSelect).toHaveBeenCalledTimes(1);
	});

	test("switches to the previous main navigation item on a right swipe and lands on the AI root page", () => {
		const onPageSelect = vi.fn();
		const { list } = renderMainNavigationStrip({
			activePageKey: "user-settings",
			onPageSelect,
		});

		fireSwipe(list, {
			endX: 132,
			startX: 36,
		});

		expect(onPageSelect).toHaveBeenCalledTimes(1);
		expect(onPageSelect).toHaveBeenCalledWith("ai-response-configuration");
	});

	test("does not switch pages on short drags", () => {
		const onPageSelect = vi.fn();
		const { list } = renderMainNavigationStrip({
			activePageKey: "ai-response-configuration",
			onPageSelect,
		});

		fireSwipe(list, {
			endX: 92,
			startX: 116,
		});

		expect(onPageSelect).not.toHaveBeenCalled();
	});

	test("accepts medium horizontal drags that are shorter than the old threshold", () => {
		const onPageSelect = vi.fn();
		const { list } = renderMainNavigationStrip({
			activePageKey: "ai-response-configuration",
			onPageSelect,
		});

		fireSwipe(list, {
			endX: 82,
			startX: 116,
		});

		expect(onPageSelect).toHaveBeenCalledTimes(1);
		expect(onPageSelect).toHaveBeenCalledWith("user-settings");
	});

	test("does not switch pages on vertical drags", () => {
		const onPageSelect = vi.fn();
		const { list } = renderMainNavigationStrip({
			activePageKey: "ai-response-configuration",
			onPageSelect,
		});

		fireSwipe(list, {
			endX: 110,
			endY: 112,
			startX: 120,
			startY: 20,
		});

		expect(onPageSelect).not.toHaveBeenCalled();
	});

	test("does not wrap past the last main navigation item", () => {
		const onPageSelect = vi.fn();
		const { list } = renderMainNavigationStrip({
			activePageKey: "worlds-lorebooks",
			onPageSelect,
		});

		fireSwipe(list, {
			endX: 28,
			startX: 114,
		});

		expect(onPageSelect).not.toHaveBeenCalled();
	});

	test("suppresses the synthetic click after a completed swipe without breaking later taps", () => {
		const onPageSelect = vi.fn();
		renderMainNavigationStrip({
			activePageKey: "ai-response-configuration",
			onPageSelect,
		});

		const aiSettingsButton = screen.getByRole("button", {
			name: "AI Settings",
		});
		const lorebookButton = screen.getByRole("button", {
			name: "Lorebook",
		});

		fireSwipe(aiSettingsButton, {
			endX: 28,
			startX: 112,
		});

		expect(onPageSelect).toHaveBeenCalledTimes(1);
		expect(onPageSelect).toHaveBeenCalledWith("user-settings");

		fireEvent.click(aiSettingsButton);

		expect(onPageSelect).toHaveBeenCalledTimes(1);

		fireEvent.click(lorebookButton);

		expect(onPageSelect).toHaveBeenCalledTimes(2);
		expect(onPageSelect).toHaveBeenLastCalledWith("worlds-lorebooks");
	});

	test("still handles normal taps when no swipe is in progress", () => {
		const onPageSelect = vi.fn();
		renderMainNavigationStrip({
			activePageKey: "ai-response-configuration",
			onPageSelect,
		});

		fireEvent.click(
			screen.getByRole("button", {
				name: "User Settings",
			}),
		);

		expect(onPageSelect).toHaveBeenCalledTimes(1);
		expect(onPageSelect).toHaveBeenCalledWith("user-settings");
	});

	test("ignores swipe gestures when the navigation is hidden", () => {
		const onPageSelect = vi.fn();
		const { list, navigation } = renderMainNavigationStrip({
			onPageSelect,
			visible: false,
		});

		expect(navigation).toHaveAttribute("aria-hidden", "true");

		fireSwipe(list, {
			endX: 24,
			startX: 120,
		});

		expect(onPageSelect).not.toHaveBeenCalled();
	});

	test("ignores mouse drags", () => {
		const onPageSelect = vi.fn();
		const { list } = renderMainNavigationStrip({
			onPageSelect,
		});

		fireSwipe(list, {
			endX: 24,
			pointerType: "mouse",
			startX: 120,
		});

		expect(onPageSelect).not.toHaveBeenCalled();
	});
});

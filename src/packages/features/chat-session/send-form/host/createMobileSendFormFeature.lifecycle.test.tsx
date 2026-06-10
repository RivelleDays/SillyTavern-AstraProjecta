import { waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ensureAstraProjectaUiInfrastructure } from "@/packages/core/runtime/uiScope";

const {
	avatarStoreFactory,
	currentConnectionInfoStoreFactory,
	currentChatIdentityStoreFactory,
	currentChatInfoStoreFactory,
	currentPresetProfileControlsStoreFactory,
	contextUsageStoreFactory,
	primarySendActionStoreFactory,
} = vi.hoisted(() => {
	return {
		avatarStoreFactory: vi.fn(),
		currentConnectionInfoStoreFactory: vi.fn(),
		currentChatIdentityStoreFactory: vi.fn(),
		currentChatInfoStoreFactory: vi.fn(),
		currentPresetProfileControlsStoreFactory: vi.fn(),
		contextUsageStoreFactory: vi.fn(),
		primarySendActionStoreFactory: vi.fn(),
	};
});

vi.mock("@/packages/core/st/currentUserAvatar", () => {
	return {
		createCurrentUserAvatarStore: avatarStoreFactory,
	};
});

vi.mock("@/packages/core/st/primarySendAction", () => {
	return {
		createPrimarySendActionStore: primarySendActionStoreFactory,
	};
});

vi.mock("@/packages/core/st/chatContextUsage", () => {
	return {
		createChatContextUsageStore: contextUsageStoreFactory,
	};
});

vi.mock("@/packages/core/st/currentConnectionInfo", () => {
	return {
		createCurrentConnectionInfoStore: currentConnectionInfoStoreFactory,
	};
});

vi.mock("@/packages/core/st/chat-identity", () => {
	return {
		createCurrentChatIdentityStore: currentChatIdentityStoreFactory,
	};
});

vi.mock("@/packages/core/st/currentChatInfo", () => {
	return {
		createCurrentChatInfoStore: currentChatInfoStoreFactory,
	};
});

vi.mock("@/packages/core/st/currentPresetProfileControls", () => {
	return {
		createCurrentPresetProfileControlsStore:
			currentPresetProfileControlsStoreFactory,
	};
});

import { createMobileSendFormFeature } from "@/packages/features/chat-session/send-form/host/createMobileSendFormFeature";

function createAvatarStoreStub() {
	const snapshot = {
		displayName: "Rivelle",
		personaId: null,
		personaName: "",
		personaTitle: "",
		source: "none" as const,
		thumbnailUrl: "/img/ai4.png",
		updatedAt: 0,
	};

	return {
		dispose: vi.fn(),
		getSnapshot: vi.fn(() => snapshot),
		refresh: vi.fn(),
		subscribe: vi.fn(() => vi.fn()),
	};
}

function createPrimarySendActionStoreStub() {
	const snapshot = {
		disabled: true,
		kind: "send" as const,
		label: "Send message",
		updatedAt: 0,
		visible: false,
	};

	return {
		dispose: vi.fn(),
		getSnapshot: vi.fn(() => snapshot),
		refresh: vi.fn(),
		subscribe: vi.fn(() => vi.fn()),
		trigger: vi.fn(() => false),
	};
}

function createCurrentChatIdentityStoreStub() {
	const snapshot = {
		avatarSource: "fallback" as const,
		characterId: null,
		chatFileName: "",
		entityName: "",
		groupAvatarUrls: [],
		groupId: null,
		hasActiveChat: false,
		kind: "none" as const,
		thumbnailUrl: "/img/five.png",
		updatedAt: 0,
	};

	return {
		dispose: vi.fn(),
		getSnapshot: vi.fn(() => snapshot),
		refresh: vi.fn(),
		subscribe: vi.fn(() => vi.fn()),
	};
}

function createCurrentConnectionInfoStoreStub() {
	const snapshot = {
		apiIconKey: "",
		apiLabel: "",
		hasActiveConnection: false,
		modelIconKey: "",
		modelLabel: "",
		status: "unavailable" as const,
		updatedAt: 0,
	};

	return {
		dispose: vi.fn(),
		getSnapshot: vi.fn(() => snapshot),
		refresh: vi.fn(),
		subscribe: vi.fn(() => vi.fn()),
	};
}

function createContextUsageStoreStub() {
	const snapshot = {
		characterTokens: null,
		chatHistoryTokens: null,
		hasDetailedBreakdown: false,
		hasPreparedContext: false,
		mainApi: "",
		maxContextTokens: 0,
		personaTokens: null,
		promptBudgetTokens: 0,
		reservedResponseTokens: 0,
		status: "unsupported" as const,
		updatedAt: 0,
		usagePercent: null,
		usedContextTokens: null,
		usedPromptTokens: null,
		worldInfoTokens: null,
	};

	return {
		dispose: vi.fn(),
		getSnapshot: vi.fn(() => snapshot),
		subscribe: vi.fn(() => vi.fn()),
	};
}

function createCurrentChatInfoStoreStub() {
	const snapshot = {
		dominantModel: "",
		fileSize: "",
		hasActiveChat: false,
		lastMessagePreview: "",
		lastUpdatedAt: null,
		metadataReason: null,
		metadataStatus: "idle" as const,
		messageCount: null,
		modelCounts: {},
		updatedAt: 0,
	};

	return {
		dispose: vi.fn(),
		getSnapshot: vi.fn(() => snapshot),
		refresh: vi.fn(),
		subscribe: vi.fn(() => vi.fn()),
	};
}

function createCurrentPresetProfileControlsStoreStub() {
	const snapshot = {
		connectionProfiles: {
			authority: "attached" as const,
			detachedReason: null,
			options: [],
			selectedProfileId: "",
			selectedProfileName: "",
			status: "disabled" as const,
		},
		updatedAt: 0,
	};

	return {
		applyConnectionProfile: vi.fn(async () => true),
		dispose: vi.fn(),
		getSnapshot: vi.fn(() => snapshot),
		refresh: vi.fn(),
		subscribe: vi.fn(() => vi.fn()),
	};
}

describe("createMobileSendFormFeature lifecycle", () => {
	beforeEach(() => {
		avatarStoreFactory.mockReset();
		currentConnectionInfoStoreFactory.mockReset();
		currentChatIdentityStoreFactory.mockReset();
		currentChatInfoStoreFactory.mockReset();
		currentPresetProfileControlsStoreFactory.mockReset();
		contextUsageStoreFactory.mockReset();
		primarySendActionStoreFactory.mockReset();
		avatarStoreFactory.mockImplementation(createAvatarStoreStub);
		currentConnectionInfoStoreFactory.mockImplementation(
			createCurrentConnectionInfoStoreStub,
		);
		currentChatIdentityStoreFactory.mockImplementation(
			createCurrentChatIdentityStoreStub,
		);
		currentChatInfoStoreFactory.mockImplementation(
			createCurrentChatInfoStoreStub,
		);
		currentPresetProfileControlsStoreFactory.mockImplementation(
			createCurrentPresetProfileControlsStoreStub,
		);
		contextUsageStoreFactory.mockImplementation(
			createContextUsageStoreStub,
		);
		primarySendActionStoreFactory.mockImplementation(
			createPrimarySendActionStoreStub,
		);
	});

	test("stays a clean no-op until the native send-form anchors, including #form_sheld, exist", () => {
		document.body.innerHTML = `
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm"></div>
        </div>
      </form>
    `;

		const feature = createMobileSendFormFeature({ documentRef: document });

		expect(avatarStoreFactory).not.toHaveBeenCalled();
		expect(currentConnectionInfoStoreFactory).not.toHaveBeenCalled();
		expect(currentChatIdentityStoreFactory).not.toHaveBeenCalled();
		expect(currentChatInfoStoreFactory).not.toHaveBeenCalled();
		expect(currentPresetProfileControlsStoreFactory).not.toHaveBeenCalled();
		expect(contextUsageStoreFactory).not.toHaveBeenCalled();
		expect(primarySendActionStoreFactory).not.toHaveBeenCalled();

		feature.mount();

		expect(avatarStoreFactory).not.toHaveBeenCalled();
		expect(currentConnectionInfoStoreFactory).not.toHaveBeenCalled();
		expect(currentChatIdentityStoreFactory).not.toHaveBeenCalled();
		expect(currentChatInfoStoreFactory).not.toHaveBeenCalled();
		expect(currentPresetProfileControlsStoreFactory).not.toHaveBeenCalled();
		expect(contextUsageStoreFactory).not.toHaveBeenCalled();
		expect(primarySendActionStoreFactory).not.toHaveBeenCalled();
		expect(
			document.getElementById("mobile-send-form-shortcuts-host"),
		).not.toBeInTheDocument();
		expect(
			document.getElementById("mobile-send-form-input-row-host"),
		).not.toBeInTheDocument();

		feature.dispose();
	});

	test("disposes lifecycle-bound stores on unmount and recreates them on remount", async () => {
		document.body.innerHTML = `
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm"></div>
        </div>
      </form>
      </div>
    `;

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createMobileSendFormFeature({ documentRef: document });

		feature.mount();

		await waitFor(() => {
			expect(
				document.getElementById("mobile-send-form-shortcuts-host"),
			).toBeInTheDocument();
			expect(
				document.getElementById("mobile-send-form-input-row-host"),
			).toBeInTheDocument();
		});

		expect(avatarStoreFactory).toHaveBeenCalledTimes(1);
		expect(currentConnectionInfoStoreFactory).toHaveBeenCalledTimes(1);
		expect(currentChatIdentityStoreFactory).toHaveBeenCalledTimes(1);
		expect(currentChatInfoStoreFactory).toHaveBeenCalledTimes(1);
		expect(currentPresetProfileControlsStoreFactory).toHaveBeenCalledTimes(
			1,
		);
		expect(contextUsageStoreFactory).toHaveBeenCalledTimes(1);
		expect(contextUsageStoreFactory).toHaveBeenCalledWith({
			documentRef: document,
		});
		expect(primarySendActionStoreFactory).toHaveBeenCalledTimes(1);

		const firstAvatarStore = avatarStoreFactory.mock.results[0]?.value as
			| ReturnType<typeof createAvatarStoreStub>
			| undefined;
		const firstCurrentConnectionInfoStore =
			currentConnectionInfoStoreFactory.mock.results[0]?.value as
				| ReturnType<typeof createCurrentConnectionInfoStoreStub>
				| undefined;
		const firstCurrentChatIdentityStore = currentChatIdentityStoreFactory
			.mock.results[0]?.value as
			| ReturnType<typeof createCurrentChatIdentityStoreStub>
			| undefined;
		const firstCurrentChatInfoStore = currentChatInfoStoreFactory.mock
			.results[0]?.value as
			| ReturnType<typeof createCurrentChatInfoStoreStub>
			| undefined;
		const firstCurrentPresetProfileControlsStore =
			currentPresetProfileControlsStoreFactory.mock.results[0]?.value as
				| ReturnType<typeof createCurrentPresetProfileControlsStoreStub>
				| undefined;
		const firstContextUsageStore = contextUsageStoreFactory.mock.results[0]
			?.value as
			| ReturnType<typeof createContextUsageStoreStub>
			| undefined;
		const firstPrimarySendActionStore = primarySendActionStoreFactory.mock
			.results[0]?.value as
			| ReturnType<typeof createPrimarySendActionStoreStub>
			| undefined;

		feature.unmount();

		await waitFor(() => {
			expect(
				document.getElementById("mobile-send-form-shortcuts-host"),
			).not.toBeInTheDocument();
			expect(
				document.getElementById("mobile-send-form-input-row-host"),
			).not.toBeInTheDocument();
		});

		expect(firstAvatarStore?.dispose).toHaveBeenCalledTimes(1);
		expect(firstCurrentConnectionInfoStore?.dispose).toHaveBeenCalledTimes(
			1,
		);
		expect(firstCurrentChatIdentityStore?.dispose).toHaveBeenCalledTimes(1);
		expect(firstCurrentChatInfoStore?.dispose).toHaveBeenCalledTimes(1);
		expect(
			firstCurrentPresetProfileControlsStore?.dispose,
		).toHaveBeenCalledTimes(1);
		expect(firstContextUsageStore?.dispose).toHaveBeenCalledTimes(1);
		expect(firstPrimarySendActionStore?.dispose).toHaveBeenCalledTimes(1);

		feature.mount();

		await waitFor(() => {
			expect(
				document.getElementById("mobile-send-form-shortcuts-host"),
			).toBeInTheDocument();
			expect(
				document.getElementById("mobile-send-form-input-row-host"),
			).toBeInTheDocument();
		});

		expect(avatarStoreFactory).toHaveBeenCalledTimes(2);
		expect(currentConnectionInfoStoreFactory).toHaveBeenCalledTimes(2);
		expect(currentChatIdentityStoreFactory).toHaveBeenCalledTimes(2);
		expect(currentChatInfoStoreFactory).toHaveBeenCalledTimes(2);
		expect(currentPresetProfileControlsStoreFactory).toHaveBeenCalledTimes(
			2,
		);
		expect(contextUsageStoreFactory).toHaveBeenCalledTimes(2);
		expect(primarySendActionStoreFactory).toHaveBeenCalledTimes(2);

		feature.dispose();

		const secondAvatarStore = avatarStoreFactory.mock.results[1]?.value as
			| ReturnType<typeof createAvatarStoreStub>
			| undefined;
		const secondCurrentConnectionInfoStore =
			currentConnectionInfoStoreFactory.mock.results[1]?.value as
				| ReturnType<typeof createCurrentConnectionInfoStoreStub>
				| undefined;
		const secondCurrentChatIdentityStore = currentChatIdentityStoreFactory
			.mock.results[1]?.value as
			| ReturnType<typeof createCurrentChatIdentityStoreStub>
			| undefined;
		const secondCurrentChatInfoStore = currentChatInfoStoreFactory.mock
			.results[1]?.value as
			| ReturnType<typeof createCurrentChatInfoStoreStub>
			| undefined;
		const secondCurrentPresetProfileControlsStore =
			currentPresetProfileControlsStoreFactory.mock.results[1]?.value as
				| ReturnType<typeof createCurrentPresetProfileControlsStoreStub>
				| undefined;
		const secondContextUsageStore = contextUsageStoreFactory.mock.results[1]
			?.value as
			| ReturnType<typeof createContextUsageStoreStub>
			| undefined;
		const secondPrimarySendActionStore = primarySendActionStoreFactory.mock
			.results[1]?.value as
			| ReturnType<typeof createPrimarySendActionStoreStub>
			| undefined;

		expect(secondAvatarStore?.dispose).toHaveBeenCalledTimes(1);
		expect(secondCurrentConnectionInfoStore?.dispose).toHaveBeenCalledTimes(
			1,
		);
		expect(secondCurrentChatIdentityStore?.dispose).toHaveBeenCalledTimes(
			1,
		);
		expect(secondCurrentChatInfoStore?.dispose).toHaveBeenCalledTimes(1);
		expect(
			secondCurrentPresetProfileControlsStore?.dispose,
		).toHaveBeenCalledTimes(1);
		expect(secondContextUsageStore?.dispose).toHaveBeenCalledTimes(1);
		expect(secondPrimarySendActionStore?.dispose).toHaveBeenCalledTimes(1);
	});

	test("refreshes current chat info once when opening the main menu for a non-ready active chat", async () => {
		document.body.innerHTML = `
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm"></div>
        </div>
      </form>
      </div>
    `;

		const identitySnapshot = {
			avatarSource: "group" as const,
			characterId: null,
			chatFileName: "raid-night",
			entityName: "Raid Party",
			groupId: "group-1",
			hasActiveChat: true,
			kind: "group" as const,
			thumbnailUrl: "/thumbs/groups/raid-party.png",
			updatedAt: 0,
		};
		const infoSnapshot = {
			dominantModel: "",
			fileSize: "",
			hasActiveChat: true,
			lastMessagePreview: "",
			lastUpdatedAt: null,
			metadataReason: "context-not-ready" as const,
			metadataStatus: "pending" as const,
			messageCount: null,
			modelCounts: {},
			updatedAt: 0,
		};

		currentChatIdentityStoreFactory.mockImplementation(() => ({
			dispose: vi.fn(),
			getSnapshot: vi.fn(() => identitySnapshot),
			refresh: vi.fn(),
			subscribe: vi.fn(() => vi.fn()),
		}));
		currentChatInfoStoreFactory.mockImplementation(() => ({
			dispose: vi.fn(),
			getSnapshot: vi.fn(() => infoSnapshot),
			refresh: vi.fn(),
			subscribe: vi.fn(() => vi.fn()),
		}));

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createMobileSendFormFeature({ documentRef: document });
		feature.mount();

		const host = await waitFor(() => {
			const element = document.getElementById(
				"mobile-send-form-input-row-host",
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});

		const currentChatInfoStore = currentChatInfoStoreFactory.mock.results[0]
			?.value as
			| ReturnType<typeof createCurrentChatInfoStoreStub>
			| undefined;
		host.querySelector<HTMLButtonElement>(
			"#mobile-chat-main-menu-trigger",
		)?.click();

		expect(currentChatInfoStore?.refresh).toHaveBeenCalledTimes(1);

		feature.dispose();
	});

	test("does not refresh current chat info when opening the main menu for a ready active chat", async () => {
		document.body.innerHTML = `
      <div id="form_sheld">
      <form id="send_form">
        <div id="nonQRFormItems">
          <textarea id="send_textarea"></textarea>
          <div id="rightSendForm"></div>
        </div>
      </form>
      </div>
    `;

		const identitySnapshot = {
			avatarSource: "group" as const,
			characterId: null,
			chatFileName: "raid-night",
			entityName: "Raid Party",
			groupId: "group-1",
			hasActiveChat: true,
			kind: "group" as const,
			thumbnailUrl: "/thumbs/groups/raid-party.png",
			updatedAt: 0,
		};
		const infoSnapshot = {
			dominantModel: "",
			fileSize: "24 KB",
			hasActiveChat: true,
			lastMessagePreview: "",
			lastUpdatedAt: Date.parse("2026-04-22T09:00:00.000Z"),
			metadataReason: null,
			metadataStatus: "ready" as const,
			messageCount: null,
			modelCounts: {},
			updatedAt: 0,
		};

		currentChatIdentityStoreFactory.mockImplementation(() => ({
			dispose: vi.fn(),
			getSnapshot: vi.fn(() => identitySnapshot),
			refresh: vi.fn(),
			subscribe: vi.fn(() => vi.fn()),
		}));
		currentChatInfoStoreFactory.mockImplementation(() => ({
			dispose: vi.fn(),
			getSnapshot: vi.fn(() => infoSnapshot),
			refresh: vi.fn(),
			subscribe: vi.fn(() => vi.fn()),
		}));

		ensureAstraProjectaUiInfrastructure({ documentRef: document });

		const feature = createMobileSendFormFeature({ documentRef: document });
		feature.mount();

		const host = await waitFor(() => {
			const element = document.getElementById(
				"mobile-send-form-input-row-host",
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});

		const currentChatInfoStore = currentChatInfoStoreFactory.mock.results[0]
			?.value as
			| ReturnType<typeof createCurrentChatInfoStoreStub>
			| undefined;
		host.querySelector<HTMLButtonElement>(
			"#mobile-chat-main-menu-trigger",
		)?.click();

		expect(currentChatInfoStore?.refresh).not.toHaveBeenCalled();

		feature.dispose();
	});
});

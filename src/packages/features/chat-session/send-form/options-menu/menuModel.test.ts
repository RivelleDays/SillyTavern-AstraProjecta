import { describe, expect, test, vi } from "vitest";

import { buildMobileSendFormMenuGroups } from "@/packages/features/chat-session/send-form/options-menu/menuModel";

function setSillyTavernContext(context: unknown) {
	(globalThis as { SillyTavern?: unknown }).SillyTavern = {
		getContext: () => context,
	};
}

function renderOptions(
	entries: Array<{
		hidden?: boolean;
		id: string;
	}>,
) {
	document.body.innerHTML = `
      <div id="options">
        ${entries
			.map((entry) => {
				return `<button id="${entry.id}" type="button"${
					entry.hidden ? ' style="display: none"' : ""
				}></button>`;
			})
			.join("")}
      </div>
    `;
}

describe("buildMobileSendFormMenuGroups", () => {
	test("keeps the legacy menu group order", () => {
		renderOptions([
			{ id: "option_toggle_AN" },
			{ id: "option_new_bookmark" },
			{ id: "option_regenerate" },
			{ id: "option_start_new_chat" },
			{ id: "option_delete_mes" },
		]);

		setSillyTavernContext({
			Popup: {
				show: {
					confirm: vi.fn(),
				},
			},
			characterId: 0,
			characters: [{ chat: "chat-1" }],
			chatId: "chat-1",
			chatMetadata: { main_chat: "parent-chat" },
			executeSlashCommandsWithOptions: vi.fn(),
		});

		const groups = buildMobileSendFormMenuGroups({ documentRef: document });

		expect(groups.map((group) => group.key)).toEqual([
			"prompt-panels",
			"checkpoints",
			"generation",
			"chat-session",
			"danger-zone",
		]);
	});

	test("uses checkpoint-derived visibility for back-to-parent and convert-to-group actions", () => {
		renderOptions([]);

		setSillyTavernContext({
			characterId: 0,
			characters: [{ chat: "chat-1" }],
			chatId: "chat-1",
			chatMetadata: { main_chat: "parent-chat" },
		});

		const groups = buildMobileSendFormMenuGroups({ documentRef: document });
		const checkpointGroup = groups.find(
			(group) => group.key === "checkpoints",
		);
		const chatSessionGroup = groups.find(
			(group) => group.key === "chat-session",
		);

		expect(checkpointGroup?.actions.map((action) => action.key)).toEqual([
			"save_checkpoint",
			"back_to_parent_chat",
		]);
		expect(
			checkpointGroup?.actions.every(
				(action) => action.isEnabled === false,
			),
		).toBe(true);
		expect(chatSessionGroup?.actions.map((action) => action.key)).toContain(
			"convert_to_group",
		);
	});

	test("hides slash-command actions until slash support and an active chat are available", () => {
		renderOptions([{ id: "option_delete_mes" }]);

		setSillyTavernContext({
			chatId: "",
			chatMetadata: {},
		});

		const withoutSlashSupport = buildMobileSendFormMenuGroups({
			documentRef: document,
		});

		expect(
			withoutSlashSupport.some((group) =>
				group.actions.some((action) => action.key === "delete_chat"),
			),
		).toBe(false);

		setSillyTavernContext({
			Popup: {
				show: {
					confirm: vi.fn(),
				},
			},
			chatId: "chat-1",
			chatMetadata: {},
			executeSlashCommandsWithOptions: vi.fn(),
		});

		const withSlashSupport = buildMobileSendFormMenuGroups({
			documentRef: document,
		});
		const dangerZoneGroup = withSlashSupport.find(
			(group) => group.key === "danger-zone",
		);

		expect(dangerZoneGroup?.actions.map((action) => action.key)).toContain(
			"delete_chat",
		);
	});

	test("filters hidden native options but keeps visible native options enabled", () => {
		renderOptions([
			{ id: "option_toggle_AN" },
			{ hidden: true, id: "option_toggle_CFG" },
		]);

		setSillyTavernContext({
			chatId: "chat-1",
			chatMetadata: {},
		});

		const groups = buildMobileSendFormMenuGroups({ documentRef: document });
		const promptPanelsGroup = groups.find(
			(group) => group.key === "prompt-panels",
		);

		expect(promptPanelsGroup?.actions.map((action) => action.key)).toEqual([
			"author_note",
		]);
		expect(promptPanelsGroup?.actions[0]?.isEnabled).toBe(true);
	});

	test("places reload page before close chat and keeps it visible without native reload controls", () => {
		renderOptions([{ id: "option_close_chat" }]);

		setSillyTavernContext({
			chatId: "chat-1",
			chatMetadata: {},
			groupId: "group-1",
		});

		const visibleGroups = buildMobileSendFormMenuGroups({
			documentRef: document,
		});
		const visibleChatSessionGroup = visibleGroups.find(
			(group) => group.key === "chat-session",
		);

		expect(
			visibleChatSessionGroup?.actions.map((action) => action.key),
		).toEqual(["reload_page", "close_chat"]);

		renderOptions([]);

		const noNativeReloadGroups = buildMobileSendFormMenuGroups({
			documentRef: document,
		});
		const noNativeReloadChatSessionGroup = noNativeReloadGroups.find(
			(group) => group.key === "chat-session",
		);

		expect(
			noNativeReloadChatSessionGroup?.actions.map((action) => action.key),
		).toEqual(["reload_page"]);
	});

	test("translates group labels, action labels, and confirm copy through Astra i18n keys", () => {
		renderOptions([
			{ id: "option_toggle_AN" },
			{ id: "option_delete_mes" },
		]);

		setSillyTavernContext({
			Popup: {
				show: {
					confirm: vi.fn(),
				},
			},
			chatId: "chat-1",
			chatMetadata: {},
			executeSlashCommandsWithOptions: vi.fn(),
			translate: vi.fn((text: string, key: string) => `${key}::${text}`),
		});

		const groups = buildMobileSendFormMenuGroups({ documentRef: document });
		const promptPanelsGroup = groups.find(
			(group) => group.key === "prompt-panels",
		);
		const dangerZoneGroup = groups.find(
			(group) => group.key === "danger-zone",
		);
		const deleteChatAction = dangerZoneGroup?.actions.find(
			(action) => action.key === "delete_chat",
		);

		expect(promptPanelsGroup?.label).toBe(
			"sendForm.options.group.promptPanels::Prompt Panels",
		);
		expect(promptPanelsGroup?.actions[0]?.label).toBe(
			"sendForm.options.action.authorNote::Author's Note",
		);
		expect(
			groups
				.find((group) => group.key === "chat-session")
				?.actions.find((action) => action.key === "reload_page")?.label,
		).toBe("sendForm.options.action.reloadPage::Reload page");
		expect(deleteChatAction?.label).toBe(
			"sendForm.options.action.deleteChat::Delete chat",
		);
		expect(deleteChatAction?.kind).toBe("slash-command");
		expect(
			deleteChatAction?.kind === "slash-command"
				? deleteChatAction.confirmTitle
				: null,
		).toBe("sendForm.options.action.deleteChatConfirm::Are you sure?");
	});
});

export const PLACEHOLDERS = {
	description: "Describe your character's physical and mental traits here.",
	greeting: 'This will be the first message from the character that starts every chat.',
	alternateGreeting: 'This will be the first message from the character that starts every chat.',
	exampleMessages: '(Examples of chat dialog. Begin each example with <START> on a new line.)',
	scenario: '(Circumstances and context of the interaction)',
	depthPrompt: '(Text to be inserted in-chat @ designated depth and role)',
	personality: '(A brief description of the personality)',
	mainPrompt:
		'Any contents here will replace the default Main Prompt used for this character.\n(v2 spec: system_prompt)',
	postHistoryInstructions:
		'Any contents here will replace the default Post-History Instructions used for this character.\n(v2 spec: post_history_instructions)',
	creator: "(Botmaker's name / Contact Info)",
	characterVersion: '(If you want to track character versions)',
	creatorNotes:
		'(Describe the bot, give use tips, or list the chat models it has been tested on. This will be displayed in the character list.)',
	tags: 'Tags used to categorize the character card on the website.',
}

export const FIELD_HELPERS = {
	description:
		"Always included in the prompt. Put the facts the AI must remember here—appearance, background, key traits, and any important world details.",
	greeting:
		"Sent once when a new chat starts. This strongly sets the character's voice, tone, and typical response length (Markdown/HTML supported).",
	alternateGreetings:
		'Extra options for the first message. You can swipe between them when starting a chat; in group chats, one may be picked at random.',
	exampleMessages: {
		intro: 'Examples that teach how the character speaks.',
		bullets: {
			start: {
				prefix: 'Start each block with',
				suffix: 'on its own line.',
			},
			labels: {
				prefix: 'Use',
				suffix: 'to label lines.',
			},
		},
		tokens: {
			start: '<START>',
			user: '{{user}}:',
			character: '{{char}}:',
		},
	},
	scenario: 'The circumstances and context of the interaction. Always included in the prompt.',
	depthPrompt: {
		intro:
			'An in-chat prompt injection that stays at a fixed depth in history. Use it to reinforce traits, rules, or reminders.',
		bullets: [
			{
				highlight: '@Depth',
				body: 'sets how many messages back to insert (0 places it after the latest message).',
			},
			{
				highlight: 'Role',
				body: 'chooses whether the injected message is sent as System, User, or Assistant.',
			},
		],
	},
	personality: 'A brief personality summary. Always included in the prompt.',
	talkativeness:
		'In group chats using Natural order, this indicates how naturally likely the character is to speak, on a scale from 0% to 100% (50% is the default).',
	mainPrompt:
		"For Chat Completion and Instruct Mode. If 'Prefer Char. Prompt' is enabled, this replaces the default Main Prompt. Use {{original}} to include the system default.",
	postHistoryInstructions:
		"For Chat Completion and Instruct Mode. If 'Prefer Char. Instructions' is enabled, this replaces the default Post-History Instructions. Use {{original}} to include the system default.",
	creatorNotes:
		'Optional notes for users (not used for prompt building). The first lines show in the character list; the full text shows on the character page (Markdown/HTML supported).',
	tags: 'Optional tags embedded with the character card. Not imported by default, but you can merge them from the More... menu.',
}

export const COMMON_COPY = {
	notProvided: 'Not provided.',
	helperDescription: 'Field details',
	helperFallback: 'No details provided.',
}

export const TALKATIVENESS_COPY = {
	references: ['Shy', 'Normal', 'Chatty'],
}

export const ALT_GREETINGS_COPY = {
	label: index => `Alt Greet #${index + 1}`,
	empty: 'No alternate greetings yet.',
	actions: {
		moveUp: 'Move greeting up',
		moveDown: 'Move greeting down',
		delete: 'Delete greeting',
	},
	addButton: 'Add greeting',
}

export const TAGS_COPY = {
	empty: 'No tags yet.',
	addButton: 'Add',
}

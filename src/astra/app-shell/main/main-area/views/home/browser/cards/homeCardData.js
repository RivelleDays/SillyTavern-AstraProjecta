export function buildHomeCardSnapshot(character, index = 0) {
	const key = resolveCharacterKey(character) ?? `index-${index}`
	const normalizedName = typeof character?.name === 'string' ? character.name.trim() : ''
	const avatarId = typeof character?.avatarId === 'string' ? character.avatarId.trim() : ''
	const creatorName = resolveCreatorName(character)
	const creatorNotes = resolveCreatorNotes(character)
	const version = resolveCharacterVersion(character)
	const creationDate = resolveCharacterCreationDate(character)
	const avatarAssetId = resolveAvatarAssetId(character)
	const badges = summarizeTagBadgesForSignature(character?.tagBadges)
	const extensions = resolveExtensionsSnapshot(character)
	const isFavorite = character?.isFavorite === true
	const payload = {
		key,
		name: normalizedName,
		avatarId,
		isFavorite,
		version,
		creatorName,
		creatorNotes,
		creationDate,
		tagBadges: badges,
		avatarAssetId,
		extensions,
	}
	return stableStringify(payload)
}

export function resolveCharacterKey(character) {
	const numericId = Number(character?.id)
	if (Number.isFinite(numericId)) {
		return String(numericId)
	}
	if (character?.id !== undefined && character?.id !== null) {
		return String(character.id)
	}
	return null
}

export function resolveCreatorNotes(character) {
	const raw = character?.raw ?? {}
	const fromData = typeof raw?.data?.creator_notes === 'string' ? raw.data.creator_notes.trim() : ''
	if (fromData) return fromData
	const legacy = typeof raw?.creatorcomment === 'string' ? raw.creatorcomment.trim() : ''
	return legacy
}

export function resolveCreatorName(character) {
	const raw = character?.raw ?? {}
	const fromData = typeof raw?.data?.creator === 'string' ? raw.data.creator.trim() : ''
	if (fromData) return fromData
	const legacy = typeof raw?.creator === 'string' ? raw.creator.trim() : ''
	return legacy
}

export function resolveCharacterVersion(character) {
	const raw = character?.raw ?? {}
	const fromData =
		typeof raw?.data?.character_version === 'string' ? raw.data.character_version.trim() : ''
	return fromData
}

export function resolveCharacterCreationDate(character) {
	const raw = character?.raw ?? {}
	const fromRoot = typeof raw?.create_date === 'string' ? raw.create_date.trim() : ''
	return fromRoot
}

export function resolveAvatarAssetId(character) {
	if (typeof character?.raw?.avatar === 'string' && character.raw.avatar) {
		return character.raw.avatar
	}
	if (typeof character?.raw?.avatar_url === 'string' && character.raw.avatar_url) {
		return character.raw.avatar_url
	}
	if (typeof character?.avatarId === 'string' && character.avatarId) {
		return character.avatarId
	}
	if (typeof character?.avatar === 'string' && character.avatar) {
		return character.avatar
	}
	return ''
}

export function resolveExtensionsSnapshot(character) {
	const extensions = character?.raw?.data?.extensions
	if (!extensions || typeof extensions !== 'object') {
		return null
	}
	return extensions
}

function summarizeTagBadgesForSignature(badges) {
	if (!Array.isArray(badges) || !badges.length) return []
	return badges.map(tag => ({
		id:
			typeof tag?.id === 'string'
				? tag.id
				: Number.isFinite(tag?.id)
					? String(tag.id)
					: '',
		name: typeof tag?.name === 'string' ? tag.name : '',
		variant: typeof tag?.variant === 'string' ? tag.variant : '',
		icon: typeof tag?.icon === 'string' ? tag.icon : '',
	}))
}

function stableStringify(value) {
	if (value === null || value === undefined) {
		return 'null'
	}
	if (typeof value !== 'object') {
		return JSON.stringify(value)
	}
	if (Array.isArray(value)) {
		const serialized = value.map(entry => stableStringify(entry))
		return `[${serialized.join(',')}]`
	}
	const keys = Object.keys(value).sort()
	const pairs = keys.map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
	return `{${pairs.join(',')}}`
}

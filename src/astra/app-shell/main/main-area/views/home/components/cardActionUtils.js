import { ensureAstraPortalHost } from '@/astra/shared/dom/portalHost.js'

const PORTAL_HOST_ID = 'astra-dialog-host'

export function resolveFavoriteState(getFavoriteState) {
	if (typeof getFavoriteState !== 'function') {
		return false
	}
	try {
		return Boolean(getFavoriteState())
	} catch {
		return false
	}
}

export function formatFileSize(bytes) {
	const value = Number(bytes)
	if (!Number.isFinite(value) || value < 0) {
		return ''
	}
	if (value < 1024) {
		return `${value} B`
	}
	const kilobytes = value / 1024
	if (kilobytes < 1024) {
		return `${kilobytes >= 100 ? Math.round(kilobytes) : kilobytes.toFixed(1)} KB`
	}
	const megabytes = kilobytes / 1024
	return `${megabytes >= 100 ? Math.round(megabytes) : megabytes.toFixed(1)} MB`
}

export function extractFileExtension(filename = '') {
	const [, ext = ''] = filename.toLowerCase().match(/\.([a-z0-9]+)$/) ?? []
	return ext
}

export function isPreviewableFile(file) {
	if (!(file instanceof File)) return false
	if (typeof file.type === 'string' && file.type.startsWith('image/')) {
		return true
	}
	const ext = extractFileExtension(file.name)
	return ext === 'png'
}

export function dataTransferContainsFiles(dataTransfer) {
	if (!dataTransfer) return false
	const { types } = dataTransfer
	if (!types) return false
	if (typeof types.contains === 'function') {
		return types.contains('Files')
	}
	return Array.from(types).includes('Files')
}

export function ensureAppWrapperPortalHost() {
	const host = ensureAstraPortalHost(PORTAL_HOST_ID)
	if (host) {
		host.dataset.astraPortalScope = 'home'
	}
	return host
}

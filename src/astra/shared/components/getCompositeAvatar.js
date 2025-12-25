const DEFAULT_AVATAR = '/img/five.png'
const FAILED_THUMBNAILS = new Set()

function isCustomAvatarUrl(url) {
	if (!url) return false
	const trimmed = url.trim()
	if (!trimmed) return false
	return !(
		trimmed.includes('/img/ai') ||
		/img\/ai\d+\.png/.test(trimmed) ||
		trimmed.includes('/img/five') ||
		trimmed.startsWith('img/ai') ||
		trimmed.startsWith('/img/ai')
	)
}

function makeThumbnailUrl(fileId) {
	if (!fileId && fileId !== 0) return DEFAULT_AVATAR
	const idString = String(fileId).trim()
	if (!idString || idString === 'none' || FAILED_THUMBNAILS.has(idString)) return DEFAULT_AVATAR

	if (typeof globalThis?.getThumbnailUrl === 'function') {
		try {
			const normalized = globalThis.getThumbnailUrl('avatar', idString)
			if (normalized) return normalized
		} catch (error) {
			console?.warn?.('[AstraProjecta] Failed to build thumbnail url via getThumbnailUrl.', error)
		}
	}

	const encoded = encodeURIComponent(idString)
	return `/thumbnail?type=avatar&file=${encoded}`
}

function getGroupMemberIds(entity) {
	if (!entity) return []
	const combined = [
		...(entity.members ?? []),
		...(entity.disabled_members ?? []),
	]
		.filter(id => id !== undefined && id !== null)
		.map(id => String(id))
	return combined.filter((id, index, list) => index === list.indexOf(id))
}

function getDevicePixelRatio() {
	if (typeof window === 'undefined') return 1
	const ratio = Number(window.devicePixelRatio) || 1
	return Math.max(1, Math.floor(ratio))
}

function createCanvas(size) {
	if (typeof document === 'undefined') return null
	const cssSize = Math.max(1, Number(size) || 45)
	const dpr = getDevicePixelRatio()
	const canvas = document.createElement('canvas')
	canvas.width = cssSize * dpr
	canvas.height = cssSize * dpr
	const context = canvas.getContext('2d')
	if (!context) return null
	context.imageSmoothingEnabled = true
	context.imageSmoothingQuality = 'high'
	return { canvas, context, cssSize, dpr }
}

function isImageReady(img) {
	return Boolean(img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0)
}

function drawImageCover(context, img, dx, dy, dw, dh) {
	if (!isImageReady(img)) return
	const naturalWidth = img.naturalWidth
	const naturalHeight = img.naturalHeight
	const destinationRatio = dw / dh
	const imageRatio = naturalWidth / naturalHeight
	let sx, sy, sw, sh
	if (imageRatio > destinationRatio) {
		sh = naturalHeight
		sw = naturalHeight * destinationRatio
		sx = (naturalWidth - sw) * 0.5
		sy = 0
	} else {
		sw = naturalWidth
		sh = naturalWidth / destinationRatio
		sx = 0
		sy = (naturalHeight - sh) * 0.5
	}
	context.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
}

function loadImage(src) {
	if (typeof Image === 'undefined') return Promise.resolve(null)
	return new Promise(resolve => {
		const finish = img => resolve(isImageReady(img) ? img : null)
		const img = new Image()
		img.decoding = 'async'
		img.loading = 'eager'
		img.addEventListener('load', () => finish(img))
		img.addEventListener('error', () => resolve(null))
		img.src = src
		if (img.complete) finish(img)
	})
}

const compositeCache = new Map()

async function renderGroupComposite(entity, options) {
	if (!entity) return options.fallback
	const members = getGroupMemberIds(entity)
	if (!members.length) return options.fallback
	if (members.length === 1) return makeThumbnailUrl(members[0])

	const cacheKey = [
		entity.id ?? 'group',
		members.join(','),
		options.size,
		getDevicePixelRatio(),
	].join('::')

	if (compositeCache.has(cacheKey)) return compositeCache.get(cacheKey)

	const canvasInfo = createCanvas(options.size)
	if (!canvasInfo) return options.fallback
	const { canvas, context } = canvasInfo
	const S = canvas.width
	const half = Math.floor(S / 2)
	const remainder = S - half
	const [m0, m1, m2, m3] = members
	let cachedFallbackImage
	let triedFallback = false

	const loadAndDraw = async (ids, drawFn) => {
		const urls = ids.map(makeThumbnailUrl)
		const images = await Promise.all(
			urls.map((url, idx) =>
				loadImage(url).then(img => {
					if (!img) {
						const failedId = ids[idx]
						if (failedId) FAILED_THUMBNAILS.add(String(failedId).trim())
					}
					return img
				}),
			),
		)
		let fallbackImage = images.find(Boolean) || null
		if (!fallbackImage && options.fallback && !triedFallback) {
			triedFallback = true
			cachedFallbackImage = await loadImage(options.fallback)
		}
		fallbackImage = fallbackImage || cachedFallbackImage || null
		const safeImages = images.map(img => (img && isImageReady(img) ? img : fallbackImage))
		drawFn(safeImages)
	}

	if (members.length === 2) {
		await loadAndDraw([m0, m1], ([i0, i1]) => {
			drawImageCover(context, i0, 0, 0, half, S)
			drawImageCover(context, i1, half, 0, remainder, S)
		})
	} else if (members.length === 3) {
		await loadAndDraw([m0, m1, m2], ([i0, i1, i2]) => {
			drawImageCover(context, i0, 0, 0, half, half)
			drawImageCover(context, i1, half, 0, remainder, half)
			drawImageCover(context, i2, 0, half, S, remainder)
		})
	} else {
		const ids = [m0, m1, m2, m3].filter(Boolean)
		await loadAndDraw(ids, ([i0, i1, i2, i3] = []) => {
			drawImageCover(context, i0, 0, 0, half, half)
			drawImageCover(context, i1, half, 0, remainder, half)
			drawImageCover(context, i2, 0, half, half, remainder)
			drawImageCover(context, i3, half, half, remainder, remainder)
		})
	}

	const dataUrl = canvas.toDataURL('image/png')
	compositeCache.set(cacheKey, dataUrl)
	return dataUrl
}

export async function getCompositeAvatar(entity, options = {}) {
	const fallback = options.fallback || DEFAULT_AVATAR
	if (!entity) return fallback

	const candidateUrl = entity.avatar_url
	if (isCustomAvatarUrl(candidateUrl)) return candidateUrl.trim()

	if (entity.avatar) {
		const thumb = makeThumbnailUrl(entity.avatar)
		if (!thumb || thumb === fallback) return fallback

		const loaded = await loadImage(thumb)
		if (loaded && isImageReady(loaded)) {
			return thumb
		}

		const idString = String(entity.avatar).trim()
		if (idString) FAILED_THUMBNAILS.add(idString)
		return fallback
	}

	if (Array.isArray(entity.members)) {
		return renderGroupComposite(entity, { size: options.size || 45, fallback })
	}

	return fallback
}

export { DEFAULT_AVATAR }

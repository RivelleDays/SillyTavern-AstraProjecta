const BLOCK_WEBP_PREVIEWS_EVERYWHERE = false;
const WEBP_EXTENSION_PATTERN = /\.webp(?:$|[?#])/i;
const DATA_WEBP_PATTERN = /^data:image\/webp/i;
const MOBILE_UA_PATTERN = /android|iphone|ipad|ipod|windows phone/i;

let cachedIsMobile = null;

export function isLikelyMobileDevice() {
	if (cachedIsMobile !== null) {
		return cachedIsMobile;
	}
	if (typeof navigator === 'undefined') {
		cachedIsMobile = false;
		return cachedIsMobile;
	}
	const agent = navigator.userAgent || navigator.vendor || '';
	cachedIsMobile = MOBILE_UA_PATTERN.test(agent);
	return cachedIsMobile;
}

function extractCssUrl(value) {
	if (typeof value !== 'string') return null;
	const match = value.match(/url\((['"]?)(.*?)\1\)/i);
	if (match && match[2]) {
		return match[2];
	}
	return null;
}

function isWebpUrl(candidate) {
	if (typeof candidate !== 'string' || !candidate) return false;
	return WEBP_EXTENSION_PATTERN.test(candidate) || DATA_WEBP_PATTERN.test(candidate);
}

export function isWebpPreview(previewBg) {
	if (!previewBg) return false;
	if (isWebpUrl(previewBg.previewUrl)) return true;
	if (isWebpUrl(previewBg.originalUrl)) return true;
	const cssUrl = extractCssUrl(previewBg.cssImage);
	return isWebpUrl(cssUrl);
}

export function shouldBlockWebpEverywhere() {
	if (BLOCK_WEBP_PREVIEWS_EVERYWHERE) return true;
	if (typeof window === 'undefined') return false;
	const globalFlag = window.AstraProjecta?.disableWebpChatPreviews;
	return typeof globalFlag === 'boolean' ? globalFlag : false;
}

export function applyPreviewToElement(element, previewBg) {
	if (!element) return;
	const shouldBlockPreview = Boolean(previewBg?.cssImage)
		&& isWebpPreview(previewBg)
		&& (shouldBlockWebpEverywhere() || isLikelyMobileDevice());
	if (shouldBlockPreview) {
		element.classList.remove('has-chat-bg');
		element.style.removeProperty('--chat-preview-image');
		delete element.dataset.previewBg;
		delete element.dataset.previewSource;
		return;
	}
	if (previewBg?.cssImage) {
		element.classList.add('has-chat-bg');
		element.style.setProperty('--chat-preview-image', previewBg.cssImage);
		if (previewBg.previewUrl) {
			element.dataset.previewBg = previewBg.previewUrl;
		} else {
			delete element.dataset.previewBg;
		}
		if (previewBg.source) {
			element.dataset.previewSource = previewBg.source;
		} else {
			delete element.dataset.previewSource;
		}
	} else {
		element.classList.remove('has-chat-bg');
		element.style.removeProperty('--chat-preview-image');
		delete element.dataset.previewBg;
		delete element.dataset.previewSource;
	}
}

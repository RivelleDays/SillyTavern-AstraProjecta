import { getLucideIconMarkup } from '@/astra/shared/icons/lucide'

const INFO_ICON = getLucideIconMarkup('info', { strokeWidth: 2.25 })

function normalizeClassList(className) {
	if (!className) return []
	if (Array.isArray(className)) return className
	return String(className)
		.split(' ')
		.map((value) => value.trim())
		.filter(Boolean)
}

/**
 * Renders a static instruction banner with an icon and supporting text.
 * @param {object} options
 * @param {string} options.text - Text content to display inside the banner.
 * @param {string} [options.icon=INFO_ICON] - Optional SVG markup for the icon.
 * @param {string|string[]} [options.className] - Additional class names to apply to the root element.
 * @param {'info'|'warning'|'danger'} [options.tone='info'] - Visual tone to attach to the banner.
 */
export function createInstructionBanner({
	text,
	icon = INFO_ICON,
	className,
	tone = 'info',
} = {}) {
	const root = document.createElement('div')
	root.classList.add('instruction-banner', `instruction-banner--${tone}`)
	root.setAttribute('role', 'note')
	normalizeClassList(className).forEach((value) => root.classList.add(value))

	const iconWrapper = document.createElement('span')
	iconWrapper.className = 'instruction-banner__icon'
	iconWrapper.setAttribute('aria-hidden', 'true')
	iconWrapper.innerHTML = icon

	const textWrapper = document.createElement('p')
	textWrapper.className = 'instruction-banner__text'
	const hasNodeConstructor = typeof Node !== 'undefined'

	if (hasNodeConstructor && text instanceof Node) {
		textWrapper.append(text)
	} else if (typeof text !== 'undefined') {
		textWrapper.textContent = String(text)
	}

	root.append(iconWrapper, textWrapper)

	return {
		root,
		setText(nextText) {
			textWrapper.textContent = ''
			if (hasNodeConstructor && nextText instanceof Node) {
				textWrapper.append(nextText)
			} else if (typeof nextText !== 'undefined') {
				textWrapper.textContent = String(nextText)
			}
		},
	}
}

export { INFO_ICON as INSTRUCTION_BANNER_INFO_ICON }

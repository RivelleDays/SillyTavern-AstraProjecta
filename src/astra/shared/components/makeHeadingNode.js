/**
 * Builds a structured heading node: [icon] | [label].
 * Accepts Node, string, or { icon, label } descriptors.
 * @param {Node|string|{icon: string, label: string}} input
 * @returns {Node}
 */
function makeHeadingNode(input) {
	if (input instanceof Node) return input

	if (typeof input === 'string') {
		const wrap = document.createElement('div')
		wrap.innerHTML = input
		return wrap.firstElementChild || document.createTextNode(wrap.textContent || '')
	}

	if (input && typeof input === 'object') {
		const { icon = '', label = '' } = input
		const root = document.createElement('span')
		root.className = 'sts-heading'
		const iconWrap = document.createElement('span')
		iconWrap.className = 'sts-heading__icon'
		iconWrap.innerHTML = icon
		const text = document.createElement('span')
		text.className = 'sts-heading__label'
		text.textContent = label || ''
		root.append(iconWrap, text)
		return root
	}

	const span = document.createElement('span')
	span.textContent = String(input ?? '')
	return span
}

export { makeHeadingNode }

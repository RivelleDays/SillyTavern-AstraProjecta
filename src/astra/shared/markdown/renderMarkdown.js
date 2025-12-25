import MarkdownIt from 'markdown-it'

const markdownRenderer = new MarkdownIt({
	html: false,
	linkify: true,
	breaks: true,
})

function escapeHtml(value) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')
}

function fallbackMarkdownRender(source) {
	const escaped = escapeHtml(source)
	const withInline = escaped
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(/__(.+?)__/g, '<strong>$1</strong>')
		.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
		.replace(/_(.+?)_/g, '<em>$1</em>')
		.replace(/`([^`]+)`/g, '<code>$1</code>')
		.replace(/\[([^\]]+)]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

	const parts = withInline.split(/\n{2,}/)
	const paragraphs = parts.map(segment => {
		const content = segment.replace(/\n/g, '<br />')
		return `<p>${content}</p>`
	})

	return paragraphs.join('')
}

function sanitizeHtml(html) {
	const scope =
		typeof globalThis !== 'undefined'
			? globalThis
			: typeof window !== 'undefined'
				? window
				: undefined

	if (scope?.DOMPurify?.sanitize) {
		try {
			return scope.DOMPurify.sanitize(html)
		} catch {
			return html
		}
	}

	return html
}

export function renderMarkdownToHtml(source) {
	if (typeof source !== 'string') return ''

	const text = source.trim()
	if (!text) return ''

	let rendered = ''
	try {
		rendered = markdownRenderer.render(text)
	} catch (error) {
		console?.warn?.('[AstraProjecta] markdown-it rendering failed, using fallback.', error)
	}

	if (typeof rendered !== 'string' || !rendered.trim()) {
		rendered = fallbackMarkdownRender(text)
	}

	return sanitizeHtml(rendered)
}

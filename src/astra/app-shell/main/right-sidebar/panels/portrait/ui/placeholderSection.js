export function createPlaceholderSection({ title, placeholder }) {
	const section = document.createElement('div')
	section.className = 'character-portrait-section'

	const heading = document.createElement('div')
	heading.className = 'panel-title'
	heading.textContent = title
	section.append(heading)

	const subtitle = document.createElement('div')
	subtitle.className = 'panel-subtitle'
	subtitle.textContent = placeholder
	section.append(subtitle)

	return section
}

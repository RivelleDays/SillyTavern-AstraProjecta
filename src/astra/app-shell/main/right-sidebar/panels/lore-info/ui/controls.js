import { getLucideIconMarkup } from '@/astra/shared/icons/lucide'

const SORT_ICON_FLAT = getLucideIconMarkup('arrow-down-0-1')
const SORT_ICON_WORLD = getLucideIconMarkup('arrow-down-a-z')
const EXPAND_ICON = getLucideIconMarkup('expand', { strokeWidth: 1.75 })
const COLLAPSE_ICON = getLucideIconMarkup('minimize', { strokeWidth: 1.75 })

/**
 * Lore UI control builders shared between view assembly and controller logic.
 */
export function buildSortSelect({ current, onChange }) {
	const wrap = document.createElement('div')
	wrap.className = 'lore-sort'
	wrap.title = 'Sort mode'
	wrap.setAttribute('role', 'group')
	wrap.setAttribute('aria-label', 'Sort mode')

	const options = [
		{
			value: 'flat',
			label: 'Depth→Order→Title',
			icon: SORT_ICON_FLAT,
		},
		{
			value: 'world',
			label: 'Group by source/world',
			icon: SORT_ICON_WORLD,
		},
	]

	let activeValue = current
	const buttons = []
	options.forEach(({ value, label, icon }) => {
		const button = document.createElement('button')
		button.type = 'button'
		button.className = 'lore-button lore-toggle-button lore-sort-option'
		button.innerHTML = icon
		button.title = label
		button.setAttribute('aria-label', label)
		button.setAttribute('aria-pressed', value === activeValue ? 'true' : 'false')
		button.classList.toggle('is-active', value === activeValue)
		button.addEventListener('click', () => {
			if (activeValue === value) {
				return
			}
			activeValue = value
			buttons.forEach((btn) => {
				const isActive = btn === button
				btn.setAttribute('aria-pressed', isActive ? 'true' : 'false')
				btn.classList.toggle('is-active', isActive)
			})
			wrap.value = activeValue
			onChange(activeValue)
		})
		wrap.append(button)
		buttons.push(button)
	})

	wrap.value = activeValue
	return wrap
}

export function buildExpandCollapse(onExpandAll, onCollapseAll) {
	const wrap = document.createElement('span')
	wrap.className = 'lore-expcol'
	const bExp = document.createElement('button')
	bExp.className = 'lore-button'
	bExp.type = 'button'
	bExp.title = 'Expand all'
	bExp.innerHTML = EXPAND_ICON
	bExp.addEventListener('click', onExpandAll)
	const bCol = document.createElement('button')
	bCol.className = 'lore-button'
	bCol.type = 'button'
	bCol.title = 'Collapse all'
	bCol.innerHTML = COLLAPSE_ICON
	bCol.addEventListener('click', onCollapseAll)
	wrap.append(bExp, bCol)
	return wrap
}

export function buildToggleButton({ label, initial, icon, onToggle }) {
	const button = document.createElement('button')
	button.className = 'lore-button lore-toggle-button'
	button.type = 'button'
	button.innerHTML = icon
	button.title = label
	button.setAttribute('aria-label', label)
	button.setAttribute('aria-pressed', initial ? 'true' : 'false')
	button.classList.toggle('is-active', !!initial)
	button.addEventListener('click', () => {
		const next = button.getAttribute('aria-pressed') !== 'true'
		button.setAttribute('aria-pressed', next ? 'true' : 'false')
		button.classList.toggle('is-active', next)
		onToggle(next)
	})
	return button
}

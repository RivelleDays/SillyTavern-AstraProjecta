// Progressive enhancement that keeps the native <select> in the DOM while mirroring UI state into a custom dropdown.
const DROPDOWN_ARROW_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-chevron-down"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M6 9l6 6l6 -6" /></svg>'
const DROPDOWN_CHECK_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-check"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10"/></svg>'

const ROOT_ATTR = 'data-st-select'
const TARGET_ATTR = 'data-st-select-upgrade'
const SELECTOR = `select[${TARGET_ATTR}]:not([${ROOT_ATTR}="native"]):not([${ROOT_ATTR}="no-upgrade"])`

const OPEN_CLASS = 'st-select--open'
const WRAPPER_CLASS = 'st-select'
const BUTTON_CLASS = 'st-select__button'
const LABEL_CLASS = 'st-select__label'
const ICON_CLASS = 'st-select__icon'
const MENU_CLASS = 'st-select__menu'
const OPTION_CLASS = 'st-select__option'
const OPTION_CHECK_CLASS = 'st-select__option-check'
const GROUP_LABEL_CLASS = 'st-select__group-label'
const NATIVE_CLASS = 'st-select__native'
const ACTIVE_DATA = 'data-active'

const activeInstances = new WeakSet()
const selectStates = new WeakMap()
let globalObserver = null
const queueTask =
	typeof queueMicrotask === 'function' ? queueMicrotask : callback => Promise.resolve().then(callback)

function snapshotNativeLayout(select) {
	const doc = select?.ownerDocument ?? document
	const view = doc.defaultView
	if (!view) return null
	const computed = view.getComputedStyle(select)
	return {
		display: computed.display,
		marginTop: computed.marginTop,
		marginRight: computed.marginRight,
		marginBottom: computed.marginBottom,
		marginLeft: computed.marginLeft,
		flexGrow: computed.flexGrow,
		flexShrink: computed.flexShrink,
		flexBasis: computed.flexBasis,
		alignSelf: computed.alignSelf,
	}
}

function applyNativeLayout(state) {
	const { wrapper, nativeLayout } = state
	if (!wrapper || !nativeLayout) return

	const display = nativeLayout.display?.includes('inline') ? 'inline-flex' : 'flex'
	wrapper.style.display = display || 'inline-flex'
	wrapper.style.flexGrow = nativeLayout.flexGrow ?? ''
	wrapper.style.flexShrink = nativeLayout.flexShrink ?? ''
	wrapper.style.flexBasis = nativeLayout.flexBasis ?? ''
	wrapper.style.alignSelf = nativeLayout.alignSelf ?? ''
}

function createWrapper(doc) {
	const wrapper = doc.createElement('div')
	wrapper.className = WRAPPER_CLASS
	wrapper.setAttribute(ROOT_ATTR, 'wrapper')
	return wrapper
}

function createButton(doc) {
	const button = doc.createElement('button')
	button.type = 'button'
	button.className = BUTTON_CLASS
	button.setAttribute('aria-haspopup', 'listbox')
	button.setAttribute('aria-expanded', 'false')
	button.setAttribute('role', 'combobox')
	return button
}

function createLabel(doc) {
	const label = doc.createElement('span')
	label.className = LABEL_CLASS
	return label
}

function createIcon(doc) {
	const icon = doc.createElement('span')
	icon.className = ICON_CLASS
	icon.innerHTML = DROPDOWN_ARROW_ICON
	return icon
}

function createMenu(doc) {
	const menu = doc.createElement('ul')
	menu.className = MENU_CLASS
	menu.setAttribute('role', 'listbox')
	menu.setAttribute('tabindex', '-1')
	return menu
}

function createOption({ doc, optionNode, selectId, index }) {
	const item = doc.createElement('li')
	item.className = OPTION_CLASS
	item.setAttribute('role', 'option')
	item.id = `${selectId}-option-${index}`

	const text = doc.createElement('span')
	text.className = `${OPTION_CLASS}-text`
	text.textContent = optionNode.textContent ?? ''
	item.append(text)

	const check = doc.createElement('span')
	check.className = OPTION_CHECK_CLASS
	check.innerHTML = DROPDOWN_CHECK_ICON
	item.append(check)

	item.dataset.value = optionNode.value ?? ''
	if (optionNode.title) item.title = optionNode.title

	if (optionNode.disabled) {
		item.setAttribute('aria-disabled', 'true')
		item.tabIndex = -1
	} else {
		item.tabIndex = -1
	}

	if (optionNode.hidden) {
		item.hidden = true
		item.setAttribute('aria-hidden', 'true')
	}

	return item
}

function createGroupLabel(doc, labelText) {
	const groupLabel = doc.createElement('li')
	groupLabel.className = GROUP_LABEL_CLASS
	groupLabel.setAttribute('role', 'presentation')
	groupLabel.textContent = labelText ?? ''
	return groupLabel
}

function updateLabelText({ labelEl, select }) {
	const selectedOption = select.selectedOptions?.[0] ?? select.options?.[select.selectedIndex]
	if (selectedOption) {
		labelEl.textContent = selectedOption.textContent ?? ''
	} else {
		const firstEnabled = Array.from(select.options || []).find(opt => !opt.disabled)
		labelEl.textContent = firstEnabled ? firstEnabled.textContent ?? '' : ''
	}
}

function getEnabledOptions(state) {
	return state.optionElements.filter(el => el.getAttribute('aria-disabled') !== 'true')
}

function setActiveOption(state, optionEl) {
	if (!optionEl || state.activeOption === optionEl) return
	if (state.activeOption) state.activeOption.removeAttribute(ACTIVE_DATA)
	optionEl.setAttribute(ACTIVE_DATA, 'true')
	state.activeOption = optionEl
	state.button.setAttribute('aria-activedescendant', optionEl.id)
}

function setSelectedOption(state, optionEl, { fireEvent = true } = {}) {
	if (!optionEl || optionEl.getAttribute('aria-disabled') === 'true') return

	const { select, labelEl } = state
	const value = optionEl.dataset.value ?? ''
	const previousSelected = state.selectedOption
	if (previousSelected === optionEl && select.value === value) {
		updateLabelText({ labelEl, select })
		setActiveOption(state, optionEl)
		return
	}

	state.optionElements.forEach(el => {
		if (el.getAttribute('role') !== 'option') return
		if (el === optionEl) {
			el.setAttribute('aria-selected', 'true')
		} else {
			el.removeAttribute('aria-selected')
		}
	})

	state.selectedOption = optionEl
	setActiveOption(state, optionEl)
	updateLabelText({ labelEl, select })

	if (select.value !== value) {
		select.value = value
		if (fireEvent) select.dispatchEvent(new Event('change', { bubbles: true }))
	}
}

function closeMenu(state, { focusButton = true } = {}) {
	if (!state.isOpen) return
	state.isOpen = false
	state.wrapper.classList.remove(OPEN_CLASS)
	state.button.setAttribute('aria-expanded', 'false')
	document.removeEventListener('pointerdown', state.handlePointerDown, true)
	document.removeEventListener('focusin', state.handleFocusIn, true)
	state.menu.removeEventListener('keydown', state.handleMenuKeydown)
	if (focusButton) state.button.focus({ preventScroll: true })
}

function openMenu(state) {
	if (state.isOpen || state.disabled) return
	state.isOpen = true
	state.wrapper.classList.add(OPEN_CLASS)
	state.button.setAttribute('aria-expanded', 'true')
	document.addEventListener('pointerdown', state.handlePointerDown, true)
	document.addEventListener('focusin', state.handleFocusIn, true)
	state.menu.addEventListener('keydown', state.handleMenuKeydown)
	state.menu.focus({ preventScroll: true })
}

function focusNextOption(state, direction) {
	const enabled = getEnabledOptions(state)
	if (!enabled.length) return

	let nextIndex = enabled.indexOf(state.activeOption) + direction
	if (nextIndex < 0) {
		nextIndex = enabled.length - 1
	} else if (nextIndex >= enabled.length) {
		nextIndex = 0
	}

	const nextOption = enabled[nextIndex]
	if (nextOption) {
		setActiveOption(state, nextOption)
		nextOption.scrollIntoView({ block: 'nearest' })
	}
}

function handleButtonClick(state, event) {
	event.preventDefault()
	event.stopPropagation()
	if (state.isOpen) {
		closeMenu(state, { focusButton: false })
	} else {
		openMenu(state)
	}
}

function handleButtonKeydown(state, event) {
	if (state.disabled) return

	switch (event.key) {
		case 'ArrowDown':
		case 'ArrowUp':
			event.preventDefault()
			openMenu(state)
			focusNextOption(state, event.key === 'ArrowDown' ? 1 : -1)
			break
		case 'Enter':
		case ' ':
			event.preventDefault()
			openMenu(state)
			break
		default:
			break
	}
}

function handleMenuClick(state, event) {
	const target = event.target?.closest(`.${OPTION_CLASS}`)
	if (!target || target.getAttribute('aria-disabled') === 'true') return
	event.preventDefault()
	event.stopPropagation()
	setSelectedOption(state, target)
	closeMenu(state)
}

function handleMenuKeydown(state, event) {
	switch (event.key) {
		case 'Escape':
			event.preventDefault()
			closeMenu(state)
			break
		case 'ArrowDown':
		case 'ArrowUp':
			event.preventDefault()
			focusNextOption(state, event.key === 'ArrowDown' ? 1 : -1)
			break
		case 'Home':
		case 'PageUp':
			event.preventDefault()
			{
				const enabled = getEnabledOptions(state)
				if (enabled.length) setActiveOption(state, enabled[0])
			}
			break
		case 'End':
		case 'PageDown':
			event.preventDefault()
			{
				const enabled = getEnabledOptions(state)
				if (enabled.length) setActiveOption(state, enabled[enabled.length - 1])
			}
			break
		case 'Enter':
		case ' ':
			event.preventDefault()
			if (state.activeOption) {
				setSelectedOption(state, state.activeOption)
				closeMenu(state)
			}
			break
		default:
			break
	}
}

function handlePointerDown(state, event) {
	const target = event.target
	if (!target) return
	if (
		!state.wrapper.contains(target) &&
		(!state.menu.contains(target) || state.menu.getAttribute('role') !== 'listbox')
	) {
		closeMenu(state, { focusButton: false })
	}
}

function handleFocusIn(state, event) {
	if (!state.wrapper.contains(event.target) && event.target !== state.menu) {
		closeMenu(state, { focusButton: false })
	}
}

function observeMutations(select, updateOptions) {
	if (!globalObserver) {
		globalObserver = new MutationObserver(mutations => {
			const handled = new Set()
			for (const mutation of mutations) {
				const target = mutation.target
				if (!(target instanceof HTMLSelectElement)) continue
				const state = selectStates.get(target)
				if (!state || handled.has(target)) continue
				handled.add(target)
				queueTask(() => updateStateOptions(state))
			}
		})
	}

	globalObserver.observe(select, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['disabled', 'hidden', 'label'],
	})

	return () => {
		globalObserver?.disconnect()
	}
}

function updateStateOptions(state) {
	const { select, menu, selectId } = state
	const doc = select.ownerDocument ?? document
	const optionElements = []
	menu.replaceChildren()

	for (let index = 0; index < select.children.length; index += 1) {
		const child = select.children[index]
		if (child instanceof HTMLOptionElement) {
			const option = createOption({ doc, optionNode: child, selectId, index: optionElements.length })
			optionElements.push(option)
			menu.append(option)
			if (child.selected) {
				option.setAttribute('aria-selected', 'true')
				state.selectedOption = option
				state.activeOption = option
			}
		} else if (child instanceof HTMLOptGroupElement) {
			if (child.label) {
				const groupLabel = createGroupLabel(doc, child.label)
				menu.append(groupLabel)
			}

			const groupOptions = Array.from(child.children).filter(
				sub =>
					sub instanceof HTMLOptionElement &&
					(sub.hidden ? false : true),
			)

			groupOptions.forEach(subOption => {
				const option = createOption({
					doc,
					optionNode: subOption,
					selectId,
					index: optionElements.length,
				})
				optionElements.push(option)
				menu.append(option)
				if (subOption.selected) {
					option.setAttribute('aria-selected', 'true')
					state.selectedOption = option
					state.activeOption = option
				}
			})
		}
	}

	state.optionElements = optionElements
	if (!state.selectedOption && optionElements.length) {
		setSelectedOption(state, optionElements[0], { fireEvent: false })
	} else if (state.selectedOption) {
		updateLabelText(state)
		state.button.setAttribute('aria-activedescendant', state.selectedOption.id)
	}
}

function upgradeSelect(select) {
	if (selectStates.has(select)) return

	const doc = select.ownerDocument ?? document
	const wrapper = createWrapper(doc)
	const button = createButton(doc)
	const label = createLabel(doc)
	const icon = createIcon(doc)
	const menu = createMenu(doc)
	const selectId = select.id || `st-select-${Math.random().toString(36).slice(2)}`
	select.id = selectId

	button.id = `${selectId}-button`
	button.setAttribute('aria-controls', `${selectId}-menu`)
	menu.id = `${selectId}-menu`
	menu.setAttribute('aria-labelledby', button.id)

	button.append(label, icon)
	wrapper.append(button, menu)
	select.after(wrapper)
	wrapper.append(select)
	select.classList.add(NATIVE_CLASS)
	select.setAttribute(ROOT_ATTR, 'upgraded')

	const nativeLayout = snapshotNativeLayout(select)
	const state = {
		select,
		wrapper,
		button,
		labelEl: label,
		iconEl: icon,
		menu,
		selectId,
		nativeLayout,
		optionElements: [],
		selectedOption: null,
		activeOption: null,
		isOpen: false,
		disabled: select.disabled,
		handlePointerDown: event => handlePointerDown(state, event),
		handleFocusIn: event => handleFocusIn(state, event),
		handleMenuKeydown: event => handleMenuKeydown(state, event),
	}

	selectStates.set(select, state)
	applyNativeLayout(state)
	updateStateOptions(state)
	updateLabelText(state)

	button.addEventListener('click', event => handleButtonClick(state, event))
	button.addEventListener('keydown', event => handleButtonKeydown(state, event))
	menu.addEventListener('click', event => handleMenuClick(state, event))
	button.addEventListener('focus', () => {
		if (!state.selectedOption && state.optionElements.length) {
			setActiveOption(state, state.optionElements[0])
		}
	})

	select.addEventListener('change', () => {
		const value = select.value
		const match = state.optionElements.find(option => option.dataset.value === value)
		if (match) setSelectedOption(state, match, { fireEvent: false })
	})

	select.addEventListener('focus', () => {
		button.focus({ preventScroll: true })
	})

	select.addEventListener('blur', () => {
		button.blur()
	})

	select.addEventListener('keydown', event => {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault()
			button.dispatchEvent(new KeyboardEvent('keydown', event))
		}
	})

	if (typeof ResizeObserver !== 'undefined') {
		const resizeObserver = new ResizeObserver(() => {
			state.nativeLayout = snapshotNativeLayout(select)
			applyNativeLayout(state)
		})
		resizeObserver.observe(select)
		state.resizeObserver = resizeObserver
	}

	state.disconnectMutations = observeMutations(select)
	activeInstances.add(state)
	return state
}

function downgradeSelect(select) {
	const state = selectStates.get(select)
	if (!state) return

	closeMenu(state, { focusButton: false })

	state.button.remove()
	state.menu.remove()
	select.classList.remove(NATIVE_CLASS)
	select.removeAttribute(ROOT_ATTR)
	state.wrapper.replaceWith(select)

	state.resizeObserver?.disconnect()
	state.disconnectMutations?.()

	selectStates.delete(select)
	activeInstances.delete(state)
}

export function initCustomSelects(root = document) {
	const selectElements = Array.from(root.querySelectorAll(SELECTOR))
	selectElements.forEach(select => upgradeSelect(select))
}

export function refreshCustomSelect(select) {
	const state = selectStates.get(select)
	if (!state) {
		upgradeSelect(select)
		return
	}

	state.disabled = select.disabled
	state.button.toggleAttribute('disabled', state.disabled)
	state.button.setAttribute('aria-disabled', state.disabled ? 'true' : 'false')

	if (state.disabled) {
		closeMenu(state, { focusButton: false })
	}

	updateStateOptions(state)
	updateLabelText(state)
}

export function teardownCustomSelect(root = document) {
	if (!root) return

	const selectElements = Array.from(root.querySelectorAll(`select[${ROOT_ATTR}="upgraded"]`))
	selectElements.forEach(select => downgradeSelect(select))
}

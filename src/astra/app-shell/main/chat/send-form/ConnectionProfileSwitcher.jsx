import React from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/astra/shared/ui/dropdownMenu'
import { MOBILE_MEDIA_QUERY } from '@/astra/mobile/utils/device.js'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { getGeneratingApi } from '../../../../../../../../../../script.js'

const SelectCtor = typeof HTMLSelectElement === 'function' ? HTMLSelectElement : null

function isSelectElement(node) {
	return SelectCtor ? node instanceof SelectCtor : false
}

function readOptionsFromSelect(selectElement) {
	if (!isSelectElement(selectElement)) {
		return { value: '', options: [] }
	}

	const options = Array.from(selectElement.options ?? []).map(option => ({
		value: option.value,
		label: option.textContent?.trim() || option.value || 'Unnamed profile',
		disabled: option.disabled,
	}))

	return {
		value: selectElement.value ?? '',
		options,
	}
}

function normalizeOnlineStatus(status) {
	if (typeof status !== 'string') return 'no_connection'
	const normalized = status.trim().toLowerCase()
	if (normalized === 'no_connection' || normalized === 'no connection...' || normalized === 'no connection') {
		return 'no_connection'
	}
	if (normalized === 'offline' || normalized === 'disconnected') return 'no_connection'
	return normalized || 'no_connection'
}

function createOfflineIconElement() {
	if (typeof document === 'undefined') return null
	const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
	icon.classList.add(
		'api-status-icon',
		'api-status-icon--offline',
		'icon-svg',
		'lucide',
		'lucide-power-off-icon',
		'lucide-power-off',
	)
	icon.setAttribute('width', '14')
	icon.setAttribute('height', '14')
	icon.setAttribute('viewBox', '0 0 24 24')
	icon.setAttribute('fill', 'none')
	icon.setAttribute('stroke', 'currentColor')
	icon.setAttribute('stroke-width', '2')
	icon.setAttribute('stroke-linecap', 'round')
	icon.setAttribute('stroke-linejoin', 'round')
	icon.setAttribute('aria-hidden', 'true')
	icon.removeAttribute('data-icon-src')

	const paths = [
		{ d: 'M18.36 6.64A9 9 0 0 1 20.77 15' },
		{ d: 'M6.16 6.16a9 9 0 1 0 12.68 12.68' },
		{ d: 'M12 2v4' },
		{ d: 'm2 2 20 20' },
	]

	paths.forEach(attrs => {
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
		Object.entries(attrs).forEach(([key, value]) => path.setAttribute(key, value))
		icon.append(path)
	})

	icon.style.visibility = 'visible'
	return icon
}

async function addApiStatusIcon(targetEl, onlineStatus, options = {}) {
	if (!targetEl) return

	const { applyLayoutStyles = true, size = 28 } = options ?? {}
	if (applyLayoutStyles) {
		const normalizedSize = Number.isFinite(size) ? Math.max(0, size) : 28
		targetEl.style.minWidth = `${normalizedSize}px`
		targetEl.style.minHeight = `${normalizedSize}px`
		targetEl.style.display = 'flex'
		targetEl.style.alignItems = 'center'
	}

	const existingIcon = targetEl.querySelector('.api-status-icon')
	const normalizedStatus = normalizeOnlineStatus(onlineStatus)

	if (normalizedStatus === 'no_connection') {
		const offlineIcon = createOfflineIconElement()
		if (offlineIcon) {
			targetEl.replaceChildren(offlineIcon)
		}
		return
	}

	let modelName = 'null'
	try {
		modelName = (typeof getGeneratingApi === 'function' && getGeneratingApi()) || 'null'
	} catch {
		modelName = 'null'
	}

	const nextSrc = `/img/${modelName}.svg`

	if (existingIcon?.dataset?.iconSrc === nextSrc) {
		existingIcon.style.visibility = 'visible'
		return
	}

	const img = new Image()
	img.classList.add('api-status-icon', 'icon-svg')
	img.decoding = 'async'
	img.loading = 'eager'
	img.dataset.iconSrc = nextSrc
	img.style.visibility = 'hidden'
	targetEl.replaceChildren(img)
	img.onload = async () => {
		try {
			const injector = typeof window !== 'undefined' ? window.SVGInject : undefined
			if (typeof injector === 'function') await injector(img)
		} catch {}
		const icon = targetEl.querySelector('.api-status-icon')
		if (icon) icon.style.visibility = 'visible'
	}
	img.onerror = () => {
		img.style.visibility = 'hidden'
	}
	img.src = nextSrc
}

export function ConnectionProfileSwitcher({ selectElement, controller, disabledLabel = 'No profiles available' }) {
	const [{ value, options }, setSnapshot] = React.useState(() => readOptionsFromSelect(selectElement))
	const [isApplying, setIsApplying] = React.useState(() => controller?.getState?.().isApplying || false)
	const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)
	const statusIconRef = React.useRef(null)
	const drawerStatusIconRef = React.useRef(null)
	const useDrawerSurface = useMediaQuery(MOBILE_MEDIA_QUERY)
	const drawerContainer = React.useMemo(
		() => (typeof document !== 'undefined' ? document.body : null),
		[],
	)

	const refreshStatusIcon = React.useCallback((statusOverride) => {
		const targets = [statusIconRef.current, drawerStatusIconRef.current].filter(Boolean)
		if (!targets.length) return
		const ctx = globalThis?.SillyTavern?.getContext?.()
		const status = normalizeOnlineStatus(statusOverride ?? ctx?.onlineStatus ?? 'no_connection')
		targets.forEach(target => {
			void addApiStatusIcon(target, status, { applyLayoutStyles: false, size: 16 })
		})
	}, [])

	const syncSnapshot = React.useCallback(() => {
		setSnapshot(readOptionsFromSelect(selectElement))
	}, [selectElement])

	React.useEffect(() => {
		if (!isSelectElement(selectElement)) return undefined

		syncSnapshot()

		const handleChange = () => {
			setSnapshot(state => ({
				...state,
				value: selectElement.value ?? '',
			}))
		}

		selectElement.addEventListener('change', handleChange)

		const observer = new MutationObserver(() => {
			syncSnapshot()
		})
		observer.observe(selectElement, {
			childList: true,
			subtree: true,
			characterData: true,
			attributes: true,
		})

		return () => {
			selectElement.removeEventListener('change', handleChange)
			observer.disconnect()
		}
	}, [selectElement, syncSnapshot])

	React.useEffect(() => {
		if (!controller || typeof controller.subscribe !== 'function') return undefined
		const unsubscribe = controller.subscribe(nextState => {
			setIsApplying(Boolean(nextState?.isApplying))
		})
		return () => {
			if (typeof unsubscribe === 'function') unsubscribe()
		}
	}, [controller])

	React.useEffect(() => {
		refreshStatusIcon()
	}, [refreshStatusIcon, value])

	const handleValueChange = React.useCallback(
		(nextValue, { closeDrawer = false } = {}) => {
			if (!isSelectElement(selectElement)) return
			const normalizedValue = typeof nextValue === 'string' ? nextValue : ''
			selectElement.value = normalizedValue
			setSnapshot(state => ({
				...state,
				value: normalizedValue,
			}))
			if (controller && typeof controller.applyProfile === 'function') {
				controller.applyProfile(normalizedValue)
				if (closeDrawer) setIsDrawerOpen(false)
				return
			}
			// Fallback to SillyTavern listeners when controller is unavailable.
			selectElement.dispatchEvent(new Event('change', { bubbles: true }))
			selectElement.dispatchEvent(new Event('input', { bubbles: true }))
			if (closeDrawer) setIsDrawerOpen(false)
		},
		[controller, selectElement, setIsDrawerOpen],
	)

	const hasOptions = options.length > 0
	const currentOption = options.find(option => option.value === value)
	const buttonLabel = hasOptions ? currentOption?.label || 'Connection Profile' : disabledLabel
	const isDisabled = !hasOptions || options.every(option => option.disabled) || isApplying

	React.useEffect(() => {
		if (!useDrawerSurface && isDrawerOpen) {
			setIsDrawerOpen(false)
		}
	}, [useDrawerSurface, isDrawerOpen])

	React.useEffect(() => {
		let disposed = false
		let cleanupEvents = null
		let retryTimer = null

		const attachListeners = () => {
			if (disposed) return true
			const target = statusIconRef.current
			if (!target) return false

			const ctx = globalThis?.SillyTavern?.getContext?.()
			if (!ctx) return false

			const eventSource = ctx?.eventSource
			const eventTypes = ctx?.eventTypes || ctx?.event_types
			const relevantEvents = [
				eventTypes?.ONLINE_STATUS_CHANGED,
				eventTypes?.MAIN_API_CHANGED,
				eventTypes?.CHATCOMPLETION_SOURCE_CHANGED,
				eventTypes?.CHATCOMPLETION_MODEL_CHANGED,
				eventTypes?.CONNECTION_PROFILE_LOADED,
			].filter(Boolean)

			if (!eventSource || typeof eventSource.on !== 'function' || !relevantEvents.length) {
				return false
			}

			const listeners = relevantEvents.map(eventName => {
				const handler = () => {
					if (disposed) return
					refreshStatusIcon()
				}
				eventSource.on(eventName, handler)
				return { eventName, handler }
			})

			cleanupEvents = () => {
				if (typeof eventSource.off === 'function') {
					listeners.forEach(({ eventName, handler }) => eventSource.off(eventName, handler))
					return
				}
				if (typeof eventSource.removeListener === 'function') {
					listeners.forEach(({ eventName, handler }) => eventSource.removeListener(eventName, handler))
				}
			}

			return true
		}

		refreshStatusIcon()

		if (!attachListeners()) {
			retryTimer = setInterval(() => {
				if (attachListeners()) {
					clearInterval(retryTimer)
					retryTimer = null
				}
			}, 500)
		}

		return () => {
			disposed = true
			if (retryTimer !== null) {
				clearInterval(retryTimer)
			}
			if (typeof cleanupEvents === 'function') {
				cleanupEvents()
			}
		}
	}, [refreshStatusIcon, useDrawerSurface])

	React.useEffect(() => {
		if (isDrawerOpen) {
			refreshStatusIcon()
		}
	}, [isDrawerOpen, refreshStatusIcon])

	if (!isSelectElement(selectElement)) {
		return null
	}

	const renderMobileOptions = () => {
		if (!hasOptions) {
			return <div className="astra-chat-connection-menu__empty">{disabledLabel}</div>
		}
		return (
			<div className="astra-chat-connection-drawer__options" role="list">
				{options.map(option => {
					const isSelected = option.value === value
					return (
						<button
							key={option.value || option.label}
							type="button"
							className="astra-chat-connection-option"
							data-selected={isSelected ? 'true' : 'false'}
							disabled={option.disabled}
							onClick={() => {
								if (option.disabled) return
								handleValueChange(option.value, { closeDrawer: true })
							}}
						>
							<span className="astra-chat-connection-option__label">{option.label}</span>
							<span
								className="astra-chat-connection-option__check"
								data-selected={isSelected ? 'true' : 'false'}
								aria-hidden="true"
							>
								{isSelected ? <Check size={16} aria-hidden="true" /> : null}
							</span>
						</button>
					)
				})}
			</div>
		)
	}

	if (useDrawerSurface) {
		return (
			<>
				<Button
					variant="outline"
					size="sm"
					type="button"
					className="astra-chat-connection-trigger astra-chat-search-trigger"
				>
					<span className="astra-chat-search-trigger__content">
						<Search
							size={14}
							strokeWidth={2.25}
							aria-hidden="true"
							className="astra-chat-search-trigger__icon"
						/>
						<span className="astra-chat-search-trigger__label">Search</span>
					</span>
				</Button>
				<Button
					variant="outline"
					size="sm"
					disabled={isDisabled}
					className="astra-chat-connection-trigger"
					onClick={() => setIsDrawerOpen(true)}
				>
					<span
						className="astra-chat-connection-trigger__icon api-status-icon-wrap"
						aria-hidden="true"
						ref={statusIconRef}
					/>
					<span className="astra-chat-connection-trigger__value">{buttonLabel}</span>
					<ChevronDown size={12} aria-hidden="true" className="astra-chat-connection-trigger__chevron" />
				</Button>
				<Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
				<DrawerContent
					className="astra-chat-connection-drawer"
					container={drawerContainer ?? undefined}
				>
					<div className="astra-chat-connection-drawer__header">
						<DrawerTitle asChild>
							<div className="astra-chat-connection-drawer__title">Connection Profile</div>
						</DrawerTitle>
						<div className="astra-chat-connection-drawer__status">
							<span
								className="astra-chat-connection-drawer__status-icon api-status-icon-wrap"
								ref={drawerStatusIconRef}
								aria-hidden="true"
							/>
						</div>
					</div>
					<DrawerDescription className="sr-only">
						Choose which connection profile to use for sending chat requests.
					</DrawerDescription>
					<div className="astra-chat-connection-drawer__body">
						{renderMobileOptions()}
					</div>
				</DrawerContent>
			</Drawer>
			</>
		)
	}

	return (
		<>
			<Button
				variant="outline"
				size="sm"
				type="button"
				className="astra-chat-connection-trigger astra-chat-search-trigger"
			>
				<span className="astra-chat-search-trigger__content">
					<Search
						size={14}
						strokeWidth={2.25}
						aria-hidden="true"
						className="astra-chat-search-trigger__icon"
					/>
					<span className="astra-chat-search-trigger__label">Search</span>
				</span>
			</Button>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						disabled={isDisabled}
						className="astra-chat-connection-trigger"
					>
						<span
							className="astra-chat-connection-trigger__icon api-status-icon-wrap"
							aria-hidden="true"
							ref={statusIconRef}
						/>
						<span className="astra-chat-connection-trigger__value">{buttonLabel}</span>
						<ChevronDown size={12} aria-hidden="true" className="astra-chat-connection-trigger__chevron" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="start"
					className="astra-dropdown-menu astra-chat-connection-menu"
					sideOffset={8}
				>
					<DropdownMenuLabel className="astra-chat-connection-menu__label">Connection Profile</DropdownMenuLabel>
					<DropdownMenuSeparator className="astra-chat-connection-menu__separator" />
					{hasOptions ? (
						<div className="astra-dropdown-options astra-chat-connection-menu__options" role="presentation">
							{options.map(option => {
								const isSelected = option.value === value
								return (
									<DropdownMenuItem
										key={option.value || option.label}
										className="astra-dropdown-option astra-chat-connection-option"
										disabled={option.disabled}
										data-selected={isSelected ? 'true' : 'false'}
										onSelect={event => {
											if (option.disabled) {
												event.preventDefault()
												return
											}
											handleValueChange(option.value)
										}}>
										<span className="astra-dropdown-option__label astra-chat-connection-option__label">{option.label}</span>
										<span
											className="astra-dropdown-option__check astra-chat-connection-option__check"
											data-selected={isSelected ? 'true' : 'false'}
											aria-hidden="true"
										>
											{isSelected ? <Check size={16} aria-hidden="true" /> : null}
										</span>
									</DropdownMenuItem>
								)
							})}
						</div>
					) : (
						<div className="astra-chat-connection-menu__empty">{disabledLabel}</div>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	)
}

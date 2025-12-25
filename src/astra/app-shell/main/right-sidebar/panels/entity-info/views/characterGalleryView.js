import { DragAndDropHandler } from '../../../../../../../../../../../dragdrop.js'
import {
	getBase64Async,
	getSanitizedFilename,
	saveBase64AsFile,
	getFileExtension,
} from '../../../../../../../../../../../utils.js'

import React from 'react'
import { createRoot } from 'react-dom/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/astra/shared/ui/select'
import { getLucideIconMarkup } from '@/astra/shared/icons/lucide'

const SORT_OPTIONS = [
	{
		value: 'dateDesc',
		label: 'Newest',
		field: 'date',
		order: 'desc',
		ariaLabel: 'Sort by newest first',
	},
	{
		value: 'dateAsc',
		label: 'Oldest',
		field: 'date',
		order: 'asc',
		ariaLabel: 'Sort by oldest first',
	},
	{
		value: 'nameAsc',
		label: 'Name A-Z',
		field: 'name',
		order: 'asc',
		ariaLabel: 'Sort from A to Z',
	},
	{
		value: 'nameDesc',
		label: 'Name Z-A',
		field: 'name',
		order: 'desc',
		ariaLabel: 'Sort from Z to A',
	},
]

const DEFAULT_SETTINGS = Object.freeze({
	folders: {},
	sort: 'dateDesc',
})

function CharacterGallerySortSelect({ options, value, disabled, onChange, triggerId }) {
	const handleValueChange = React.useCallback(
		nextValue => {
			if (onChange) onChange(nextValue ?? '')
		},
		[onChange],
	)

	return (
		<Select value={value} onValueChange={handleValueChange} disabled={disabled}>
			<SelectTrigger
				id={triggerId}
				className="character-gallery__sort-select"
				aria-label="Sort images"
				title="Sort images"
				disabled={disabled}
			>
				<SelectValue placeholder="Sort images" />
			</SelectTrigger>
			<SelectContent>
				{options.map(option => (
					<SelectItem
						key={option.value}
						value={option.value}
						aria-label={option.ariaLabel || option.label}
						title={option.ariaLabel || option.label}
						disabled={option.disabled}
					>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}

function cloneSettings(value) {
	if (typeof structuredClone === 'function') {
		return structuredClone(value)
	}
	return JSON.parse(JSON.stringify(value))
}

const INITIAL_BATCH = 60
const SUBSEQUENT_BATCH = 30

const DELETE_ICON = getLucideIconMarkup('trash-2')
const UPLOAD_ICON = getLucideIconMarkup('upload')

function getContext() {
	return globalThis?.SillyTavern?.getContext?.() ?? null
}

function ensureGallerySettings() {
	const context = getContext()
	if (!context) return null

	if (!context.extensionSettings.gallery) {
		context.extensionSettings.gallery = cloneSettings(DEFAULT_SETTINGS)
		context.saveSettingsDebounced()
		return context.extensionSettings.gallery
	}

	for (const key of Object.keys(DEFAULT_SETTINGS)) {
		if (!Object.hasOwn(context.extensionSettings.gallery, key)) {
			context.extensionSettings.gallery[key] = cloneSettings(DEFAULT_SETTINGS[key])
		}
	}

	return context.extensionSettings.gallery
}

function resolveSortSetting() {
	const settings = ensureGallerySettings()
	const stored = settings?.sort
	const valid = SORT_OPTIONS.some(option => option.value === stored)
	return valid ? stored : DEFAULT_SETTINGS.sort
}

function persistSortSetting(sortValue) {
	const settings = ensureGallerySettings()
	if (!settings) return
	settings.sort = sortValue
	getContext()?.saveSettingsDebounced?.()
}

function resolveDefaultFolder(entity, meta) {
	if (meta?.isGroup) {
		return entity?.name || entity?.id || ''
	}
	return entity?.name || meta?.name || ''
}

async function fetchGalleryItems(folderName, sortOption) {
	const response = await fetch('/api/images/list', {
		method: 'POST',
		headers: getContext()?.getRequestHeaders?.() ?? {},
		body: JSON.stringify({
			folder: folderName,
			sortField: sortOption.field,
			sortOrder: sortOption.order,
		}),
	})

	if (!response.ok) {
		throw new Error(`Failed to load gallery items (${response.status})`)
	}

	const sanitizedFolder = await getSanitizedFilename(folderName)
	const files = await response.json()

	return {
		sanitizedFolder,
		items: files.map(fileName => ({
			id: `${sanitizedFolder}/${fileName}`,
			name: fileName,
			url: `user/images/${sanitizedFolder}/${fileName}`,
		})),
	}
}

async function deleteGalleryItem(path) {
	const response = await fetch('/api/images/delete', {
		method: 'POST',
		headers: getContext()?.getRequestHeaders?.() ?? {},
		body: JSON.stringify({ path }),
	})

	if (!response.ok) {
		throw new Error(`Failed to delete image (${response.status})`)
	}
}

async function uploadFileToFolder(file, folderName) {
	const base64 = await getBase64Async(file)
	const data = base64.split(',')[1]
	const extension = getFileExtension(file)
	if (!data) throw new Error('Could not read file data.')
	await saveBase64AsFile(data, folderName, '', extension)
}

export function createCharacterGalleryView({ eventSource, event_types } = {}) {
	const instanceId = `astra-gallery-${Math.random().toString(36).slice(2)}`
	void eventSource
	void event_types

	const root = document.createElement('div')
	root.className = 'character-gallery'
	root.dataset.deleteMode = 'false'
	root.dataset.state = 'idle'

	const sortWrapper = document.createElement('div')
	sortWrapper.className = 'character-gallery__sort'

	const sortSelectRoot = createRoot(sortWrapper)
	let isSortSelectDisabled = false
	const sortTriggerId = `${instanceId}-sort`

	const toolbarControls = document.createElement('div')
	toolbarControls.className = 'character-info-card-toolbar__controls character-gallery__toolbar-controls'

	const toolbarLeft = document.createElement('div')
	toolbarLeft.className = 'character-gallery__toolbar-left'

	const deleteToggle = document.createElement('button')
	deleteToggle.type = 'button'
	deleteToggle.className = 'character-gallery__button character-gallery__button--delete character-info-card-toolbar__toggle'
	deleteToggle.innerHTML = `${DELETE_ICON}`
	deleteToggle.setAttribute('aria-label', 'Delete Mode')

	const uploadButton = document.createElement('button')
	uploadButton.type = 'button'
	uploadButton.className = 'character-gallery__button character-gallery__button--upload character-info-card-toolbar__toggle'
	uploadButton.innerHTML = `${UPLOAD_ICON}<span>Upload</span>`
	uploadButton.setAttribute('aria-label', 'Upload Images')

	const toolbarRight = document.createElement('div')
	toolbarRight.className = 'character-gallery__toolbar-right'
	toolbarRight.append(sortWrapper)

	toolbarLeft.append(uploadButton, deleteToggle)

	const fileInput = document.createElement('input')
	fileInput.type = 'file'
	fileInput.accept = 'image/*'
	fileInput.multiple = true
	fileInput.hidden = true

	toolbarControls.append(toolbarLeft, toolbarRight)

	const toolbar = document.createElement('div')
	toolbar.className = 'character-info-card-toolbar character-gallery__toolbar'
	toolbar.append(toolbarControls)

	const dropzone = document.createElement('div')
	dropzone.className = 'character-gallery__dropzone drop_target'
	dropzone.id = `${instanceId}-dropzone`
	dropzone.dataset.astraAllowCharacterDrop = 'true'

	const grid = document.createElement('div')
	grid.className = 'character-gallery__grid'

	const status = document.createElement('div')
	status.className = 'character-gallery__status'
	status.setAttribute('role', 'status')
	status.setAttribute('aria-live', 'polite')
	grid.append(status)

	const footerCount = document.createElement('span')
	footerCount.className = 'character-gallery__count'
	footerCount.textContent = '0 Images'

	const footerControls = document.createElement('div')
	footerControls.className =
		'character-info-card-toolbar__controls character-gallery__toolbar-controls character-gallery__toolbar-controls--footer'
	footerControls.append(footerCount)

	const footerToolbar = document.createElement('div')
	footerToolbar.className =
		'character-info-card-toolbar character-gallery__toolbar character-gallery__toolbar--footer'
	footerToolbar.append(footerControls)

	const sentinel = document.createElement('div')
	sentinel.className = 'character-gallery__sentinel'

	dropzone.append(toolbar, grid, footerToolbar, sentinel)

	root.append(dropzone, fileInput)

	let dragHandler = null
	let observer = null
	const initialSortValue = resolveSortSetting()

	const state = {
		entity: null,
		meta: null,
		folderName: '',
		sanitizedFolder: '',
		items: [],
		renderedCount: 0,
		isActive: false,
		isLoading: false,
		deleteMode: false,
		sort: initialSortValue,
		needsRefresh: true,
		pendingRequest: 0,
	}

	function updateImageCount() {
		const count = state.items.length
		const text = `${count} Image${count === 1 ? '' : 's'}`
		footerCount.textContent = text
	}

	function renderSortControl() {
		sortSelectRoot.render(
			<CharacterGallerySortSelect
				options={SORT_OPTIONS}
				value={state.sort}
				disabled={isSortSelectDisabled}
				onChange={handleSortChange}
				triggerId={sortTriggerId}
			/>,
		)
	}

	function setStatus(message, tone = 'info') {
		status.dataset.tone = tone
		status.textContent = message || ''
		if (message) {
			root.dataset.state = tone === 'error' ? 'error' : tone === 'empty' ? 'empty' : 'ready'
		} else if (state.isLoading) {
			root.dataset.state = 'loading'
		} else {
			root.dataset.state = 'idle'
		}
	}

	function setLoading(isLoading) {
		state.isLoading = isLoading
		root.dataset.state = isLoading ? 'loading' : state.items.length ? 'ready' : 'idle'
		if (isLoading) {
			setStatus('Loading images...', 'info')
		} else if (!state.items.length) {
			setStatus('No images yet.', 'empty')
		} else {
			setStatus('', 'info')
		}
	}

	function toggleDeleteMode(force) {
		const next = typeof force === 'boolean' ? force : !state.deleteMode
		state.deleteMode = next
		root.dataset.deleteMode = next ? 'true' : 'false'
		deleteToggle.dataset.active = next ? 'true' : 'false'
	}

	function buildItemElement(item) {
		const button = document.createElement('button')
		button.type = 'button'
		button.className = 'character-gallery__item'
		button.dataset.imageId = item.id
		button.title = item.name

		const imageWrapper = document.createElement('span')
		imageWrapper.className = 'character-gallery__thumb'

		const img = document.createElement('img')
		img.src = item.url
		img.alt = item.name
		img.loading = 'lazy'

		imageWrapper.append(img)
		button.append(imageWrapper)

		button.addEventListener('click', async () => {
			if (!state.deleteMode) return

			try {
				const confirmed = await confirmDelete(item)
				if (!confirmed) return

				await deleteGalleryItem(item.url)
				state.items = state.items.filter(entry => entry.id !== item.id)
				updateImageCount()
				state.renderedCount = 0
				renderItems(true)
				globalThis.toastr?.success?.('Image deleted.')
			} catch (error) {
				console.error(error)
				globalThis.toastr?.error?.('Failed to delete image.')
			}
		})

		return button
	}

	function renderItems(reset = false) {
		if (reset) {
			grid.replaceChildren(status)
			state.renderedCount = 0
		}

		if (!state.items.length) {
			if (grid.firstElementChild !== status || grid.childElementCount > 1) {
				grid.replaceChildren(status)
			}
			setStatus('No images yet.', 'empty')
			return
		}

		setStatus('', 'info')

		const batchSize = state.renderedCount === 0 ? INITIAL_BATCH : SUBSEQUENT_BATCH
		const nextCount = Math.min(state.items.length, state.renderedCount + batchSize)
		const fragment = document.createDocumentFragment()

		for (let index = state.renderedCount; index < nextCount; index += 1) {
			const item = state.items[index]
			const node = buildItemElement(item)
			fragment.append(node)
		}

		grid.append(fragment)
		state.renderedCount = nextCount

		if (state.renderedCount >= state.items.length) {
			sentinel.hidden = true
			if (observer) observer.disconnect()
		} else {
			sentinel.hidden = false
			setupObserver()
		}
	}

	function setupObserver() {
		if (observer) observer.disconnect()
		if (!state.isActive) return

		observer = new IntersectionObserver(entries => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					renderItems(false)
					break
				}
			}
		}, {
			root: dropzone,
			rootMargin: '0px 0px 120px 0px',
			threshold: 0.1,
		})

		observer.observe(sentinel)
	}

	async function confirmDelete(item) {
		const popup = getContext()?.Popup
		const label = `Delete ${item.name}?`
		if (popup?.show?.confirm) {
			try {
				return await popup.show.confirm(label, item.url)
			} catch {
				return false
			}
		}

		return globalThis.confirm?.(label) ?? false
	}

	async function loadGallery() {
		if (!state.folderName) {
			setStatus('No gallery folder available.', 'empty')
			grid.replaceChildren(status)
			state.items = []
			state.renderedCount = 0
			updateImageCount()
			return
		}

		if (!state.isActive) {
			state.needsRefresh = true
			return
		}

		const requestId = ++state.pendingRequest
		setLoading(true)
		try {
			const sortOption = SORT_OPTIONS.find(option => option.value === state.sort) ?? SORT_OPTIONS[0]
			const { items, sanitizedFolder } = await fetchGalleryItems(state.folderName, sortOption)
			if (requestId !== state.pendingRequest) {
				return
			}
			state.items = items
			updateImageCount()
			state.sanitizedFolder = sanitizedFolder
			state.renderedCount = 0
			grid.replaceChildren(status)
			renderItems(true)
			state.needsRefresh = false
			setLoading(false)
		} catch (error) {
			console.error('Failed to load gallery items', error)
			if (requestId === state.pendingRequest) {
				state.isLoading = false
				root.dataset.state = 'error'
				setStatus('Unable to load gallery items.', 'error')
			}
		}
	}

	async function handleFilesSelected(fileList) {
		const files = Array.from(fileList || [])
		if (!files.length) return
		if (!state.folderName) {
			globalThis.toastr?.error?.('No gallery folder is available for this character.')
			return
		}

		try {
			setStatus('Uploading files...', 'info')
			for (const file of files) {
				await uploadFileToFolder(file, state.folderName)
			}
			globalThis.toastr?.success?.('Upload complete.')
			await loadGallery()
		} catch (error) {
			console.error('Failed to upload files', error)
			globalThis.toastr?.error?.('Failed to upload one or more files.')
		}
	}

	function ensureDragHandler() {
		if (dragHandler) return
		dragHandler = new DragAndDropHandler(`#${dropzone.id}`, async files => {
			await handleFilesSelected(files)
		}, { noAnimation: true })
	}

	function destroyDragHandler() {
		if (!dragHandler) return
		dragHandler.destroy()
		dragHandler = null
	}

	async function handleFilesFromDialog(event) {
		await handleFilesSelected(event.target.files)
		fileInput.value = ''
	}

	function updateControlsState() {
		const hasFolder = Boolean(state.folderName)
		deleteToggle.disabled = !hasFolder
		uploadButton.disabled = !hasFolder
		isSortSelectDisabled = !hasFolder
		renderSortControl()
	}

	function setEntity({ entity, meta }) {
		const previousFolder = state.folderName
		const previousEntityIdentifier =
			state.entity?.id ?? state.meta?.id ?? previousFolder ?? ''

		const fallback = resolveDefaultFolder(entity, meta)
		const folder = (fallback || '').trim()
		const nextEntityIdentifier = entity?.id ?? meta?.id ?? folder

		const hasChanged =
			folder !== previousFolder || previousEntityIdentifier !== nextEntityIdentifier

		state.entity = entity ?? null
		state.meta = meta ?? null
		state.folderName = folder

		if (!folder) {
			state.items = []
			state.renderedCount = 0
			grid.replaceChildren(status)
			setStatus('No gallery folder available.', 'empty')
			state.needsRefresh = false
			updateImageCount()
		} else if (hasChanged) {
			state.needsRefresh = true
			state.items = []
			state.renderedCount = 0
			grid.replaceChildren(status)
			updateImageCount()
		}

		updateControlsState()
		return state.needsRefresh
	}

	function handleDeleteToggleClick() {
		if (!state.folderName) return
		toggleDeleteMode()
		if (state.deleteMode) {
			globalThis.toastr?.info?.('Delete mode enabled. Click an image to remove it.')
		}
	}

	deleteToggle.addEventListener('click', handleDeleteToggleClick)

	function handleSortChange(nextValue) {
		const next =
			typeof nextValue === 'string'
				? nextValue
				: typeof nextValue === 'object' && nextValue !== null
					? nextValue.target?.value ?? ''
					: ''
		const isValid = SORT_OPTIONS.some(option => option.value === next)
		if (!isValid) {
			renderSortControl()
			return
		}

		if (state.sort !== next) {
			state.sort = next
			persistSortSetting(next)
			state.needsRefresh = true
			if (state.isActive) {
				void loadGallery()
			}
		}

		renderSortControl()
	}

	renderSortControl()
	updateControlsState()

	function handleUploadClick() {
		if (!state.folderName) {
			globalThis.toastr?.warning?.('No gallery folder is available for this character.')
			return
		}
		fileInput.click()
	}

	uploadButton.addEventListener('click', handleUploadClick)

	fileInput.addEventListener('change', handleFilesFromDialog)

	return {
		root,
		update(payload = {}) {
			const shouldRefresh = setEntity(payload)
			if (state.isActive && shouldRefresh) {
				void loadGallery()
			}
		},
		async setActive(isActive) {
			state.isActive = isActive
			if (isActive) {
				updateControlsState()
				ensureDragHandler()
				toggleDeleteMode(false)
				if (state.needsRefresh) {
					await loadGallery()
				} else {
					setupObserver()
				}
			} else {
				if (observer) observer.disconnect()
				toggleDeleteMode(false)
			}
		},
		async refresh() {
			await loadGallery()
		},
		destroy() {
			if (observer) observer.disconnect()
			destroyDragHandler()
			fileInput.removeEventListener('change', handleFilesFromDialog)
			uploadButton.removeEventListener('click', handleUploadClick)
			deleteToggle.removeEventListener('click', handleDeleteToggleClick)
			sortSelectRoot.unmount()
		},
	}
}

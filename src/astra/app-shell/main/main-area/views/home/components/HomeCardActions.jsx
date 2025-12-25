import React from 'react'
import { FILE_ACCEPT_ATTRIBUTE } from './cardActionsController.js'
import { HomeCardActionMenu } from './HomeCardActionMenu.jsx'
import { ReplaceCharacterDialog } from './dialogs/ReplaceCharacterDialog.jsx'
import { SourceConfirmDialog } from './dialogs/SourceConfirmDialog.jsx'
import {
	dataTransferContainsFiles,
	ensureAppWrapperPortalHost,
	extractFileExtension,
	isPreviewableFile,
	resolveFavoriteState,
} from './cardActionUtils.js'

export function HomeCardActions({ actions = {}, slots = {}, identity = null }) {
	const {
		exportAsPng,
		exportAsJson,
		openSourceLink,
		replaceCharacterFromFile,
		replaceCharacterFromUrl,
		getSourceUrl,
		toggleFavorite,
		getFavoriteState,
		canOpenSourceLink,
	} = actions

	const resolvedSourceUrl = React.useMemo(() => {
		if (typeof getSourceUrl !== 'function') return ''
		try {
			return getSourceUrl() || ''
		} catch {
			return ''
		}
	}, [getSourceUrl])

	const sourceAvailable = canOpenSourceLink !== false && Boolean(resolvedSourceUrl)
	const [sourceDialogOpen, setSourceDialogOpen] = React.useState(false)
	const [replaceDialogOpen, setReplaceDialogOpen] = React.useState(false)
	const [isOpeningSource, setIsOpeningSource] = React.useState(false)
	const [isReplacingFromUrl, setIsReplacingFromUrl] = React.useState(false)
	const [isReplacingFromFile, setIsReplacingFromFile] = React.useState(false)
	const [replaceUrl, setReplaceUrl] = React.useState(resolvedSourceUrl)
	const [replaceUrlError, setReplaceUrlError] = React.useState('')
	const [replaceFileError, setReplaceFileError] = React.useState('')
	const [selectedReplaceFile, setSelectedReplaceFile] = React.useState(null)
	const [replaceFilePreviewUrl, setReplaceFilePreviewUrl] = React.useState(null)
	const [isFileDragging, setIsFileDragging] = React.useState(false)
	const fileInputRef = React.useRef(null)
	const dropzoneDragDepthRef = React.useRef(0)
	const allowedFileExtensions = React.useMemo(() => {
		return new Set(
			FILE_ACCEPT_ATTRIBUTE.split(',')
				.map(entry => entry.trim().replace(/^\./, '').toLowerCase())
				.filter(Boolean)
		)
	}, [])
	const portalContainer = React.useMemo(() => ensureAppWrapperPortalHost(), [])
	const [isFavorite, setIsFavorite] = React.useState(() => resolveFavoriteState(getFavoriteState))
	const favoriteButtonLabel = 'Toggle favorite card'
	const favoriteButtonTitle = isFavorite ? 'Remove from favorites' : 'Add to favorites'
	const menuSlot = slots?.menu ?? null
	const dialogIdentity = identity ?? null
	const moreActionsLabel = 'More actions'

	React.useEffect(() => {
		setReplaceUrl(resolvedSourceUrl)
	}, [resolvedSourceUrl])

	const clearSelectedReplaceFile = React.useCallback(() => {
		setSelectedReplaceFile(null)
		setReplaceFilePreviewUrl(null)
		setReplaceFileError('')
	}, [])

	React.useEffect(() => {
		if (!selectedReplaceFile || !isPreviewableFile(selectedReplaceFile)) {
			setReplaceFilePreviewUrl(null)
			return undefined
		}
		const previewUrl = URL.createObjectURL(selectedReplaceFile)
		setReplaceFilePreviewUrl(previewUrl)
		return () => {
			URL.revokeObjectURL(previewUrl)
		}
	}, [selectedReplaceFile])

	React.useEffect(() => {
		if (!replaceDialogOpen) {
			setReplaceUrlError('')
			clearSelectedReplaceFile()
			setIsFileDragging(false)
			dropzoneDragDepthRef.current = 0
		}
	}, [replaceDialogOpen, clearSelectedReplaceFile])

	React.useEffect(() => {
		setIsFavorite(resolveFavoriteState(getFavoriteState))
	}, [getFavoriteState])

	const refreshFavoriteState = React.useCallback(() => {
		setIsFavorite(resolveFavoriteState(getFavoriteState))
	}, [getFavoriteState])

	const handleReplaceUrlChange = React.useCallback(value => {
		setReplaceUrl(value)
		setReplaceUrlError('')
	}, [])

	const applyIncomingFile = React.useCallback(
		file => {
			if (!file) return
			const extension = extractFileExtension(file.name)
			if (allowedFileExtensions.size && !allowedFileExtensions.has(extension)) {
				setReplaceFileError('Unsupported file type. Please select a PNG, JSON, YAML, CHARX, or BYAF card.')
				return
			}
			setReplaceFileError('')
			setSelectedReplaceFile(file)
		},
		[allowedFileExtensions]
	)

	const handleOpenSourceDialog = () => {
		if (!sourceAvailable) return
		setSourceDialogOpen(true)
	}

	const handleReplaceDialogOpen = () => {
		setReplaceUrlError('')
		setReplaceFileError('')
		clearSelectedReplaceFile()
		setReplaceUrl(resolvedSourceUrl)
		setReplaceDialogOpen(true)
	}

	const handleConfirmOpenSource = async () => {
		if (!sourceAvailable || typeof openSourceLink !== 'function') return
		setIsOpeningSource(true)
		try {
			await openSourceLink(resolvedSourceUrl)
			setSourceDialogOpen(false)
		} catch (error) {
			console?.warn?.('[AstraProjecta] Failed to open source link from card.', error)
		} finally {
			setIsOpeningSource(false)
		}
	}

	const handleReplaceFromUrl = async () => {
		if (typeof replaceCharacterFromUrl !== 'function') return
		const trimmed = replaceUrl?.trim?.() ?? ''
		if (!trimmed) {
			setReplaceUrlError('Enter a URL to continue.')
			return
		}
		setReplaceUrlError('')
		setIsReplacingFromUrl(true)
		try {
			await replaceCharacterFromUrl(trimmed)
			setReplaceDialogOpen(false)
		} catch (error) {
			console?.warn?.('[AstraProjecta] Failed to replace character from URL.', error)
			setReplaceUrlError('Failed to replace from the provided URL.')
		} finally {
			setIsReplacingFromUrl(false)
		}
	}

	const handleReplaceFromFile = async () => {
		if (typeof replaceCharacterFromFile !== 'function') return
		if (!selectedReplaceFile) {
			setReplaceFileError('Choose a file before replacing.')
			return
		}
		setReplaceFileError('')
		setIsReplacingFromFile(true)
		try {
			await replaceCharacterFromFile(selectedReplaceFile)
			setReplaceDialogOpen(false)
		} catch (error) {
			console?.warn?.('[AstraProjecta] Failed to replace character from file.', error)
			setReplaceFileError('Failed to replace using the selected file.')
		} finally {
			setIsReplacingFromFile(false)
		}
	}

	const handleBrowseForFile = React.useCallback(() => {
		if (isReplacingFromFile || isReplacingFromUrl) return
		setReplaceFileError('')
		fileInputRef.current?.click()
	}, [isReplacingFromFile, isReplacingFromUrl])

	const handleFileInputChange = React.useCallback(
		event => {
			const file = event?.target?.files?.[0] ?? null
			if (event?.target) {
				event.target.value = ''
			}
			if (!file) return
			applyIncomingFile(file)
		},
		[applyIncomingFile]
	)

	const handleFileDragOver = React.useCallback(event => {
		event.preventDefault()
		event.stopPropagation()
		if (dataTransferContainsFiles(event?.dataTransfer)) {
			event.dataTransfer.dropEffect = 'copy'
		}
	}, [])

	const handleFileDragEnter = React.useCallback(
		event => {
			event.preventDefault()
			event.stopPropagation()
			dropzoneDragDepthRef.current += 1
			if (dataTransferContainsFiles(event?.dataTransfer)) {
				setIsFileDragging(true)
			}
		},
		[]
	)

	const handleFileDragLeave = React.useCallback(event => {
		event.preventDefault()
		event.stopPropagation()
		dropzoneDragDepthRef.current = Math.max(0, dropzoneDragDepthRef.current - 1)
		if (dropzoneDragDepthRef.current === 0) {
			setIsFileDragging(false)
		}
	}, [])

	const handleFileDrop = React.useCallback(
		event => {
			event.preventDefault()
			event.stopPropagation()
			dropzoneDragDepthRef.current = 0
			setIsFileDragging(false)
			if (!dataTransferContainsFiles(event?.dataTransfer)) return
			const file = event?.dataTransfer?.files?.[0] ?? null
			if (file) {
				applyIncomingFile(file)
			}
		},
		[applyIncomingFile]
	)

	const handleToggleFavorite = React.useCallback(async () => {
		if (typeof toggleFavorite !== 'function') return
		try {
			await toggleFavorite()
		} catch (error) {
			console?.warn?.('[AstraProjecta] Failed to toggle favorite from card.', error)
		} finally {
			refreshFavoriteState()
		}
	}, [toggleFavorite, refreshFavoriteState])

	const isReplaceBusy = isReplacingFromFile || isReplacingFromUrl
	const hasSelectedReplaceFile = Boolean(selectedReplaceFile)

	return (
		<>
			<HomeCardActionMenu
				isFavorite={isFavorite}
				favoriteButtonLabel={favoriteButtonLabel}
				favoriteButtonTitle={favoriteButtonTitle}
				moreActionsLabel={moreActionsLabel}
				onToggleFavorite={handleToggleFavorite}
				onExportAsPng={exportAsPng}
				onExportAsJson={exportAsJson}
				onOpenSource={handleOpenSourceDialog}
				onOpenReplace={handleReplaceDialogOpen}
				sourceAvailable={sourceAvailable}
				menuSlot={menuSlot}
			/>
			<SourceConfirmDialog
				open={sourceDialogOpen}
				onOpenChange={setSourceDialogOpen}
				url={resolvedSourceUrl}
				isLoading={isOpeningSource}
				onConfirm={handleConfirmOpenSource}
				container={portalContainer}
				identity={dialogIdentity}
			/>
			<ReplaceCharacterDialog
				open={replaceDialogOpen}
				onOpenChange={setReplaceDialogOpen}
				url={replaceUrl}
				onUrlChange={handleReplaceUrlChange}
				onReplaceFromUrl={handleReplaceFromUrl}
				onReplaceFromFile={handleReplaceFromFile}
				onBrowseForFile={handleBrowseForFile}
				onFileInputChange={handleFileInputChange}
				onClearSelectedFile={clearSelectedReplaceFile}
				fileInputRef={fileInputRef}
				fileAccept={FILE_ACCEPT_ATTRIBUTE}
				selectedFile={selectedReplaceFile}
				filePreviewUrl={replaceFilePreviewUrl}
				hasSelectedFile={hasSelectedReplaceFile}
				isFileDragging={isFileDragging}
				onFileDragEnter={handleFileDragEnter}
				onFileDragLeave={handleFileDragLeave}
				onFileDragOver={handleFileDragOver}
				onFileDrop={handleFileDrop}
				isReplacingFromUrl={isReplacingFromUrl}
				isReplacingFromFile={isReplacingFromFile}
				isBusy={isReplaceBusy}
				fileErrorMessage={replaceFileError}
				urlErrorMessage={replaceUrlError}
				container={portalContainer}
				identity={dialogIdentity}
			/>
		</>
	)
}

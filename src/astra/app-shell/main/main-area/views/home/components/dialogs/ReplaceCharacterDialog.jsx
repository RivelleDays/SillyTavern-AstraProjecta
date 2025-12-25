import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ResponsiveDialog } from '@/astra/shared/ui/ResponsiveDialog.jsx'
import { CloseIcon, EditFileIcon, ImageIcon, LinkIcon, UploadIcon } from '../homeCardActionIcons.jsx'
import { formatFileSize } from '../cardActionUtils.js'

export function ReplaceCharacterDialog({
	open,
	onOpenChange,
	url,
	onUrlChange,
	onReplaceFromUrl,
	onReplaceFromFile,
	onBrowseForFile,
	onFileInputChange,
	onClearSelectedFile,
	fileInputRef,
	fileAccept,
	selectedFile,
	filePreviewUrl,
	hasSelectedFile,
	isFileDragging,
	onFileDragEnter,
	onFileDragLeave,
	onFileDragOver,
	onFileDrop,
	isReplacingFromUrl,
	isReplacingFromFile,
	isBusy,
	fileErrorMessage,
	urlErrorMessage,
	container,
	identity,
}) {
	const footer = (
		<>
			<Button variant="outline" onClick={onReplaceFromFile} disabled={isBusy || !hasSelectedFile}>
				{isReplacingFromFile ? 'Replacing…' : 'Replace from File'}
			</Button>
			<Button variant="outline" onClick={onReplaceFromUrl} disabled={isBusy || !(url?.trim?.())}>
				{isReplacingFromUrl ? 'Replacing…' : 'Replace from URL'}
			</Button>
			<Button variant="default" onClick={() => onOpenChange(false)} disabled={isBusy}>
				Cancel
			</Button>
		</>
	)

	return (
		<ResponsiveDialog
			open={open}
			onOpenChange={onOpenChange}
			title="Replace / Update Character"
			description={
				<>
					Swap this character card with a file or a URL.
				</>
			}
			footer={footer}
			container={container}
			identity={identity}
			icon={<EditFileIcon />}
		>
			<div className="astra-dialog-section">
				<p>
					New card data will overwrite this character&apos;s profile. Chats, lorebooks, and shared assets remain linked to the character after the replacement finishes.
				</p>
			</div>
			<div className="astra-dialog-section">
				<div className="astra-dialog-label">Local File</div>
				<div
					className="astra-home-card__dropzone"
					data-dragging={isFileDragging || undefined}
					data-has-file={hasSelectedFile || undefined}
					onDragEnter={onFileDragEnter}
					onDragLeave={onFileDragLeave}
					onDragOver={onFileDragOver}
					onDrop={onFileDrop}
				>
					{selectedFile ? (
						<div className="astra-home-card__dropzoneFilled">
							<div className="astra-home-card__dropzoneImageFrame" aria-hidden="true">
								{filePreviewUrl ? (
									<img
										src={filePreviewUrl}
										alt={selectedFile?.name ?? 'Selected file preview'}
										className="astra-home-card__dropzoneImage"
									/>
								) : (
									<div className="astra-home-card__dropzoneImageFallback">
										<EditFileIcon />
									</div>
								)}
							</div>
							<div className="astra-home-card__dropzoneFilledInfo">
								<span className="astra-home-card__dropzoneFileName" title={selectedFile?.name}>
									{selectedFile?.name}
								</span>
								{Number.isFinite(selectedFile?.size) ? (
									<span className="astra-home-card__dropzoneFileMeta">{formatFileSize(selectedFile.size)}</span>
								) : null}
							</div>
							<button
								type="button"
								className="astra-home-card__dropzoneRemoveButton"
								onClick={onClearSelectedFile}
								disabled={isBusy}
								aria-label="Remove selected file"
							>
								<CloseIcon aria-hidden="true" />
							</button>
						</div>
					) : (
						<div className="astra-home-card__dropzoneEmpty">
							<div className="astra-home-card__dropzoneEmptyIcon" aria-hidden="true">
								<ImageIcon />
							</div>
							<div className="astra-home-card__dropzoneEmptyCopy">
								<p className="astra-home-card__dropzoneEmptyTitle">Drop a character card file here</p>
								<p className="astra-home-card__dropzoneEmptyDetails">
									Accepted formats: PNG, JSON, YAML, CHARX, BYAF.
								</p>
							</div>
							<Button
								variant="outline"
								size="sm"
								type="button"
								onClick={onBrowseForFile}
								disabled={isBusy}
								className="astra-home-card__dropzoneSelectButton"
							>
								<UploadIcon aria-hidden="true" className="astra-home-card__dropzoneSelectIcon" />
								<span>Select file</span>
							</Button>
						</div>
					)}
					<input
						ref={fileInputRef}
						type="file"
						accept={fileAccept}
						onChange={onFileInputChange}
						tabIndex={-1}
						aria-hidden="true"
						className="sr-only"
					/>
				</div>
				{fileErrorMessage ? (
					<p className="astra-home-card__dialogError" role="alert">
						{fileErrorMessage}
					</p>
				) : null}
			</div>
			<div className="astra-dialog-section">
				<Label className="astra-dialog-label" htmlFor="astra-home-card-replace-url">
					Source URL
				</Label>
				<div className="astra-home-card__urlInputWrapper">
					<Input
						id="astra-home-card-replace-url"
						className="astra-home-card__urlInput"
						placeholder="https://example.com/character-card"
						value={url}
						onChange={event => onUrlChange(event.target.value)}
						autoComplete="off"
						inputMode="url"
						spellCheck="false"
					/>
					<span className="astra-home-card__urlInputIcon" aria-hidden="true">
						<LinkIcon />
					</span>
				</div>
				<p className="astra-dialog-hint">Use a direct link or a share code from supported hubs.</p>
				{urlErrorMessage ? (
					<p className="astra-home-card__dialogError" role="alert">
						{urlErrorMessage}
					</p>
				) : null}
			</div>
		</ResponsiveDialog>
	)
}

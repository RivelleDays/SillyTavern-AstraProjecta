import React from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/astra/shared/ui/dropdownMenu'
import { DownloadIcon, EditFileIcon, EllipsisIcon, ExternalLinkIcon, FavoriteIcon } from './homeCardActionIcons.jsx'

export function HomeCardActionMenu({
	isFavorite,
	favoriteButtonLabel,
	favoriteButtonTitle,
	moreActionsLabel,
	onToggleFavorite,
	onExportAsPng,
	onExportAsJson,
	onOpenSource,
	onOpenReplace,
	sourceAvailable,
	menuSlot,
}) {
	const dropdownMenu = (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="secondary"
					size="icon"
					type="button"
					className="astra-home-card__iconButton astra-home-card__heroMenuButton"
					aria-label={moreActionsLabel}
					title={moreActionsLabel}
					data-action="menu"
				>
					<EllipsisIcon />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="astra-home-card__dropdown"
			>
				<DropdownMenuItem onSelect={() => onExportAsPng?.()}>
					<DownloadIcon />
					<span>Export PNG</span>
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={() => onExportAsJson?.()}>
					<DownloadIcon />
					<span>Export JSON</span>
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={onOpenSource} disabled={!sourceAvailable}>
					<ExternalLinkIcon />
					<span>Open Source Link</span>
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={onOpenReplace}>
					<EditFileIcon />
					<span>Replace / Update</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)

	const favoriteButton = (
		<Button
			variant="secondary"
			size="icon"
			type="button"
			className="astra-home-card__iconButton astra-home-card__heroMenuButton astra-home-card__heroMenuButton--favorite"
			aria-label={favoriteButtonLabel}
			aria-pressed={isFavorite}
			title={favoriteButtonTitle}
			onClick={onToggleFavorite}
			data-action="favorite"
		>
			<FavoriteIcon filled={isFavorite} />
		</Button>
	)

	const menuCluster = (
		<>
			{favoriteButton}
			{dropdownMenu}
		</>
	)

	return menuSlot ? createPortal(menuCluster, menuSlot) : menuCluster
}

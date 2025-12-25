import React from 'react'
import { Button } from '@/components/ui/button'
import { ResponsiveDialog } from '@/astra/shared/ui/ResponsiveDialog.jsx'
import { ExternalLinkIcon } from '../homeCardActionIcons.jsx'

export function SourceConfirmDialog({ open, onOpenChange, url, onConfirm, isLoading, container, identity }) {
	const hostname = React.useMemo(() => {
		try {
			return new URL(url).hostname
		} catch {
			return ''
		}
	}, [url])

	if (!url) {
		return null
	}

	const footer = (
		<>
			<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
				Cancel
			</Button>
			<Button onClick={onConfirm} disabled={isLoading}>
				{isLoading ? 'Opening…' : 'Open link'}
			</Button>
		</>
	)

	return (
		<ResponsiveDialog
			open={open}
			onOpenChange={onOpenChange}
			title="Open Source Link"
			description="Review the target before opening an external page."
			footer={footer}
			container={container}
			identity={identity}
			icon={<ExternalLinkIcon />}
		>
			<div className="astra-dialog-section">
				<p>
					This will open{' '}
					{hostname ? <strong className="astra-home-card__dialogHighlight">{hostname}</strong> : 'the link'} in a new tab. Make sure you trust the destination before continuing.
				</p>
				<span className="astra-home-card__dialogUrl">{url}</span>
			</div>
		</ResponsiveDialog>
	)
}

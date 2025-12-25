import React from 'react'

const ICON_SIZE = 16

export function FavoriteIcon({ filled = false }) {
	if (filled) {
		return (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width={ICON_SIZE}
				height={ICON_SIZE}
				viewBox="0 0 24 24"
				fill="currentColor"
				className="icon icon-tabler icons-tabler-filled icon-tabler-star"
			>
				<path stroke="none" d="M0 0h24v24H0z" fill="none" />
				<path d="M8.243 7.34l-6.38 .925l-.113 .023a1 1 0 0 0 -.44 1.684l4.622 4.499l-1.09 6.355l-.013 .11a1 1 0 0 0 1.464 .944l5.706 -3l5.693 3l.1 .046a1 1 0 0 0 1.352 -1.1l-1.091 -6.355l4.624 -4.5l.078 -.085a1 1 0 0 0 -.633 -1.62l-6.38 -.926l-2.852 -5.78a1 1 0 0 0 -1.794 0l-2.853 5.78z" />
			</svg>
		)
	}

	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={ICON_SIZE}
			height={ICON_SIZE}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="icon icon-tabler icons-tabler-outline icon-tabler-star"
		>
			<path stroke="none" d="M0 0h24v24H0z" fill="none" />
			<path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z" />
		</svg>
	)
}

export function EllipsisIcon() {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<circle cx="12" cy="12" r="1" />
			<circle cx="19" cy="12" r="1" />
			<circle cx="5" cy="12" r="1" />
		</svg>
	)
}

export function DownloadIcon() {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="M12 15V3" />
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
			<path d="m7 10 5 5 5-5" />
		</svg>
	)
}

export function ExternalLinkIcon() {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" />
			<path d="m21 3-9 9" />
			<path d="M15 3h6v6" />
		</svg>
	)
}

export function UploadIcon(props = {}) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={ICON_SIZE}
			height={ICON_SIZE}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			{...props}
		>
			<path d="m4 17 0 2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2" />
			<path d="M7 9l5-5 5 5" />
			<path d="M12 4v12" />
		</svg>
	)
}

export function ImageIcon(props = {}) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={ICON_SIZE}
			height={ICON_SIZE}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			{...props}
		>
			<rect width="18" height="18" x="3" y="3" rx="2" />
			<circle cx="12" cy="10" r="3" />
			<path d="M7 21v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
		</svg>
	)
}

export function LinkIcon(props = {}) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={ICON_SIZE}
			height={ICON_SIZE}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			{...props}
		>
			<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
			<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
		</svg>
	)
}

export function CloseIcon(props = {}) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={ICON_SIZE}
			height={ICON_SIZE}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			{...props}
		>
			<path d="M18 6 6 18" />
			<path d="m6 6 12 12" />
		</svg>
	)
}

export function DialogHeadingIcon() {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
			<circle cx="12" cy="12" r="9" />
			<line x1="12" y1="8" x2="12" y2="12.5" />
			<circle cx="12" cy="16" r="0.8" fill="currentColor" stroke="none" />
		</svg>
	)
}

export function EditFileIcon() {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
			<path d="m18.226 5.226-2.52-2.52A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-.351" />
			<path d="M21.378 12.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" />
			<path d="M8 18h1" />
		</svg>
	)
}

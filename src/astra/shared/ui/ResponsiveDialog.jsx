import React from 'react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerTitle,
} from '@/components/ui/drawer'
import { useMediaQuery } from '@/hooks/useMediaQuery'

export function ResponsiveDialog({
	open,
	onOpenChange,
	title,
	description,
	children,
	footer,
	container,
	identity,
	icon,
	headerContent,
	hideHeading = false,
}) {
	const isDesktop = useMediaQuery('(min-width: 768px)')
	const TitleComponent = isDesktop ? DialogTitle : DrawerTitle
	const DescriptionComponent = isDesktop ? DialogDescription : DrawerDescription
	const descriptionNode = description ? (
		<DescriptionComponent>{description}</DescriptionComponent>
	) : (
		<DescriptionComponent className="sr-only">Dialog details</DescriptionComponent>
	)
	const headingIcon = icon ? (
		<span className="astra-dialog-icon" aria-hidden="true">
			{icon}
		</span>
	) : null
	const heading = (
		<div className="astra-dialog-heading">
			{headingIcon}
			<div className="astra-dialog-headingContent">
				<TitleComponent className="text-lg">{title}</TitleComponent>
				{descriptionNode}
			</div>
		</div>
	)
	const body = (
		<div className="astra-dialog-body">
			<div className="astra-dialog-content">{children}</div>
		</div>
	)
	const header = (
		<div className="astra-dialog-header">
			{headerContent || <DialogIdentity identity={identity} />}
		</div>
	)
	const footerNode = footer ? (
		<div className="astra-dialog-footer">{footer}</div>
	) : null

	if (isDesktop) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					className="astra-dialog-surface"
					container={container}
				>
					{header}
					{hideHeading ? null : heading}
					{body}
					{footerNode}
				</DialogContent>
			</Dialog>
		)
	}

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent
				className="astra-drawer-surface"
				container={container}
			>
				{header}
				{hideHeading ? null : heading}
				{body}
				{footerNode}
			</DrawerContent>
		</Drawer>
	)
}

function DialogIdentity({ identity }) {
	if (!identity) return null
	const label = typeof identity?.name === 'string' && identity.name.trim() ? identity.name.trim() : 'Character'
	const avatar = identity?.avatarUrl ?? ''
	return (
		<div className="astra-dialog-identity">
			<div className="astra-dialog-identityAvatar">
				{avatar ? (
					<img
						className="astra-dialog-identityImage"
						src={avatar}
						alt={`${label} avatar`}
						width={24}
						height={24}
						loading="lazy"
						decoding="async"
					/>
				) : null}
			</div>
			<span className="astra-dialog-identityName" title={label}>
				{label}
			</span>
		</div>
	)
}

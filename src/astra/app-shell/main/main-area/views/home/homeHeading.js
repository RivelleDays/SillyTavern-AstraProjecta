import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrainIcon, HomeIcon } from 'lucide-react'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { applyPrimaryHeadingToSlot } from '../../services/primaryHeading.js'
import { getDefaultAvatar } from '../../services/avatarUtils.js'

function resolveDisplayName(route) {
	if (typeof route?.displayName === 'string' && route.displayName) {
		return route.displayName
	}
	if (route?.entityType === 'group') return 'Group'
	return 'Character'
}

const HomeBreadcrumb = React.memo(function HomeBreadcrumb({ route, onHomeClick }) {
	const isEntityView = route?.view === 'entity'
	const homeLabel = isEntityView ? 'Home' : 'SillyTavern'
	const homeAriaLabel = isEntityView ? 'Back to home' : 'SillyTavern'
	const HomeIconComponent = isEntityView ? HomeIcon : BrainIcon
	const avatarUrl = isEntityView
		? typeof route?.avatarUrl === 'string' && route.avatarUrl
			? route.avatarUrl
			: getDefaultAvatar()
		: ''

	const handleHomeClick = event => {
		event.preventDefault()
		if (typeof onHomeClick === 'function') {
			onHomeClick()
		}
	}

	const homeCrumb = isEntityView ? (
		<Tooltip>
			<TooltipTrigger asChild>
				<BreadcrumbLink
					href="#"
					onClick={handleHomeClick}
					aria-label={homeAriaLabel}
					className="font-semibold">
					<HomeIconComponent aria-hidden="true" size={16} />
					<span>{homeLabel}</span>
				</BreadcrumbLink>
			</TooltipTrigger>
			<TooltipContent
				side="bottom"
				sideOffset={8}
				showArrow
				className="astra-tooltip dark px-2 py-1 text-xs">
				{homeAriaLabel}
			</TooltipContent>
		</Tooltip>
	) : (
		<BreadcrumbPage className="font-semibold">
			<HomeIconComponent aria-hidden="true" size={16} />
			<span>{homeLabel}</span>
		</BreadcrumbPage>
	)

	return (
		<TooltipProvider delayDuration={0}>
			<Breadcrumb data-astra-component="HomeBreadcrumb" className="w-full">
				<BreadcrumbList>
					<BreadcrumbItem>{homeCrumb}</BreadcrumbItem>
					{isEntityView ? (
						<>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage className="max-w-[140px] font-semibold sm:max-w-[180px] lg:max-w-[220px]">
									<span
										className="astra-breadcrumb__avatar h-7 w-7 rounded-full bg-cover bg-center bg-no-repeat ring-1 ring-border sm:h-8 sm:w-8"
										style={{ backgroundImage: `url("${avatarUrl}")` }}
										aria-hidden="true"
									/>
									<span className="truncate">{resolveDisplayName(route)}</span>
								</BreadcrumbPage>
							</BreadcrumbItem>
						</>
					) : null}
				</BreadcrumbList>
			</Breadcrumb>
		</TooltipProvider>
	)
})
HomeBreadcrumb.displayName = 'HomeBreadcrumb'

let breadcrumbRoot = null
let breadcrumbHost = null

function ensureBreadcrumbHost(documentRef) {
	if (!documentRef) return null

	if (breadcrumbHost && breadcrumbHost.ownerDocument !== documentRef) {
		try {
			breadcrumbRoot?.unmount?.()
		} catch {
			// no-op
		}
		breadcrumbRoot = null
		breadcrumbHost = null
	}

	if (!breadcrumbHost) {
		breadcrumbHost = documentRef.createElement('div')
		breadcrumbHost.className = 'astra-home-breadcrumb'
		try {
			breadcrumbRoot = createRoot(breadcrumbHost)
		} catch (error) {
			console?.error?.('[AstraProjecta] Failed to mount home breadcrumb.', error)
			breadcrumbRoot = null
			breadcrumbHost = null
		}
	}

	return breadcrumbHost
}

export function applyHomeRouteHeading({
	route,
	titleSlot,
	divider,
	documentRef,
	onHomeClick,
}) {
	if (!titleSlot) return
	const doc = documentRef ?? titleSlot.ownerDocument ?? globalThis.document
	const hostNode = ensureBreadcrumbHost(doc)
	const isEntityView = route?.view === 'entity'

	if (hostNode && breadcrumbRoot) {
		hostNode.classList.toggle('astra-home-breadcrumb--entity', isEntityView)
		breadcrumbRoot.render(<HomeBreadcrumb route={route || {}} onHomeClick={onHomeClick} />)
		applyPrimaryHeadingToSlot(titleSlot, hostNode, 'home', { divider })
		return
	}

	applyPrimaryHeadingToSlot(titleSlot, null, undefined, { divider })
}

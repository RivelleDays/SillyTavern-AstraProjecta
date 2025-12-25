import React, { useCallback, useEffect, useMemo, useState, useId } from 'react'
import {
	ChevronDown,
	ChevronRight,
	Hash,
	History,
	ListCollapse,
	ListTree,
	MessageCircle,
	PencilLine,
	RotateCcw,
	StepForward,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ResponsiveDialog } from '@/astra/shared/ui/ResponsiveDialog.jsx'

const KIND_LABELS = {
	edit: 'Edited',
	continue: 'Continue',
	regenerate: 'Regenerated',
	origin: 'Original',
}
const KIND_ICONS = {
	edit: <PencilLine size={14} strokeWidth={2.2} aria-hidden="true" />,
	continue: <StepForward size={14} strokeWidth={2.2} aria-hidden="true" />,
	regenerate: <RotateCcw size={14} strokeWidth={2.2} aria-hidden="true" />,
	origin: <MessageCircle size={14} strokeWidth={2.2} aria-hidden="true" />,
}
const EMPTY_COLLAPSED_PATHS = []
const DISPLAY_MODES = {
	FRAGMENT: 'fragment',
	FULL: 'full',
}

function formatTimestamp(value) {
	if (typeof value !== 'number' || value <= 0) return null
	const date = new Date(value)
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	const hours = String(date.getHours()).padStart(2, '0')
	const minutes = String(date.getMinutes()).padStart(2, '0')
	const seconds = String(date.getSeconds()).padStart(2, '0')
	return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
}

function serializePath(path = []) {
	if (!Array.isArray(path) || !path.length) return ''
	return path.join('.')
}

function deserializePath(key = '') {
	if (typeof key !== 'string' || !key.length) return []
	return key
		.split('.')
		.map(part => Number.parseInt(part, 10))
		.filter(idx => Number.isInteger(idx))
}

function normalizeCollapsedPaths(raw) {
	if (!Array.isArray(raw)) return new Set()
	const keys = raw
		.map(entry => {
			if (Array.isArray(entry)) return serializePath(entry)
			if (typeof entry === 'string') return entry
			return ''
		})
		.filter(Boolean)
	return new Set(keys)
}

function buildNode(swipe, path, parentText = '') {
	const text = swipe?.mes ?? ''
	const computedFullText = `${parentText}${text}`
	const fullText = typeof swipe?.fullText === 'string' ? swipe.fullText : computedFullText
	return {
		path,
		text,
		fullText,
		kind: swipe?.kind ?? 'continue',
		createdAt: swipe?.createdAt ?? null,
		children: Array.isArray(swipe?.swipes)
			? swipe.swipes.map((child, idx) => buildNode(child, [...path, idx], fullText))
			: [],
	}
}

function pathsMatch(a = [], b = []) {
	if (a.length !== b.length) return false
	return a.every((value, idx) => value === b[idx])
}

function collectPathKeys(nodes = []) {
	const keys = []
	nodes.forEach(node => {
		const key = serializePath(node.path)
		if (key) keys.push(key)
		if (Array.isArray(node.children) && node.children.length) {
			keys.push(...collectPathKeys(node.children))
		}
	})
	return keys
}

function buildNodeLookup(nodes = []) {
	const lookup = new Map()
	const walk = list => {
		list.forEach(node => {
			const key = serializePath(node.path)
			if (key) lookup.set(key, node)
			if (Array.isArray(node.children) && node.children.length) {
				walk(node.children)
			}
		})
	}
	walk(nodes)
	return lookup
}

function RevisionTreeNode({
	node,
	activePath,
	activeFullText,
	onSelect,
	depth = 0,
	collapsedPaths,
	onToggleCollapse,
	displayMode = DISPLAY_MODES.FULL,
}) {
	const isActive = pathsMatch(node.path, activePath)
	const normalizedActiveFull = typeof activeFullText === 'string' ? activeFullText : ''
	const nodeFullText = typeof node.fullText === 'string' ? node.fullText : ''
	const isUsed = Boolean(
		normalizedActiveFull &&
			nodeFullText &&
			(normalizedActiveFull === nodeFullText || normalizedActiveFull.startsWith(nodeFullText)),
	)
	const isInactive = !isUsed
	const hasChildren = Array.isArray(node.children) && node.children.length > 0
	const isRoot = depth === 0
	const text = (node.text ?? '').trim()
	const fullText = (node.fullText ?? '').trim()
	const label =
		displayMode === DISPLAY_MODES.FULL
			? fullText || text || '(empty)'
			: isRoot
				? fullText || text || '(empty)'
				: text || fullText || '(empty)'
	const isEmpty = !label.trim()
	const kindLabel = KIND_LABELS[node.kind] || 'Revision'
	const timestamp = formatTimestamp(node.createdAt)
	const kindIcon = KIND_ICONS[node.kind] ?? KIND_ICONS.origin
	const pathKey = serializePath(node.path)
	const isCollapsed = collapsedPaths.has(pathKey)
	const checkboxLabel = isUsed ? 'Currently included in this message' : 'Apply message up to this segment'

	return (
		<li
			className="astra-continueTreeNode"
			data-active={isActive ? 'true' : 'false'}
			data-empty={isEmpty ? 'true' : 'false'}
			data-inactive={isInactive ? 'true' : 'false'}
			data-used={isUsed ? 'true' : 'false'}
			role="none"
		>
			<div
				className="astra-continueTreeNode__button"
				style={{
					'--continue-depth': depth,
					'--continue-hasDepth': depth > 0 ? 1 : 0,
				}}
				role="treeitem"
				tabIndex={0}
				onClick={() => onSelect(node.path)}
				onKeyDown={event => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault()
						onSelect(node.path)
					}
				}}
				aria-current={isActive ? 'true' : undefined}
				aria-selected={isActive}
				aria-level={depth + 1}
				aria-expanded={!isCollapsed}
			>
				<div className="astra-continueTreeNode__content">
			<div
				className="astra-continueTreeNode__meta"
			onClick={event => {
				event.stopPropagation()
				onToggleCollapse?.(node.path)
			}}
		>
			<div className="astra-continueTreeNode__metaMainGroup">
				<div className="astra-continueTreeNode__metaMain">
					<span className="astra-continueTreeNode__chip" data-kind={node.kind}>
						{kindIcon}
						{kindLabel}
					</span>
					{timestamp ? <span className="astra-continueTreeNode__time">{timestamp}</span> : null}
				</div>
				<button
					type="button"
					className="astra-continueTreeNode__collapseToggle"
								aria-label={isCollapsed ? 'Expand text' : 'Collapse text'}
								aria-expanded={!isCollapsed}
								onClick={event => {
									event.stopPropagation()
									onToggleCollapse?.(node.path)
								}}
								onKeyDown={event => {
									event.stopPropagation()
									if (event.key === ' ') {
										event.preventDefault()
									}
								}}
							>
								{isCollapsed ? (
									<ChevronRight size={14} strokeWidth={2.2} aria-hidden="true" />
								) : (
									<ChevronDown size={14} strokeWidth={2.2} aria-hidden="true" />
								)}
							</button>
						</div>
						<div className="astra-continueTreeNode__metaActions">
							<Checkbox
								className="astra-continueTreeNode__activeCheckbox"
								checked={Boolean(isUsed)}
								aria-label={checkboxLabel}
								onCheckedChange={() => onSelect(node.path)}
								onClick={event => {
									event.stopPropagation()
								}}
								onKeyDown={event => {
									event.stopPropagation()
									if (event.key === ' ') {
										event.preventDefault()
									}
								}}
							/>
						</div>
					</div>
					<div
						className="astra-continueTreeNode__textWrapper"
						data-collapsed={isCollapsed ? 'true' : 'false'}
					>
						<span className="astra-continueTreeNode__text">{label}</span>
					</div>
				</div>
			</div>
			{hasChildren ? (
				<ul className="astra-continueTreeList" role="group">
					{node.children.map((child, idx) => (
						<RevisionTreeNode
							key={`${node.path.join('-')}-${idx}`}
							node={child}
							activePath={activePath}
							activeFullText={activeFullText}
							onSelect={onSelect}
							depth={depth + 1}
							collapsedPaths={collapsedPaths}
							onToggleCollapse={onToggleCollapse}
							displayMode={displayMode}
						/>
					))}
				</ul>
			) : null}
		</li>
	)
}

export function RevisionOverlay({
	open,
	message,
	identity,
	onClose,
	onSelectPath,
	container,
	onCollapseStateChange,
}) {
	const swipeId = message?.swipe_id ?? 0
	const rootSwipe = message?.continueHistory?.[swipeId]
	const activePath = rootSwipe?.active ?? []
	const swipeDisplayId = Number.isInteger(message?.swipe_id) ? message.swipe_id + 1 : null
	const identityLabel =
		typeof identity?.name === 'string' && identity.name.trim() ? identity.name.trim() : 'Character'
	const mesDisplayId = identity?.mesId ?? message?.mesid ?? null
	const historyTitle = identityLabel

	const nodes = useMemo(() => {
		if (!rootSwipe) return []
		return [buildNode(rootSwipe, [swipeId])]
	}, [rootSwipe, swipeId])
	const nodeLookup = useMemo(() => buildNodeLookup(nodes), [nodes])
	const allPathKeys = useMemo(() => collectPathKeys(nodes), [nodes])
	const activePathKey = serializePath(activePath)
	const activeNode = activePathKey ? nodeLookup.get(activePathKey) : null
	const activeFullText =
		typeof activeNode?.fullText === 'string'
			? activeNode.fullText
			: typeof message?.mes === 'string'
				? message.mes
				: ''

	const collapsedSource = message?._astraContinueCollapsedPaths ?? EMPTY_COLLAPSED_PATHS
	const collapsedFromMessage = useMemo(
		() => normalizeCollapsedPaths(collapsedSource),
		[collapsedSource],
	)
	const [collapsedPaths, setCollapsedPaths] = useState(collapsedFromMessage)
	const [displayMode, setDisplayMode] = useState(DISPLAY_MODES.FRAGMENT)
	const displayModeToggleId = useId()

	useEffect(() => {
		setCollapsedPaths(collapsedFromMessage)
	}, [collapsedFromMessage])

	const persistCollapsed = useCallback(
		next => {
			if (!message) return
			const serialized = Array.from(next)
			const normalized = serialized
				.map(deserializePath)
				.filter(path => Array.isArray(path) && path.length)
			message._astraContinueCollapsedPaths = normalized
			onCollapseStateChange?.(normalized)
		},
		[message, onCollapseStateChange],
	)

	const handleToggleCollapse = useCallback(
		path => {
			const key = serializePath(path)
			if (!key) return
			setCollapsedPaths(prev => {
				const next = new Set(prev)
				if (next.has(key)) {
					next.delete(key)
				} else {
					next.add(key)
				}
				persistCollapsed(next)
				return next
			})
		},
		[persistCollapsed],
	)

	const handleExpandAll = useCallback(() => {
		setCollapsedPaths(prev => {
			if (!prev.size) return prev
			const next = new Set()
			persistCollapsed(next)
			return next
		})
	}, [persistCollapsed])

	const handleCollapseAll = useCallback(() => {
		if (!allPathKeys.length) return
		const next = new Set(allPathKeys)
		setCollapsedPaths(next)
		persistCollapsed(next)
	}, [allPathKeys, persistCollapsed])

	const hasNodes = nodes.length > 0
	const isAllCollapsed = hasNodes && allPathKeys.length > 0 && collapsedPaths.size >= allPathKeys.length

	return (
		<ResponsiveDialog
			open={open}
			onOpenChange={isOpen => {
				if (!isOpen) onClose?.()
			}}
			container={container}
			title="Message Revision History"
			description="Review and restore message revisions and edits."
			identity={identity}
			icon={<History size={18} strokeWidth={2.2} />}
			headerContent={
				<div className="astra-dialog-identity">
					<div className="astra-dialog-identityAvatar">
						{identity?.avatarUrl ? (
							<img
								className="astra-dialog-identityImage"
								src={identity.avatarUrl}
								alt={`${identityLabel} avatar`}
								width={24}
								height={24}
								loading="lazy"
								decoding="async"
							/>
						) : null}
					</div>
					<span className="astra-dialog-identityName" title={historyTitle}>
						{identityLabel}
					</span>
					{mesDisplayId ? (
						<>
							<span
								className="astra-dialog-identityMesBadge"
								aria-label={`Message #${mesDisplayId}`}
								title={`Message #${mesDisplayId}`}
							>
								<Hash size={12} aria-hidden="true" className="astra-dialog-identityMesBadgeIcon" />
								{`Message ${mesDisplayId}`}
							</span>
							{swipeDisplayId ? (
								<span
									className="astra-dialog-identityMesBadge"
									aria-label={`Swipe #${swipeDisplayId}`}
									title={`Swipe #${swipeDisplayId}`}
								>
									<Hash size={12} aria-hidden="true" className="astra-dialog-identityMesBadgeIcon" />
									{`Swipe ${swipeDisplayId}`}
								</span>
							) : null}
						</>
					) : null}
				</div>
			}
			footer={
				<div className="astra-continueDialogFooter">
					<div className="astra-continueDialogFooter__actions">
						<div className="astra-continueDialogFooter__modes" role="group" aria-label="Display mode">
							<Checkbox
								id={displayModeToggleId}
								checked={displayMode === DISPLAY_MODES.FULL}
								onCheckedChange={checked =>
									setDisplayMode(checked ? DISPLAY_MODES.FULL : DISPLAY_MODES.FRAGMENT)
								}
							/>
							<Label className="astra-continueDialogFooter__modeLabel" htmlFor={displayModeToggleId}>
								Show full text
							</Label>
						</div>
					</div>
					<div className="astra-continueDialogFooter__buttons">
						<div className="astra-continueDialogFooter__buttonsGroup">
							<Button
								variant="outline"
								onClick={handleExpandAll}
								disabled={!collapsedPaths.size}
							>
								<ListTree size={16} aria-hidden="true" />
								Expand all
							</Button>
							<Button
								variant="outline"
								onClick={handleCollapseAll}
								disabled={!hasNodes || isAllCollapsed}
							>
								<ListCollapse size={16} aria-hidden="true" />
								Collapse all
							</Button>
						</div>
						<Button onClick={onClose}>Done</Button>
					</div>
				</div>
			}
		>
			<div className="astra-continueDialogBody">
				{hasNodes ? (
					<ul className="astra-continueTree" role="tree" aria-label="Continue branches">
						{nodes.map(node => (
							<RevisionTreeNode
								key={node.path.join('-')}
								node={node}
								activePath={activePath}
								activeFullText={activeFullText}
								onSelect={onSelectPath}
								collapsedPaths={collapsedPaths}
								onToggleCollapse={handleToggleCollapse}
								displayMode={displayMode}
							/>
					))}
				</ul>
				) : (
					<div className="astra-continueEmpty">No continues recorded yet.</div>
				)}
			</div>
		</ResponsiveDialog>
	)
}

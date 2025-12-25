function formatMemberName(member) {
	if (!member) return 'Unknown member'
	if (typeof member === 'string') return member
	if (typeof member === 'object') {
		return member.name || member.display_name || member.id || 'Unknown member'
	}
	return String(member)
}

export function createGroupView() {
	const root = document.createElement('article')
	root.className = 'entity-info-group groupInfo'

	const groupHeader = document.createElement('header')
	groupHeader.className = 'entity-info-group__header groupInfoHeader'

	const name = document.createElement('h3')
	name.className = 'entity-info-group__name groupInfoName'
	name.textContent = 'Group'
	name.title = 'Group'

	const count = document.createElement('span')
	count.className = 'entity-info-group__member-count groupInfoMemberCount'
	count.textContent = '0 members'

	groupHeader.append(name, count)

	const description = document.createElement('p')
	description.className = 'entity-info-group__description groupInfoDescription'
	description.textContent = 'Group overview will appear here.'

	const membersContainer = document.createElement('div')
	membersContainer.className = 'entity-info-group__members groupInfoMembers'

	const membersTitle = document.createElement('h4')
	membersTitle.className = 'entity-info-group__members-title groupInfoMembersTitle'
	membersTitle.textContent = 'Members'

	const memberList = document.createElement('ul')
	memberList.className = 'entity-info-group__members-list groupInfoMembersList'

	membersContainer.append(membersTitle, memberList)
	membersContainer.hidden = true

	root.append(groupHeader, description, membersContainer)

	function applyMembers(entity) {
		const members = Array.isArray(entity?.members) ? entity.members : []
		memberList.replaceChildren()

		if (!members.length) {
			membersContainer.hidden = true
			return
		}

		members.forEach(member => {
			const item = document.createElement('li')
			item.className = 'entity-info-group__members-item groupInfoMembersItem'
			item.textContent = formatMemberName(member)
			memberList.append(item)
		})

		membersContainer.hidden = false
	}

	function update({ entity, meta } = {}) {
		const displayName = meta?.name || entity?.name || entity?.display_name || 'Group'
		name.textContent = displayName
		name.title = displayName

		const memberCount = Array.isArray(entity?.members) ? entity.members.length : 0
		const memberLabel = memberCount === 1 ? 'member' : 'members'
		count.textContent = `${memberCount} ${memberLabel}`

		const summary = entity?.description || entity?.summary || ''
		if (summary) {
			description.textContent = summary
			description.classList.remove('is-placeholder')
		} else {
			description.textContent = 'No group description available.'
			description.classList.add('is-placeholder')
		}

		applyMembers(entity)
	}

	return {
		root,
		update,
		destroy() {
			root.replaceChildren()
		},
	}
}

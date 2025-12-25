// Navigation config contract:
// - Top section drives main-area tabs: `main.type === 'view'` renders Astra views, `main.type === 'drawer'` ports SillyTavern drawers.
// - MAIN_AREA_DRAWERS whitelists ST drawer ids the main area can surface; keep it in sync with drawer-type nav entries.
// - Sections: top = workspace tabs (home/chat/world-info/extensions), middle = legacy modules (AI/User/Character/Persona settings), bottom reserved.
import { getLucideIconMarkup } from '@/astra/shared/icons/lucide'

const BRAIN_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-brain-icon lucide-brain"><path d="M12 18V5"/><path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4"/><path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"/><path d="M17.997 5.125a4 4 0 0 1 2.526 5.77"/><path d="M18 18a4 4 0 0 0 2-7.464"/><path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"/><path d="M6 18a4 4 0 0 1-2-7.464"/><path d="M6.003 5.125a4 4 0 0 0-2.526 5.77"/></svg>'
const AI_SETTINGS_ICON = getLucideIconMarkup('settings-2', { strokeWidth: 1.75 })
const SETTINGS_ICON = getLucideIconMarkup('settings')
const CHAT_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-messages-square-icon lucide-messages-square"><path d="M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/><path d="M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1"/></svg>'
const CHARACTER_MANAGEMENT_ICON = getLucideIconMarkup('users')
const LOREBOOK_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-books"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 4m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /><path d="M9 4m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /><path d="M5 8h4" /><path d="M9 16h4" /><path d="M13.803 4.56l2.184 -.53c.562 -.135 1.133 .19 1.282 .732l3.695 13.418a1.02 1.02 0 0 1 -.634 1.219l-.133 .041l-2.184 .53c-.562 .135 -1.133 -.19 -1.282 -.732l-3.695 -13.418a1.02 1.02 0 0 1 .634 -1.219l.133 -.041z" /><path d="M14 9l4 -1" /><path d="M16 16l3.923 -.98" /></svg>'
const EXTENSIONS_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-cube-spark"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M21 12v-4.01a1.98 1.98 0 0 0 -1 -1.717l-7 -4.008a2.02 2.02 0 0 0 -2 0l-7 4.008c-.619 .355 -1 1.01 -1 1.718v8.018c0 .709 .381 1.363 1 1.717l7 4.008c.62 .354 1.38 .354 2 0"></path><path d="M12 22v-10"></path><path d="M12 12l8.73 -5.04"></path><path d="M3.27 6.96l8.73 5.04"></path><path d="M19 22.5a4.75 4.75 0 0 1 3.5 -3.5a4.75 4.75 0 0 1 -3.5 -3.5a4.75 4.75 0 0 1 -3.5 3.5a4.75 4.75 0 0 1 3.5 3.5"></path></svg>'

export const NAVIGATION_TAB_IDS = ['home', 'chat', 'world-info', 'extensions']

export const MAIN_AREA_DRAWERS = ['WorldInfo', 'rm_extensions_block']

export const NAVIGATION_SECTIONS = {
    top: [
        {
            id: 'home',
            title: 'SillyTavern',
            iconMarkup: BRAIN_ICON,
            main: {
                type: 'view',
                viewId: 'home',
                headingLabel: 'SillyTavern',
            },
            sidebar: { panel: 'home' },
        },
        {
            id: 'chat',
            title: 'Chat',
            iconMarkup: CHAT_ICON,
            main: {
                type: 'view',
                viewId: 'chat',
                headingLabel: 'Chat Area',
            },
            sidebar: { panel: 'chat' },
        },
        {
            id: 'world-info',
            title: 'Worlds/Lorebooks',
            iconMarkup: LOREBOOK_ICON,
            main: {
                type: 'drawer',
                drawerId: 'WorldInfo',
                headingLabel: 'Worlds/Lorebooks',
            },
            sidebar: { panel: 'world-info' },
        },
        {
            id: 'extensions',
            title: 'Extensions',
            iconMarkup: EXTENSIONS_ICON,
            main: {
                type: 'drawer',
                drawerId: 'rm_extensions_block',
                headingLabel: 'Extensions',
            },
            sidebar: { panel: 'extensions' },
        },
    ],
    middle: [
        {
            id: 'ai-settings',
            title: 'AI Settings',
            iconMarkup: AI_SETTINGS_ICON,
            sidebar: { legacy: true },
        },
        {
            id: 'user-settings',
            title: 'User Settings',
            iconMarkup: SETTINGS_ICON,
            sidebar: { legacy: true },
        },
        {
            id: 'character-management',
            title: 'Character Management',
            iconMarkup: CHARACTER_MANAGEMENT_ICON,
            sidebar: { legacy: true },
        },
        {
            id: 'persona-management',
            title: 'Persona Management',
            iconMarkup:
                '<img id="personaManagementNavAvatar" class="nav-avatar-icon" alt="Persona Avatar" src="/img/ai4.png" loading="lazy" decoding="async" />',
            sidebar: { legacy: true },
        },
    ],
    bottom: [],
}

export function getNavSectionsWithIcons() {
    return {
        top: NAVIGATION_SECTIONS.top.map(item => ({ ...item })),
        middle: NAVIGATION_SECTIONS.middle.map(item => ({ ...item })),
        bottom: NAVIGATION_SECTIONS.bottom.map(item => ({ ...item })),
    }
}

export function getSidebarNavRailItems() {
    const shouldInclude = item => item.sidebar?.includeInNavRail !== false
    return {
        top: NAVIGATION_SECTIONS.top.filter(shouldInclude),
        middle: NAVIGATION_SECTIONS.middle.filter(shouldInclude),
        bottom: NAVIGATION_SECTIONS.bottom.filter(shouldInclude),
    }
}

/**
 * @typedef {Object} LoreContainers
 * @property {HTMLDivElement} root
 * @property {HTMLDivElement} activeWrap
 * @property {HTMLDivElement} activeTitle
 * @property {HTMLDivElement} activeControls
 * @property {HTMLDivElement} activeList
 * @property {HTMLDivElement} activeEmpty
 * @property {HTMLDivElement} potentialWrap
 * @property {HTMLDivElement} potentialTitle
 * @property {HTMLDivElement} potentialControls
 * @property {HTMLDivElement} potentialList
 * @property {HTMLDivElement} potentialEmpty
 * @property {HTMLDivElement} allActiveList
 * @property {HTMLDivElement} allActiveEmpty
 * @property {HTMLDivElement} allPotentialList
 * @property {HTMLDivElement} allPotentialEmpty
 */

/**
 * Construct the DOM nodes used to assemble the lore UI.
 * Keeps the structure centralized so the view and controller stay in sync.
 * @returns {LoreContainers}
 */
export function createLoreContainers() {
	return {
		root: document.createElement('div'),
		activeWrap: document.createElement('div'),
		activeTitle: document.createElement('div'),
		activeControls: document.createElement('div'),
		activeList: document.createElement('div'),
		activeEmpty: document.createElement('div'),
		potentialWrap: document.createElement('div'),
		potentialTitle: document.createElement('div'),
		potentialControls: document.createElement('div'),
		potentialList: document.createElement('div'),
		potentialEmpty: document.createElement('div'),
		allActiveList: document.createElement('div'),
		allActiveEmpty: document.createElement('div'),
		allPotentialList: document.createElement('div'),
		allPotentialEmpty: document.createElement('div'),
	}
}

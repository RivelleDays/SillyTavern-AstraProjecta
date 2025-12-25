/**
 * Provides a helper for mounting custom content inside the generic popup UI.
 */
export function createPopupHost({ loadPopupModule }) {
    async function mountInGenericPopup(modalContentEl) {
        const { POPUP_TYPE, callGenericPopup } = await loadPopupModule();

        const hostId = `chat-manager-host-${Math.random().toString(36).slice(2, 9)}`;
        const popupPromise = callGenericPopup(`<div id="${hostId}"></div>`, POPUP_TYPE.ALERT);

        const waitForEl = (id, timeout = 4000) => (
            new Promise((resolve, reject) => {
                const start = performance.now();
                (function loop() {
                    const el = document.getElementById(id);
                    if (el) return resolve(el);
                    if (performance.now() - start > timeout) {
                        return reject(new Error('Popup host not found'));
                    }
                    requestAnimationFrame(loop);
                })();
            })
        );

        const host = await waitForEl(hostId);
        const container = host.parentElement || host;

        // Hide default popup chrome and mount our modal
        for (const n of Array.from(container.children)) {
            if (n !== host) n.style.display = 'none';
        }
        container.replaceChild(modalContentEl, host);

        const overlay = container.parentElement || container;

        const headerText = modalContentEl.querySelector('.chat-manager-modal-header')?.textContent || '';
        const isCategoryManager = /Category manager/i.test(headerText);
        const isAssignCategoriesPopup = /Manage categories for/i.test(headerText)
            || !!modalContentEl.querySelector('.chat-manager-modal-cat-chooser');

        if (isCategoryManager) overlay.classList.add('wide_dialogue_popup', 'large_dialogue_popup');

        const okBtn = overlay.querySelector('.popup-button-ok.result-control');
        const cancelBtn = overlay.querySelector('.popup-button-cancel.result-control');
        const hasCustomFooter = !!modalContentEl.querySelector('.chat-manager-modal-footer');

        if (hasCustomFooter) {
            if (okBtn) okBtn.remove();
            if (cancelBtn) cancelBtn.remove();
        } else {
            if (cancelBtn) cancelBtn.remove();
            if (okBtn) {
                okBtn.textContent = 'Close';
                okBtn.setAttribute('data-i18n', 'Close');
            }
        }

        function closeAllPopups() {
            try { overlay.remove(); } catch {}
            const leftovers = document.querySelectorAll('dialog, .dialogue_popup, .wide_dialogue_popup, .large_dialogue_popup');
            for (const node of leftovers) {
                try { node.remove(); } catch {}
            }
        }

        if (!isAssignCategoriesPopup) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeAllPopups();
            });
        }

        document.addEventListener('keydown', function esc(ev) {
            if (ev.key === 'Escape') {
                closeAllPopups();
                document.removeEventListener('keydown', esc);
            }
        });

        for (const btn of [okBtn, cancelBtn]) {
            if (!btn) continue;
            btn.addEventListener('click', () => { queueMicrotask(closeAllPopups); }, { capture: true });
        }

        return { close: closeAllPopups, awaitClose: popupPromise };
    }

    return { mountInGenericPopup };
}

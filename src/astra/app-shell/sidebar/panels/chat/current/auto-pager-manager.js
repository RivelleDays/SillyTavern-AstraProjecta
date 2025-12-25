export function createAutoPagerManager({ chatListEl, autoPagerSentinel, controller }) {
    let observer = null;
    let pending = false;

    function resolveScrollRoot() {
        if (typeof window === 'undefined') return null;
        let node = chatListEl?.parentElement || null;
        while (node && node !== document.body) {
            const style = window.getComputedStyle(node);
            const overflowY = style?.overflowY || style?.overflow;
            if (/auto|scroll|overlay/i.test(overflowY)) return node;
            node = node.parentElement;
        }
        return null;
    }

    function teardown() {
        pending = false;
        if (observer) {
            try { observer.disconnect(); } catch { /* no-op */ }
            observer = null;
        }
        if (autoPagerSentinel?.parentNode === chatListEl) {
            chatListEl.removeChild(autoPagerSentinel);
        }
    }

    function ensure({ enabled, hasMore, onRequestMore }) {
        if (!enabled || !hasMore) {
            teardown();
            return;
        }

        if (typeof IntersectionObserver !== 'function') return;

        if (!autoPagerSentinel.isConnected) {
            chatListEl.appendChild(autoPagerSentinel);
        }

        const root = resolveScrollRoot();
        if (observer) {
            try { observer.disconnect(); } catch { /* ignore */ }
        }

        observer = new IntersectionObserver((entries) => {
            const entry = entries.find((e) => e.isIntersecting);
            if (!entry || pending) return;

            pending = true;

            if (typeof controller?.autoLoadNextChunk === 'function') {
                controller.autoLoadNextChunk();
            } else {
                controller?.showMore?.();
            }

            const outcome = onRequestMore?.();
            if (outcome && typeof outcome.then === 'function') {
                outcome.finally(() => { pending = false; });
            } else {
                pending = false;
            }
        }, { root, threshold: root ? 0.75 : 0.25 });

        observer.observe(autoPagerSentinel);
    }

    function markSettled() {
        pending = false;
    }

    return {
        ensure,
        teardown,
        markSettled,
    };
}

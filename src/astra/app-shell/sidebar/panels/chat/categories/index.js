import { getSortableDelay } from '../../../../../../../../../../utils.js';
import { createPopupHost } from './manager/popup-host.js';
import { createAssignModal } from './manager/assign-modal.js';
import { createCategoryCards } from './manager/category-cards.js';
import { createCategoryManagerPage } from './manager/category-manager-page.js';

const POPUP_MODULE_PATH = '/scripts/popup.js';

/**
 * Categories UI + behaviors for the Current panel.
 * Encapsulates: category cards rendering, assign modal, generic popup mount,
 * and the Category Manager page (incl. DnD).
 */
export function createCategoriesModule({
    store,
    openChatById,
    onDataChanged,
    getContext,
}) {
    const {
        loadCats,
        saveCats,
        loadMap,
        saveMap,
        ensureCategory,
        deleteCategory,
        renameCategory,
        setChatInCategory,
        removeChatFromCategory,
        handleChatRenamePersist,
    } = store;

    const loadPopupModule = () => import(
        /* webpackIgnore: true */
        POPUP_MODULE_PATH
    );

    const { mountInGenericPopup } = createPopupHost({ loadPopupModule });

    const { openAssignModal } = createAssignModal({
        loadCats,
        loadMap,
        ensureCategory,
        deleteCategory,
        setChatInCategory,
        onDataChanged,
        mountInGenericPopup,
        loadPopupModule,
    });

    const { render } = createCategoryCards({
        loadCats,
        loadMap,
        saveCats,
        openChatById,
    });

    const {
        getCategoriesPageEl,
        renderCategoryManagerPage,
    } = createCategoryManagerPage({
        loadCats,
        saveCats,
        loadMap,
        saveMap,
        ensureCategory,
        deleteCategory,
        renameCategory,
        removeChatFromCategory,
        handleChatRenamePersist,
        openChatById,
        onDataChanged,
        getContext,
        loadPopupModule,
        getSortableDelay,
    });

    // Initial build (no side effects on data)
    renderCategoryManagerPage();

    return {
        render,
        openAssignModal,
        mountInGenericPopup,
        getCategoriesPageEl,
        renderCategoryManagerPage,
    };
}

/**
 * Recents and favorites persisted in localStorage.
 * Stores only stable ids and display names (never file or prompt contents).
 * Keys: sageutils_<kind>_recents and sageutils_<kind>_favorites.
 */

const MAX_RECENTS = 20;
const MAX_FAVORITES = 200;

function readList(key) {
    try {
        const parsed = JSON.parse(localStorage.getItem(key) || '[]');
        return Array.isArray(parsed)
            ? parsed.filter((entry) => entry && typeof entry.id === 'string')
            : [];
    } catch {
        return [];
    }
}

function writeList(key, list) {
    try {
        localStorage.setItem(key, JSON.stringify(list));
        return true;
    } catch (error) {
        console.warn(`[Recents] Could not save ${key}:`, error);
        return false;
    }
}

const collections = new Map();

/**
 * Get the recents/favorites collection for one kind of item (e.g. "model").
 * Entries are { id, name, ts }, most recent first.
 * @param {string} kind
 * @returns {Object}
 */
export function getCollection(kind) {
    if (collections.has(kind)) return collections.get(kind);

    const recentsKey = `sageutils_${kind}_recents`;
    const favoritesKey = `sageutils_${kind}_favorites`;
    const listeners = new Set();
    const notify = () => listeners.forEach((cb) => {
        try { cb(); } catch (error) { console.error('[Recents] listener failed:', error); }
    });

    const collection = {
        getRecents: () => readList(recentsKey),
        getFavorites: () => readList(favoritesKey),
        isFavorite: (id) => readList(favoritesKey).some((entry) => entry.id === id),

        addRecent(id, name = '') {
            if (!id) return;
            const list = readList(recentsKey).filter((entry) => entry.id !== id);
            list.unshift({ id, name, ts: Date.now() });
            writeList(recentsKey, list.slice(0, MAX_RECENTS));
            notify();
        },

        /** @returns {boolean} New favorite state */
        toggleFavorite(id, name = '') {
            if (!id) return false;
            const list = readList(favoritesKey);
            const index = list.findIndex((entry) => entry.id === id);
            if (index !== -1) {
                list.splice(index, 1);
                writeList(favoritesKey, list);
                notify();
                return false;
            }
            if (list.length >= MAX_FAVORITES) return false;
            list.unshift({ id, name, ts: Date.now() });
            writeList(favoritesKey, list);
            notify();
            return true;
        },

        clearRecents() {
            writeList(recentsKey, []);
            notify();
        },

        /** @returns {Function} unsubscribe */
        subscribe(callback) {
            listeners.add(callback);
            return () => listeners.delete(callback);
        }
    };

    collections.set(kind, collection);
    return collection;
}

export const LIMITS = { MAX_RECENTS, MAX_FAVORITES };

const EXTENSIONS_ENDPOINT = '/extensions';
const EXTENSION_ENTRY_SUFFIX = '/utils/htmlTemplateLoader.js';

let extensionBasePathPromise;

export function getExtensionBasePath() {
    if (!extensionBasePathPromise) {
        extensionBasePathPromise = fetch(EXTENSIONS_ENDPOINT, {
            cache: 'no-store',
            credentials: 'same-origin'
        }).then(async (response) => {
            if (!response.ok) {
                throw new Error(`Unable to load extension list (status ${response.status})`);
            }

            const paths = await response.json();
            const entry = paths.find((path) => {
                return typeof path === 'string'
                    && path.startsWith('/extensions/')
                    && path.endsWith(EXTENSION_ENTRY_SUFFIX);
            });

            if (!entry) {
                throw new Error('SageUtils was not found in the ComfyUI extension list');
            }

            return entry.slice(0, -EXTENSION_ENTRY_SUFFIX.length);
        }).catch((error) => {
            extensionBasePathPromise = null;
            throw error;
        });
    }

    return extensionBasePathPromise;
}

export async function resolveExtensionAssetPath(path) {
    const relativePath = path.replace(/^\/?extensions\/[^/]+\//, '');
    const basePath = await getExtensionBasePath();
    return `${basePath}/${relativePath}`;
}
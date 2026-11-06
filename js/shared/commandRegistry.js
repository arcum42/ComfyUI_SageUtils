/**
 * Registry of command palette commands contributed by mounted tabs.
 * A provider is a function returning [{ id, label, hint?, tab?, run }].
 * Providers are evaluated each time the palette opens, so lists stay current.
 * When a command has a tab id, the palette switches to that tab before running it.
 */

const providers = new Set();

/**
 * @param {Function} provider
 * @returns {Function} unregister function (call from the tab's destroy)
 */
export function registerCommandProvider(provider) {
    providers.add(provider);
    return () => providers.delete(provider);
}

export function collectCommands() {
    const commands = [];
    providers.forEach((provider) => {
        try {
            const result = provider();
            if (Array.isArray(result)) commands.push(...result);
        } catch (error) {
            console.error('[CommandRegistry] provider failed:', error);
        }
    });
    return commands;
}

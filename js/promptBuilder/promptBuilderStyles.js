import { loadSidebarStyle } from '../sidebar/sidebarStyles.js';

export function ensurePromptBuilderStyles() {
    loadSidebarStyle('sage-prompt-builder-styles', 'promptBuilder/promptBuilder.css');
}

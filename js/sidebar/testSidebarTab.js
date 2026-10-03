// testSidebarTab.js - Test tab to demonstrate loading external CSS

import { loadSidebarStyle } from './sidebarStyles.js';

export function createTestSidebarTab(container) {
    // Remove previous content
    container.innerHTML = '';

    // Add a test div with a unique id for CSS targeting
    const testDiv = document.createElement('div');
    testDiv.id = 'civitai-search-tab-test-css';
    testDiv.textContent = 'If you see a yellow background and bold red text, the external CSS loaded successfully!';
    container.appendChild(testDiv);

    loadSidebarStyle('test-sidebar-css', 'sidebar/testSidebar.css');
}

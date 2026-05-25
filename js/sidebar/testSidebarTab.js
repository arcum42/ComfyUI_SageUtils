// testSidebarTab.js - Test tab to demonstrate loading external CSS

export function createTestSidebarTab(container) {
    // Remove previous content
    container.innerHTML = '';

    // Add a test div with a unique id for CSS targeting
    const testDiv = document.createElement('div');
    testDiv.id = 'civitai-search-tab-test-css';
    testDiv.textContent = 'If you see a yellow background and bold red text, the external CSS loaded successfully!';
    container.appendChild(testDiv);

    // Dynamically load the CSS file if not already loaded
    if (!document.getElementById('test-sidebar-css')) {
        const link = document.createElement('link');
        link.id = 'test-sidebar-css';
        link.rel = 'stylesheet';
        link.type = 'text/css';
        // Path per ComfyUI docs: extensions/custom_node_subfolder/the_file.css
        link.href = 'extensions/comfyui_sageutils/sidebar/testSidebar.css';
        document.head.appendChild(link);
    }
}

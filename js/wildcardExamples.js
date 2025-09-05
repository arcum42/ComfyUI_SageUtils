/**
 * Wildcard API Usage Examples
 * 
 * This file demonstrates how to use the wildcard API in your JavaScript code.
 */

import { 
    getWildcardPath, 
    listWildcardFiles, 
    generateWildcardPrompt, 
    getWildcardFileContent,
    WildcardManager,
    wildcardManager 
} from './shared/wildcardApi.js';

import { createWildcardTester } from './components/wildcardTester.js';

/**
 * Example 1: Basic wildcard generation
 */
async function basicExample() {
    console.log('=== Basic Wildcard Generation Example ===');
    
    const prompt = 'A __animal__ wearing __clothing__ in a __location__';
    const seed = 42;
    
    const result = await generateWildcardPrompt(prompt, seed);
    
    if (result.success) {
        console.log('Original prompt:', result.original_prompt);
        console.log('Generated result:', result.result);
        console.log('Seed used:', result.seed);
    } else {
        console.error('Generation failed:', result.error);
    }
}

/**
 * Example 2: Using the WildcardManager class
 */
async function wildcardManagerExample() {
    console.log('=== WildcardManager Example ===');
    
    const manager = new WildcardManager();
    
    // Initialize the manager
    const initialized = await manager.initialize();
    if (!initialized) {
        console.error('Failed to initialize wildcard manager');
        return;
    }
    
    console.log('Wildcard path:', manager.getPath());
    console.log('Available files:', manager.getFiles().length);
    
    // List first few files
    const files = manager.getFiles();
    console.log('First few files:', files.slice(0, 5).map(f => f.name));
    
    // Generate with wildcards
    const prompt = 'A beautiful __animal__ in a magical __location__';
    const result = await manager.generate(prompt, 123);
    console.log('Generated prompt:', result);
    
    // Extract wildcards from a prompt
    const wildcards = manager.extractWildcards(prompt);
    console.log('Detected wildcards:', wildcards);
    
    // Check wildcard availability
    const availability = manager.checkWildcardAvailability(wildcards);
    console.log('Wildcard availability:', availability);
}

/**
 * Example 3: Reading wildcard file contents
 */
async function fileContentExample() {
    console.log('=== File Content Example ===');
    
    // List available files first
    const filesResult = await listWildcardFiles();
    if (!filesResult.success) {
        console.error('Failed to list files:', filesResult.error);
        return;
    }
    
    const files = filesResult.files;
    if (files.length === 0) {
        console.log('No wildcard files found');
        return;
    }
    
    // Read the first file as an example
    const firstFile = files[0];
    console.log('Reading file:', firstFile.name);
    
    const contentResult = await getWildcardFileContent(firstFile.name);
    if (contentResult.success) {
        console.log('File size:', contentResult.size, 'bytes');
        console.log('Content preview:', contentResult.content.substring(0, 200) + '...');
        
        // Show lines in the file
        const lines = contentResult.content.split('\n').filter(line => line.trim());
        console.log('Number of lines:', lines.length);
        console.log('First few lines:', lines.slice(0, 5));
    } else {
        console.error('Failed to read file:', contentResult.error);
    }
}

/**
 * Example 4: Creating a wildcard tester UI
 */
function createTesterExample() {
    console.log('=== Wildcard Tester UI Example ===');
    
    // This would typically be called when setting up your UI
    const container = document.createElement('div');
    container.style.cssText = `
        position: fixed;
        top: 50px;
        right: 50px;
        width: 400px;
        z-index: 9999;
        background: #1a1a1a;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    `;
    
    const tester = createWildcardTester(container);
    
    // Set a custom prompt
    tester.setPrompt('A __character__ riding a __vehicle__ through __weather__');
    tester.setSeed(42);
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: #666;
        border: none;
        color: white;
        width: 25px;
        height: 25px;
        border-radius: 50%;
        cursor: pointer;
    `;
    closeBtn.addEventListener('click', () => document.body.removeChild(container));
    container.appendChild(closeBtn);
    
    document.body.appendChild(container);
    
    console.log('Wildcard tester UI created! Check the top-right corner of your screen.');
}

/**
 * Example 5: Integration with existing text processing
 */
async function textProcessingIntegration() {
    console.log('=== Text Processing Integration Example ===');
    
    // Simulate processing text that might contain wildcards
    const userInput = 'Create an image of __artist_style__ artwork featuring __subject__ in __setting__';
    
    // Check if the text contains wildcards
    const wildcardPattern = /__[^_]+__/g;
    const hasWildcards = wildcardPattern.test(userInput);
    
    if (hasWildcards) {
        console.log('Text contains wildcards, processing...');
        
        // Extract wildcards
        const manager = new WildcardManager();
        await manager.initialize();
        const wildcards = manager.extractWildcards(userInput);
        
        console.log('Found wildcards:', wildcards);
        
        // Check availability
        const availability = manager.checkWildcardAvailability(wildcards);
        const unavailable = Object.entries(availability)
            .filter(([_, info]) => !info.available)
            .map(([name, _]) => name);
        
        if (unavailable.length > 0) {
            console.warn('Unavailable wildcards:', unavailable);
        }
        
        // Generate the final text
        const result = await manager.generate(userInput, Math.floor(Math.random() * 1000));
        console.log('Final processed text:', result);
    } else {
        console.log('No wildcards found, using text as-is:', userInput);
    }
}

// Export examples for use
export {
    basicExample,
    wildcardManagerExample,
    fileContentExample,
    createTesterExample,
    textProcessingIntegration
};

// You can run these examples in the browser console:
// 
// import('./js/wildcardExamples.js').then(examples => {
//     examples.basicExample();
//     examples.wildcardManagerExample();
//     examples.fileContentExample();
//     examples.createTesterExample();
//     examples.textProcessingIntegration();
// });

console.log('Wildcard examples loaded! Available functions:', {
    basicExample,
    wildcardManagerExample,
    fileContentExample,
    createTesterExample,
    textProcessingIntegration
});

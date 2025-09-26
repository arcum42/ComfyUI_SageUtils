/**
 * Wildcard Tester Component
 * A simple UI component to test wildcard functionality
 */

import { wildcardManager, generateWildcardPrompt } from '../shared/api/wildcardApi.js';

/**
 * Creates a wildcard tester interface
 * @param {HTMLElement} container - Container element to append the tester to
 */
export function createWildcardTester(container) {
    const testerDiv = document.createElement('div');
    testerDiv.style.cssText = `
        background: #2a2a2a;
        border: 1px solid #444;
        border-radius: 6px;
        padding: 15px;
        margin: 10px 0;
    `;

    const title = document.createElement('h3');
    title.textContent = '🎲 Wildcard Tester';
    title.style.cssText = `
        color: #e0e0e0;
        margin: 0 0 15px 0;
        font-size: 16px;
    `;

    const promptInput = document.createElement('textarea');
    promptInput.placeholder = 'Enter prompt with wildcards, e.g.: A __animal__ in a __location__ wearing __clothing__';
    promptInput.style.cssText = `
        width: 100%;
        height: 80px;
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        color: #e0e0e0;
        padding: 8px;
        font-family: monospace;
        font-size: 13px;
        resize: vertical;
        box-sizing: border-box;
    `;

    const controlsDiv = document.createElement('div');
    controlsDiv.style.cssText = `
        display: flex;
        gap: 10px;
        margin: 10px 0;
        align-items: center;
    `;

    const seedInput = document.createElement('input');
    seedInput.type = 'number';
    seedInput.value = '0';
    seedInput.min = '0';
    seedInput.max = '999999';
    seedInput.style.cssText = `
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        color: #e0e0e0;
        padding: 6px 8px;
        width: 80px;
        font-size: 13px;
    `;

    const generateBtn = document.createElement('button');
    generateBtn.textContent = 'Generate';
    generateBtn.style.cssText = `
        background: #4CAF50;
        border: none;
        border-radius: 4px;
        color: white;
        padding: 6px 15px;
        cursor: pointer;
        font-size: 13px;
    `;

    const randomSeedBtn = document.createElement('button');
    randomSeedBtn.textContent = '🎲';
    randomSeedBtn.title = 'Random Seed';
    randomSeedBtn.style.cssText = `
        background: #666;
        border: none;
        border-radius: 4px;
        color: white;
        padding: 6px 10px;
        cursor: pointer;
        font-size: 13px;
    `;

    const statusDiv = document.createElement('div');
    statusDiv.style.cssText = `
        color: #888;
        font-size: 12px;
        margin-left: auto;
    `;

    controlsDiv.appendChild(document.createTextNode('Seed: '));
    controlsDiv.appendChild(seedInput);
    controlsDiv.appendChild(randomSeedBtn);
    controlsDiv.appendChild(generateBtn);
    controlsDiv.appendChild(statusDiv);

    const resultDiv = document.createElement('div');
    resultDiv.style.cssText = `
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 10px;
        min-height: 60px;
        color: #e0e0e0;
        font-family: monospace;
        font-size: 13px;
        white-space: pre-wrap;
        margin-top: 10px;
    `;
    resultDiv.textContent = 'Generated result will appear here...';

    const infoDiv = document.createElement('div');
    infoDiv.style.cssText = `
        background: #1a1a1a;
        border-radius: 4px;
        padding: 8px;
        margin-top: 10px;
        font-size: 12px;
        color: #888;
    `;

    // Initialize wildcard manager
    let initialized = false;
    async function ensureInitialized() {
        if (!initialized) {
            statusDiv.textContent = 'Initializing...';
            const success = await wildcardManager.initialize();
            if (success) {
                initialized = true;
                const files = wildcardManager.getFiles();
                statusDiv.textContent = `${files.length} wildcard files available`;
                
                // Show some basic info
                infoDiv.innerHTML = `
                    <div><strong>Wildcard Path:</strong> ${wildcardManager.getPath() || 'Unknown'}</div>
                    <div><strong>Available Files:</strong> ${files.length}</div>
                    <div><strong>Examples:</strong> ${files.slice(0, 5).map(f => `__${f.name.replace('.txt', '')}__`).join(', ')}${files.length > 5 ? '...' : ''}</div>
                `;
            } else {
                statusDiv.textContent = 'Failed to initialize';
                statusDiv.style.color = '#f44336';
                infoDiv.innerHTML = '<div style="color: #f44336;">Failed to initialize wildcard system. Check console for details.</div>';
            }
        }
    }

    // Generate function
    async function generate() {
        const prompt = promptInput.value.trim();
        const seed = parseInt(seedInput.value) || 0;
        
        if (!prompt) {
            resultDiv.textContent = 'Please enter a prompt with wildcards';
            resultDiv.style.color = '#f44336';
            return;
        }

        await ensureInitialized();
        
        if (!initialized) {
            resultDiv.textContent = 'Wildcard system not initialized';
            resultDiv.style.color = '#f44336';
            return;
        }

        statusDiv.textContent = 'Generating...';
        resultDiv.style.color = '#e0e0e0';
        resultDiv.textContent = 'Generating...';

        try {
            const result = await generateWildcardPrompt(prompt, seed);
            
            if (result.success) {
                resultDiv.textContent = result.result;
                resultDiv.style.color = '#e0e0e0';
                statusDiv.textContent = 'Generated successfully';
                statusDiv.style.color = '#4CAF50';
                
                // Analyze wildcards in the prompt
                const wildcards = wildcardManager.extractWildcards(prompt);
                if (wildcards.length > 0) {
                    const availability = wildcardManager.checkWildcardAvailability(wildcards);
                    const availabilityInfo = Object.entries(availability).map(([name, info]) => {
                        const status = info.available ? '✅' : '❌';
                        return `${status} __${name}__`;
                    }).join(' ');
                    
                    infoDiv.innerHTML += `<div><strong>Wildcards Used:</strong> ${availabilityInfo}</div>`;
                }
            } else {
                resultDiv.textContent = `Error: ${result.error}`;
                resultDiv.style.color = '#f44336';
                statusDiv.textContent = 'Generation failed';
                statusDiv.style.color = '#f44336';
            }
        } catch (error) {
            resultDiv.textContent = `Error: ${error.message}`;
            resultDiv.style.color = '#f44336';
            statusDiv.textContent = 'Generation failed';
            statusDiv.style.color = '#f44336';
            console.error('Wildcard generation error:', error);
        }
    }

    // Event listeners
    generateBtn.addEventListener('click', generate);
    
    randomSeedBtn.addEventListener('click', () => {
        seedInput.value = Math.floor(Math.random() * 999999).toString();
    });

    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            generate();
        }
    });

    // Set a default example
    promptInput.value = 'A __animal__ in a __location__';

    // Assemble component
    testerDiv.appendChild(title);
    testerDiv.appendChild(promptInput);
    testerDiv.appendChild(controlsDiv);
    testerDiv.appendChild(resultDiv);
    testerDiv.appendChild(infoDiv);
    
    container.appendChild(testerDiv);

    // Initialize on first load
    setTimeout(ensureInitialized, 100);

    return {
        element: testerDiv,
        generate,
        setPrompt: (prompt) => { promptInput.value = prompt; },
        setSeed: (seed) => { seedInput.value = seed.toString(); },
        getPrompt: () => promptInput.value,
        getSeed: () => parseInt(seedInput.value) || 0
    };
}

export default createWildcardTester;

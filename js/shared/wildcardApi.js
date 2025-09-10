/**
 * Wildcard API Module
 * Provides JavaScript interface to the wildcard system functionality
 */

import { api } from "../../../scripts/api.js";

/**
 * Gets the wildcard directory path
 * @returns {Promise<{success: boolean, path?: string, error?: string}>}
 */
export async function getWildcardPath() {
    try {
        const response = await api.fetchApi('/sage_utils/wildcard_path');
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error getting wildcard path:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Lists all wildcard files in the wildcard directory
 * @returns {Promise<{success: boolean, files?: Array, total_files?: number, error?: string}>}
 */
export async function listWildcardFiles() {
    try {
        const response = await api.fetchApi('/sage_utils/wildcard_files');
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error listing wildcard files:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Generates a prompt using the wildcard system
 * @param {string} prompt - The prompt text containing wildcards (e.g., "__animal__ in a __location__")
 * @param {number} seed - The random seed for consistent generation
 * @returns {Promise<{success: boolean, result?: string, original_prompt?: string, seed?: number, error?: string}>}
 */
export async function generateWildcardPrompt(prompt, seed = 0) {
    try {
        const response = await api.fetchApi('/sage_utils/generate_wildcard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: prompt,
                seed: seed
            })
        });
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error generating wildcard prompt:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Gets the content of a specific wildcard file
 * @param {string} filename - The filename relative to the wildcard directory (e.g., "animals.txt" or "subfolder/colors.txt")
 * @returns {Promise<{success: boolean, content?: string, filename?: string, size?: number, error?: string}>}
 */
export async function getWildcardFileContent(filename) {
    try {
        // Encode filename to handle special characters and paths
        const encodedFilename = encodeURIComponent(filename);
        const response = await api.fetchApi(`/sage_utils/wildcard_file/${encodedFilename}`);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error getting wildcard file content:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Utility class for working with wildcards in the browser
 */
export class WildcardManager {
    constructor() {
        this.wildcardPath = null;
        this.files = [];
        this.fileContents = new Map();
    }

    /**
     * Initialize the wildcard manager by loading path and file list
     * @returns {Promise<boolean>} - Returns true if initialization was successful
     */
    async initialize() {
        try {
            // Get wildcard path
            const pathResult = await getWildcardPath();
            if (pathResult.success) {
                this.wildcardPath = pathResult.path;
            } else {
                console.warn('Failed to get wildcard path:', pathResult.error);
                return false;
            }

            // Get file list
            const filesResult = await listWildcardFiles();
            if (filesResult.success) {
                this.files = filesResult.files || [];
            } else {
                console.warn('Failed to get wildcard files:', filesResult.error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error initializing WildcardManager:', error);
            return false;
        }
    }

    /**
     * Gets the wildcard directory path
     * @returns {string|null}
     */
    getPath() {
        return this.wildcardPath;
    }

    /**
     * Gets the list of available wildcard files
     * @returns {Array}
     */
    getFiles() {
        return this.files;
    }

    /**
     * Gets the content of a wildcard file, caching it for future use
     * @param {string} filename - The filename to get content for
     * @param {boolean} useCache - Whether to use cached content (default: true)
     * @returns {Promise<string|null>} - The file content or null if failed
     */
    async getFileContent(filename, useCache = true) {
        // Check cache first
        if (useCache && this.fileContents.has(filename)) {
            return this.fileContents.get(filename);
        }

        const result = await getWildcardFileContent(filename);
        if (result.success) {
            // Cache the content
            this.fileContents.set(filename, result.content);
            return result.content;
        } else {
            console.error(`Failed to get content for ${filename}:`, result.error);
            return null;
        }
    }

    /**
     * Generates a prompt using wildcards
     * @param {string} prompt - The prompt containing wildcard placeholders
     * @param {number} seed - The random seed
     * @returns {Promise<string|null>} - The generated prompt or null if failed
     */
    async generate(prompt, seed = 0) {
        const result = await generateWildcardPrompt(prompt, seed);
        if (result.success) {
            return result.result;
        } else {
            console.error('Failed to generate wildcard prompt:', result.error);
            return null;
        }
    }

    /**
     * Extracts wildcard names from a prompt string
     * @param {string} prompt - The prompt to analyze
     * @returns {Array<string>} - Array of wildcard names found in the prompt
     */
    extractWildcards(prompt) {
        const wildcardPattern = /__([^_]+)__/g;
        const wildcards = [];
        let match;
        
        while ((match = wildcardPattern.exec(prompt)) !== null) {
            const wildcardName = match[1];
            if (!wildcards.includes(wildcardName)) {
                wildcards.push(wildcardName);
            }
        }
        
        return wildcards;
    }

    /**
     * Checks if specific wildcard files exist
     * @param {Array<string>} wildcardNames - Array of wildcard names to check
     * @returns {Object} - Object mapping wildcard names to their availability
     */
    checkWildcardAvailability(wildcardNames) {
        const availability = {};
        
        for (const wildcardName of wildcardNames) {
            // Check for exact match or with .txt extension
            const exactMatch = this.files.some(f => f.name === wildcardName);
            const txtMatch = this.files.some(f => f.name === `${wildcardName}.txt`);
            const folderMatch = this.files.some(f => f.name.startsWith(`${wildcardName}/`));
            
            availability[wildcardName] = {
                available: exactMatch || txtMatch || folderMatch,
                exactMatch,
                txtMatch,
                folderMatch,
                files: this.files.filter(f => 
                    f.name === wildcardName || 
                    f.name === `${wildcardName}.txt` || 
                    f.name.startsWith(`${wildcardName}/`)
                )
            };
        }
        
        return availability;
    }

    /**
     * Clears the content cache
     */
    clearCache() {
        this.fileContents.clear();
    }

    /**
     * Refreshes the file list
     * @returns {Promise<boolean>}
     */
    async refresh() {
        const filesResult = await listWildcardFiles();
        if (filesResult.success) {
            this.files = filesResult.files || [];
            this.clearCache(); // Clear cache as files may have changed
            return true;
        } else {
            console.warn('Failed to refresh wildcard files:', filesResult.error);
            return false;
        }
    }
}

// Export a default instance for convenience
export const wildcardManager = new WildcardManager();

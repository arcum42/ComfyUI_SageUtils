/**
 * Prompt Builder API Module
 * Handles communication with the server for prompt builder functionality
 */

import { api } from "../../../../scripts/api.js";
import { generateWildcardPrompt } from "../shared/api/wildcardApi.js";

/**
 * Prompt Builder API class for managing server communication
 */
export class PromptBuilderApi {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Generate a prompt using the wildcard system
     * @param {string} prompt - The prompt text containing wildcards
     * @param {number} seed - The random seed for generation
     * @returns {Promise<{success: boolean, result?: string, error?: string}>}
     */
    async generatePrompt(prompt, seed = 0) {
        try {
            console.debug('Generating prompt:', { prompt, seed });
            
            // Use the existing wildcard API
            const result = await generateWildcardPrompt(prompt, seed);
            
            if (result.success) {
                console.debug('Prompt generated successfully:', result.result);
                return {
                    success: true,
                    result: result.result,
                    originalPrompt: result.original_prompt,
                    seed: result.seed
                };
            } else {
                console.error('Failed to generate prompt:', result.error);
                return {
                    success: false,
                    error: result.error || 'Unknown error occurred'
                };
            }
        } catch (error) {
            console.error('Error in generatePrompt:', error);
            return {
                success: false,
                error: error.message || 'Network error occurred'
            };
        }
    }

    /**
     * Generate multiple prompts with incremented seeds
     * @param {string} positivePrompt - The positive prompt text
     * @param {string} negativePrompt - The negative prompt text
     * @param {number} baseSeed - The base seed for generation
     * @param {number} count - Number of prompts to generate
     * @returns {Promise<Array>} - Array of generated prompt objects
     */
    async generateMultiplePrompts(positivePrompt, negativePrompt, baseSeed, count) {
        const results = [];
        
        try {
            for (let i = 0; i < count; i++) {
                const currentSeed = baseSeed + i;
                
                // Generate positive prompt
                const positiveResult = positivePrompt.trim() 
                    ? await this.generatePrompt(positivePrompt, currentSeed)
                    : { success: true, result: '', seed: currentSeed };

                // Generate negative prompt
                const negativeResult = negativePrompt.trim()
                    ? await this.generatePrompt(negativePrompt, currentSeed)
                    : { success: true, result: '', seed: currentSeed };

                if (positiveResult.success && negativeResult.success) {
                    results.push({
                        id: `prompt_${Date.now()}_${i}`,
                        seed: currentSeed,
                        positive: positiveResult.result || '',
                        negative: negativeResult.result || '',
                        originalPositive: positivePrompt,
                        originalNegative: negativePrompt,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    // Log error but continue with other prompts
                    console.error(`Failed to generate prompt ${i + 1}:`, {
                        positive: positiveResult.error,
                        negative: negativeResult.error
                    });
                    
                    results.push({
                        id: `prompt_${Date.now()}_${i}`,
                        seed: currentSeed,
                        positive: positiveResult.result || '',
                        negative: negativeResult.result || '',
                        originalPositive: positivePrompt,
                        originalNegative: negativePrompt,
                        timestamp: new Date().toISOString(),
                        error: positiveResult.error || negativeResult.error
                    });
                }
            }
        } catch (error) {
            console.error('Error in generateMultiplePrompts:', error);
            throw error;
        }

        return results;
    }

    /**
     * Generate a random seed
     * @returns {number} - Random seed value
     */
    generateRandomSeed() {
        return Math.floor(Math.random() * 2147483647);
    }

    /**
     * Validate a prompt for wildcard syntax
     * @param {string} prompt - The prompt to validate
     * @returns {Object} - Validation result with wildcards found
     */
    validatePrompt(prompt) {
        if (!prompt || typeof prompt !== 'string') {
            return {
                isValid: true,
                wildcards: [],
                hasWildcards: false
            };
        }

        // Extract wildcard patterns
        const wildcardPattern = /__([^_]+)__/g;
        const wildcards = [];
        let match;

        while ((match = wildcardPattern.exec(prompt)) !== null) {
            const wildcardName = match[1];
            if (!wildcards.includes(wildcardName)) {
                wildcards.push(wildcardName);
            }
        }

        return {
            isValid: true,
            wildcards,
            hasWildcards: wildcards.length > 0,
            wildcardCount: wildcards.length
        };
    }

    /**
     * Format prompt for display
     * @param {string} prompt - The prompt to format
     * @param {number} maxLength - Maximum length before truncation
     * @returns {string} - Formatted prompt
     */
    formatPromptPreview(prompt, maxLength = 100) {
        if (!prompt) return '';
        
        if (prompt.length <= maxLength) {
            return prompt;
        }

        return prompt.substring(0, maxLength - 3) + '...';
    }

    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<boolean>} - Success status
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.select();
                const success = document.execCommand('copy');
                document.body.removeChild(textArea);
                return success;
            }
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            return false;
        }
    }

    /**
     * Clear API cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} - Cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            timeout: this.cacheTimeout
        };
    }
}

// Export singleton instance
export const promptBuilderApi = new PromptBuilderApi();

// Export individual functions for convenience
export const {
    generatePrompt,
    generateMultiplePrompts,
    generateRandomSeed,
    validatePrompt,
    formatPromptPreview,
    copyToClipboard
} = promptBuilderApi;

export default promptBuilderApi;

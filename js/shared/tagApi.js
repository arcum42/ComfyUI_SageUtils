/**
 * Tag Management API Module
 * Handles communication with the server for tag library functionality
 */

import { api } from "../../../scripts/api.js";

/**
 * Tag API class for managing tag library operations
 */
export class TagApi {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Get the complete tag library
     * @param {boolean} useCache - Whether to use cached data (default: true)
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    async getTagLibrary(useCache = true) {
        try {
            const cacheKey = 'tag_library';
            
            // Check cache first
            if (useCache && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return { success: true, data: cached.data };
                }
            }

            const response = await api.fetchApi('/sage_utils/tags/library');
            const result = await response.json();
            
            // Handle the response format - check if data is nested
            if (result.success && result.data) {
                // Cache the result
                this.cache.set(cacheKey, {
                    data: result.data,
                    timestamp: Date.now()
                });
                
                return {
                    success: true,
                    data: result.data
                };
            }
            
            return result;
        } catch (error) {
            console.error('Error getting tag library:', error);
            return {
                success: false,
                error: error.message || 'Network error occurred'
            };
        }
    }

    /**
     * Save the complete tag library
     * @param {Object} libraryData - The complete library data
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    async saveTagLibrary(libraryData) {
        try {
            const response = await api.fetchApi('/sage_utils/tags/library', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(libraryData)
            });
            
            const result = await response.json();
            
            // Clear cache on successful save
            if (result.success) {
                this.clearCache();
            }
            
            // Handle the response format - check if data is nested
            if (result.success && result.data) {
                return {
                    success: true,
                    data: result.data,
                    message: result.message
                };
            }
            
            return result;
        } catch (error) {
            console.error('Error saving tag library:', error);
            return {
                success: false,
                error: error.message || 'Network error occurred'
            };
        }
    }

    /**
     * Save or update a category
     * @param {Object} categoryData - The category data
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    async saveCategory(categoryData) {
        try {
            const response = await api.fetchApi('/sage_utils/tags/category', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(categoryData)
            });
            
            const result = await response.json();
            
            // Clear cache on successful save
            if (result.success) {
                this.clearCache();
            }
            
            // Handle the response format - check if data is nested
            if (result.success && result.data) {
                return {
                    success: true,
                    data: result.data,
                    message: result.message
                };
            }
            
            return result;
        } catch (error) {
            console.error('Error saving category:', error);
            return {
                success: false,
                error: error.message || 'Network error occurred'
            };
        }
    }

    /**
     * Delete a category
     * @param {string} categoryId - The category ID to delete
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    async deleteCategory(categoryId) {
        try {
            const response = await api.fetchApi(`/sage_utils/tags/category/${encodeURIComponent(categoryId)}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            // Clear cache on successful delete
            if (result.success) {
                this.clearCache();
            }
            
            return result;
        } catch (error) {
            console.error('Error deleting category:', error);
            return {
                success: false,
                error: error.message || 'Network error occurred'
            };
        }
    }

    /**
     * Search for tags across categories
     * @param {string} query - Search query
     * @param {string} categoryId - Optional category ID to limit search
     * @param {number} limit - Optional limit (default: 50)
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    async searchTags(query, categoryId = '', limit = 50) {
        try {
            const params = new URLSearchParams({
                q: query,
                limit: limit.toString()
            });
            
            if (categoryId) {
                params.append('category', categoryId);
            }
            
            const response = await api.fetchApi(`/sage_utils/tags/search?${params}`);
            const result = await response.json();
            
            // Handle the response format - check if data is nested
            if (result.success && result.data) {
                return {
                    success: true,
                    data: result.data
                };
            }
            
            return result;
        } catch (error) {
            console.error('Error searching tags:', error);
            return {
                success: false,
                error: error.message || 'Network error occurred'
            };
        }
    }

    /**
     * Add a tag to a category
     * @param {string} categoryId - Category ID
     * @param {string} tag - Tag to add
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    async addTagToCategory(categoryId, tag) {
        try {
            // First get the current library
            const libraryResult = await this.getTagLibrary(false); // Don't use cache
            if (!libraryResult.success) {
                return libraryResult;
            }
            
            const library = libraryResult.data;
            const category = library.categories.find(c => c.id === categoryId);
            
            if (!category) {
                return {
                    success: false,
                    error: `Category '${categoryId}' not found`
                };
            }
            
            // Add tag if it doesn't exist
            if (!category.tags.includes(tag)) {
                category.tags.push(tag);
                category.tags.sort(); // Keep tags sorted
                
                // Save the updated category
                return await this.saveCategory(category);
            }
            
            return {
                success: true,
                message: `Tag '${tag}' already exists in category '${category.name}'`
            };
        } catch (error) {
            console.error('Error adding tag to category:', error);
            return {
                success: false,
                error: error.message || 'Network error occurred'
            };
        }
    }

    /**
     * Remove a tag from a category
     * @param {string} categoryId - Category ID
     * @param {string} tag - Tag to remove
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    async removeTagFromCategory(categoryId, tag) {
        try {
            // First get the current library
            const libraryResult = await this.getTagLibrary(false); // Don't use cache
            if (!libraryResult.success) {
                return libraryResult;
            }
            
            const library = libraryResult.data;
            const category = library.categories.find(c => c.id === categoryId);
            
            if (!category) {
                return {
                    success: false,
                    error: `Category '${categoryId}' not found`
                };
            }
            
            // Remove tag if it exists
            const tagIndex = category.tags.indexOf(tag);
            if (tagIndex > -1) {
                category.tags.splice(tagIndex, 1);
                
                // Save the updated category
                return await this.saveCategory(category);
            }
            
            return {
                success: false,
                error: `Tag '${tag}' not found in category '${category.name}'`
            };
        } catch (error) {
            console.error('Error removing tag from category:', error);
            return {
                success: false,
                error: error.message || 'Network error occurred'
            };
        }
    }

    /**
     * Add a tag set to a category
     * @param {string} categoryId - Category ID
     * @param {Object} tagSet - Tag set object {id, name, description, tags}
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    async addTagSetToCategory(categoryId, tagSet) {
        try {
            // First get the current library
            const libraryResult = await this.getTagLibrary(false); // Don't use cache
            if (!libraryResult.success) {
                return libraryResult;
            }
            
            const library = libraryResult.data;
            const category = library.categories.find(c => c.id === categoryId);
            
            if (!category) {
                return {
                    success: false,
                    error: `Category '${categoryId}' not found`
                };
            }
            
            // Check if set ID already exists
            const existingSet = category.sets.find(s => s.id === tagSet.id);
            if (existingSet) {
                return {
                    success: false,
                    error: `Tag set with ID '${tagSet.id}' already exists`
                };
            }
            
            // Add the tag set
            category.sets.push(tagSet);
            
            // Save the updated category
            return await this.saveCategory(category);
        } catch (error) {
            console.error('Error adding tag set to category:', error);
            return {
                success: false,
                error: error.message || 'Network error occurred'
            };
        }
    }

    /**
     * Remove a tag set from a category
     * @param {string} categoryId - Category ID
     * @param {string} setId - Tag set ID to remove
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    async removeTagSetFromCategory(categoryId, setId) {
        try {
            // First get the current library
            const libraryResult = await this.getTagLibrary(false); // Don't use cache
            if (!libraryResult.success) {
                return libraryResult;
            }
            
            const library = libraryResult.data;
            const category = library.categories.find(c => c.id === categoryId);
            
            if (!category) {
                return {
                    success: false,
                    error: `Category '${categoryId}' not found`
                };
            }
            
            // Find and remove the tag set
            const setIndex = category.sets.findIndex(s => s.id === setId);
            if (setIndex > -1) {
                const removedSet = category.sets.splice(setIndex, 1)[0];
                
                // Save the updated category
                const result = await this.saveCategory(category);
                if (result.success) {
                    result.message = `Tag set '${removedSet.name}' removed successfully`;
                }
                return result;
            }
            
            return {
                success: false,
                error: `Tag set '${setId}' not found in category '${category.name}'`
            };
        } catch (error) {
            console.error('Error removing tag set from category:', error);
            return {
                success: false,
                error: error.message || 'Network error occurred'
            };
        }
    }

    /**
     * Get tags by category
     * @param {string} categoryId - Category ID
     * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
     */
    async getTagsByCategory(categoryId) {
        try {
            const libraryResult = await this.getTagLibrary();
            if (!libraryResult.success) {
                return libraryResult;
            }
            
            const category = libraryResult.data.categories.find(c => c.id === categoryId);
            if (!category) {
                return {
                    success: false,
                    error: `Category '${categoryId}' not found`
                };
            }
            
            return {
                success: true,
                data: {
                    category: category,
                    tags: category.tags || [],
                    sets: category.sets || []
                }
            };
        } catch (error) {
            console.error('Error getting tags by category:', error);
            return {
                success: false,
                error: error.message || 'Network error occurred'
            };
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

    /**
     * Generate a unique ID for new categories or tag sets
     * @param {string} name - Name to base the ID on
     * @returns {string} - Generated ID
     */
    generateId(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 50); // Limit length
    }

    /**
     * Validate category data
     * @param {Object} category - Category data to validate
     * @returns {Object} - Validation result {isValid, errors}
     */
    validateCategory(category) {
        const errors = [];
        
        if (!category.id || typeof category.id !== 'string') {
            errors.push('Category ID is required and must be a string');
        }
        
        if (!category.name || typeof category.name !== 'string') {
            errors.push('Category name is required and must be a string');
        }
        
        if (category.tags && !Array.isArray(category.tags)) {
            errors.push('Tags must be an array');
        }
        
        if (category.sets && !Array.isArray(category.sets)) {
            errors.push('Sets must be an array');
        }
        
        // Validate tag sets
        if (category.sets) {
            for (const set of category.sets) {
                if (!set.id || !set.name) {
                    errors.push('Each tag set must have an id and name');
                }
                if (set.tags && !Array.isArray(set.tags)) {
                    errors.push('Tag set tags must be an array');
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

// Export singleton instance
export const tagApi = new TagApi();

// Export individual functions for convenience
export const {
    getTagLibrary,
    saveTagLibrary,
    saveCategory,
    deleteCategory,
    searchTags,
    addTagToCategory,
    removeTagFromCategory,
    addTagSetToCategory,
    removeTagSetFromCategory,
    getTagsByCategory,
    clearCache,
    generateId,
    validateCategory
} = tagApi;

export default tagApi;

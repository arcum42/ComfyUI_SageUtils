/**
 * Lazy Image Loader with Retry Logic
 * Implements Intersection Observer for viewport-based lazy loading
 * and exponential backoff retry for failed thumbnail requests
 */

import { loadThumbnail } from './imageLoader.js';

/**
 * Configuration for lazy loading and retry behavior
 */
const CONFIG = {
    // Intersection Observer options
    rootMargin: '50px', // Load images 50px before they enter viewport
    threshold: 0.01,    // Trigger when 1% of image is visible
    
    // Retry configuration
    maxRetries: 3,
    initialRetryDelay: 1000,  // 1 second
    maxRetryDelay: 10000,     // 10 seconds
    retryBackoffMultiplier: 2, // Exponential backoff
    
    // Batch loading
    batchSize: 10,            // Load 10 images at a time
    batchDelay: 100,          // 100ms delay between batches
};

/**
 * Manages lazy loading of thumbnails with retry logic
 */
export class LazyImageLoader {
    constructor() {
        this.observer = null;
        this.pendingLoads = new Map(); // imagePath -> {element, retries, retryTimeout}
        this.loadingQueue = [];
        this.isProcessingQueue = false;
        this.loadStats = {
            total: 0,
            loaded: 0,
            failed: 0,
            retrying: 0
        };
        this.onProgressCallback = null;
    }

    /**
     * Initialize the Intersection Observer
     */
    init() {
        if (this.observer) {
            return; // Already initialized
        }

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const imagePath = img.dataset.imagePath;
                    
                    // Check dataset values as strings (dataset always stores strings)
                    if (imagePath && img.dataset.loaded !== 'true' && img.dataset.loading !== 'true') {
                        this.queueImageLoad(img, imagePath);
                    }
                }
            });
        }, {
            rootMargin: CONFIG.rootMargin,
            threshold: CONFIG.threshold
        });
    }

    /**
     * Observe an image element for lazy loading
     * @param {HTMLImageElement} img - Image element to observe
     * @param {string} imagePath - Path to the image
     * @param {string} thumbnailSize - Size of thumbnail to load
     */
    observe(img, imagePath, thumbnailSize = 'large') {
        if (!this.observer) {
            this.init();
        }

        // Store metadata on element
        img.dataset.imagePath = imagePath;
        img.dataset.thumbnailSize = thumbnailSize;
        img.dataset.loaded = 'false';
        img.dataset.loading = 'false';

        // Start observing
        this.observer.observe(img);
        this.loadStats.total++;
        this.updateProgress();
    }

    /**
     * Queue an image for loading (batch processing)
     * @param {HTMLImageElement} img - Image element
     * @param {string} imagePath - Path to the image
     */
    queueImageLoad(img, imagePath) {
        img.dataset.loading = 'true';
        this.loadingQueue.push({ img, imagePath });
        
        if (!this.isProcessingQueue) {
            this.processQueue();
        }
    }

    /**
     * Process the loading queue in batches
     */
    async processQueue() {
        if (this.isProcessingQueue || this.loadingQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.loadingQueue.length > 0) {
            // Take a batch from the queue
            const batch = this.loadingQueue.splice(0, CONFIG.batchSize);
            
            // Load all images in the batch concurrently
            await Promise.allSettled(
                batch.map(({ img, imagePath }) => this.loadImage(img, imagePath, 0))
            );

            // Small delay before next batch to avoid overwhelming the server
            if (this.loadingQueue.length > 0) {
                await this.delay(CONFIG.batchDelay);
            }
        }

        this.isProcessingQueue = false;
    }

    /**
     * Load a single image with retry logic
     * @param {HTMLImageElement} img - Image element
     * @param {string} imagePath - Path to the image
     * @param {number} retryCount - Current retry attempt
     */
    async loadImage(img, imagePath, retryCount = 0) {
        const thumbnailSize = img.dataset.thumbnailSize || 'large';

        try {
            // Attempt to load thumbnail
            const thumbnailUrl = await loadThumbnail({ path: imagePath }, thumbnailSize);
            
            // Set the image source
            img.src = thumbnailUrl;
            img.dataset.loaded = 'true';
            img.dataset.loading = 'false';
            
            // Update stats
            this.loadStats.loaded++;
            if (retryCount > 0) {
                this.loadStats.retrying--;
            }
            this.updateProgress();
            
            // Remove from pending loads
            this.pendingLoads.delete(imagePath);
            
        } catch (error) {
            console.warn(`Failed to load thumbnail for ${imagePath} (attempt ${retryCount + 1}):`, error);
            
            // Check if we should retry
            if (retryCount < CONFIG.maxRetries) {
                // Calculate retry delay with exponential backoff
                const retryDelay = Math.min(
                    CONFIG.initialRetryDelay * Math.pow(CONFIG.retryBackoffMultiplier, retryCount),
                    CONFIG.maxRetryDelay
                );
                
                console.log(`Retrying in ${retryDelay}ms...`);
                
                // Update stats
                if (retryCount === 0) {
                    this.loadStats.retrying++;
                }
                this.updateProgress();
                
                // Store pending retry
                const retryTimeout = setTimeout(() => {
                    this.loadImage(img, imagePath, retryCount + 1);
                }, retryDelay);
                
                this.pendingLoads.set(imagePath, {
                    element: img,
                    retries: retryCount + 1,
                    retryTimeout
                });
                
            } else {
                // Max retries exceeded, show error state
                img.dataset.loaded = 'error';
                img.dataset.loading = 'false';
                
                // Update stats
                this.loadStats.failed++;
                if (retryCount > 0) {
                    this.loadStats.retrying--;
                }
                this.updateProgress();
                
                // Show error placeholder
                this.showErrorState(img, imagePath);
                
                // Remove from pending loads
                this.pendingLoads.delete(imagePath);
            }
        }
    }

    /**
     * Show error state for failed image
     * @param {HTMLImageElement} img - Image element
     * @param {string} imagePath - Path to the image
     */
    showErrorState(img, imagePath) {
        // Create error placeholder
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            width: 100%;
            height: 150px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #333;
            color: #999;
            font-size: 11px;
            padding: 10px;
            text-align: center;
            gap: 8px;
        `;
        
        const iconDiv = document.createElement('div');
        iconDiv.textContent = '⚠️';
        iconDiv.style.fontSize = '24px';
        
        const messageDiv = document.createElement('div');
        messageDiv.textContent = 'Failed to load';
        
        const retryButton = document.createElement('button');
        retryButton.textContent = '🔄 Retry';
        retryButton.style.cssText = `
            padding: 4px 8px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
        `;
        retryButton.addEventListener('click', (e) => {
            e.stopPropagation();
            errorDiv.remove();
            img.style.display = 'block';
            img.dataset.loaded = 'false';
            img.dataset.loading = 'false';
            this.queueImageLoad(img, imagePath);
        });
        
        errorDiv.appendChild(iconDiv);
        errorDiv.appendChild(messageDiv);
        errorDiv.appendChild(retryButton);
        
        // Hide image and show error
        img.style.display = 'none';
        img.parentNode.insertBefore(errorDiv, img.nextSibling);
    }

    /**
     * Set progress callback
     * @param {Function} callback - Called with {total, loaded, failed, retrying}
     */
    onProgress(callback) {
        this.onProgressCallback = callback;
    }

    /**
     * Update and emit progress
     */
    updateProgress() {
        if (this.onProgressCallback) {
            this.onProgressCallback({ ...this.loadStats });
        }
    }

    /**
     * Get current loading statistics
     * @returns {Object} Stats object with total, loaded, failed, retrying counts
     */
    getStats() {
        return { ...this.loadStats };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.loadStats = {
            total: 0,
            loaded: 0,
            failed: 0,
            retrying: 0
        };
        this.updateProgress();
    }

    /**
     * Unobserve an image element
     * @param {HTMLImageElement} img - Image element to stop observing
     */
    unobserve(img) {
        if (this.observer) {
            this.observer.unobserve(img);
        }
        
        const imagePath = img.dataset.imagePath;
        if (imagePath && this.pendingLoads.has(imagePath)) {
            const pending = this.pendingLoads.get(imagePath);
            if (pending.retryTimeout) {
                clearTimeout(pending.retryTimeout);
            }
            this.pendingLoads.delete(imagePath);
        }
    }

    /**
     * Disconnect observer and cleanup
     */
    cleanup() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        
        // Cancel all pending retries
        this.pendingLoads.forEach(pending => {
            if (pending.retryTimeout) {
                clearTimeout(pending.retryTimeout);
            }
        });
        this.pendingLoads.clear();
        this.loadingQueue = [];
        this.resetStats();
    }

    /**
     * Utility delay function
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Singleton instance
let lazyLoaderInstance = null;

/**
 * Get or create the global lazy loader instance
 * @returns {LazyImageLoader}
 */
export function getLazyLoader() {
    if (!lazyLoaderInstance) {
        lazyLoaderInstance = new LazyImageLoader();
    }
    return lazyLoaderInstance;
}

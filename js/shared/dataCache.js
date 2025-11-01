/**
 * Global Data Cache System
 * 
 * Centralized cache for preloaded data used across sidebar tabs.
 * Provides status tracking, async loading, and cache invalidation.
 * 
 * Usage:
 *   import { DataCache } from './shared/dataCache.js';
 *   
 *   // Check if data is ready
 *   if (DataCache.isReady('cacheHash')) {
 *     const data = DataCache.get('cacheHash');
 *   }
 *   
 *   // Wait for data to be ready
 *   const data = await DataCache.waitFor('galleryImages:notes');
 *   
 *   // Preload data
 *   await DataCache.preloadCache();
 */

// Cache status constants
export const CacheStatus = {
  PENDING: 'pending',
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
  STALE: 'stale'
};

// Cache key constants
export const CacheKeys = {
  CACHE_HASH: 'cacheHash',
  CACHE_INFO: 'cacheInfo',
  GALLERY_NOTES: 'galleryImages:notes',
  GALLERY_INPUT: 'galleryImages:input',
  GALLERY_OUTPUT: 'galleryImages:output',
  LLM_MODELS_OLLAMA: 'llmModels:ollama',
  LLM_MODELS_LMSTUDIO: 'llmModels:lmstudio',
  SETTINGS: 'settings'
};

/**
 * Global data cache class
 */
class DataCacheClass {
  constructor() {
    // Cache storage
    this.cache = new Map();
    
    // Status tracking
    this.status = new Map();
    
    // Timestamps for cache invalidation
    this.timestamps = new Map();
    
    // Pending promises for in-flight requests
    this.pending = new Map();
    
    // Configuration
    this.config = {
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      ttlByKey: {
        [CacheKeys.CACHE_HASH]: 5 * 60 * 1000, // 5 minutes
        [CacheKeys.CACHE_INFO]: 5 * 60 * 1000, // 5 minutes
        [CacheKeys.SETTINGS]: 10 * 60 * 1000, // 10 minutes
        // Gallery content can change while running; keep shorter TTLs
        [CacheKeys.GALLERY_OUTPUT]: 30 * 1000, // 30 seconds for rapidly changing output folder
        [CacheKeys.GALLERY_INPUT]: 60 * 1000,  // 60 seconds for input folder
        [CacheKeys.GALLERY_NOTES]: 2 * 60 * 1000 // 2 minutes for notes
      }
    };
    
    // Initialize all keys as pending
    Object.values(CacheKeys).forEach(key => {
      this.status.set(key, CacheStatus.PENDING);
    });
    
    // Debug mode
    this.debug = false;
    
    // Metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      loads: 0,
      errors: 0
    };
  }
  
  /**
   * Enable/disable debug logging
   * @param {boolean} enabled - Enable debug mode
   */
  setDebug(enabled) {
    this.debug = enabled;
    if (this.debug) {
      console.log('[DataCache] Debug mode enabled');
    }
  }
  
  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {*} Cached data or null
   */
  get(key) {
    if (!this.cache.has(key)) {
      this.metrics.misses++;
      if (this.debug) {
        console.log(`[DataCache] MISS: ${key}`);
      }
      return null;
    }
    
    // Check if stale
    if (this.isStale(key)) {
      if (this.debug) {
        console.log(`[DataCache] STALE: ${key}`);
      }
      this.status.set(key, CacheStatus.STALE);
      return this.cache.get(key); // Return stale data but mark as stale
    }
    
    this.metrics.hits++;
    if (this.debug) {
      console.log(`[DataCache] HIT: ${key}`);
    }
    return this.cache.get(key);
  }
  
  /**
   * Set cached data
   * @param {string} key - Cache key
   * @param {*} value - Data to cache
   */
  set(key, value) {
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
    this.status.set(key, CacheStatus.READY);
    
    if (this.debug) {
      console.log(`[DataCache] SET: ${key}`, value);
    }
    
    // Check cache size
    this.enforceMaxSize();
  }
  
  /**
   * Get cache status
   * @param {string} key - Cache key
   * @returns {string} Cache status
   */
  getStatus(key) {
    return this.status.get(key) || CacheStatus.PENDING;
  }
  
  /**
   * Set cache status
   * @param {string} key - Cache key
   * @param {string} status - New status
   */
  setStatus(key, status) {
    this.status.set(key, status);
    
    if (this.debug) {
      console.log(`[DataCache] STATUS: ${key} -> ${status}`);
    }
  }
  
  /**
   * Check if data is ready
   * @param {string} key - Cache key
   * @returns {boolean} True if data is ready
   */
  isReady(key) {
    const status = this.getStatus(key);
    return status === CacheStatus.READY || status === CacheStatus.STALE;
  }
  
  /**
   * Check if data is stale
   * @param {string} key - Cache key
   * @returns {boolean} True if data is stale
   */
  isStale(key) {
    if (!this.timestamps.has(key)) {
      return false;
    }
    
    const timestamp = this.timestamps.get(key);
    const ttl = this.config.ttlByKey[key] || this.config.defaultTTL;
    const age = Date.now() - timestamp;
    
    return age > ttl;
  }
  
  /**
   * Wait for data to be ready
   * @param {string} key - Cache key
   * @param {number} timeout - Timeout in milliseconds (default: 10000)
   * @returns {Promise<*>} Promise that resolves with cached data
   */
  async waitFor(key, timeout = 10000) {
    // If already ready, return immediately
    if (this.isReady(key)) {
      return this.get(key);
    }
    
    // If already pending, return existing promise
    if (this.pending.has(key)) {
      if (this.debug) {
        console.log(`[DataCache] Waiting for existing promise: ${key}`);
      }
      return this.pending.get(key);
    }
    
    // Create new promise
    const promise = new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkStatus = () => {
        const status = this.getStatus(key);
        
        if (status === CacheStatus.READY || status === CacheStatus.STALE) {
          this.pending.delete(key);
          resolve(this.get(key));
        } else if (status === CacheStatus.ERROR) {
          this.pending.delete(key);
          reject(new Error(`Failed to load: ${key}`));
        } else if (Date.now() - startTime > timeout) {
          this.pending.delete(key);
          reject(new Error(`Timeout waiting for: ${key}`));
        } else {
          setTimeout(checkStatus, 50);
        }
      };
      
      checkStatus();
    });
    
    this.pending.set(key, promise);
    return promise;
  }
  
  /**
   * Invalidate cached data
   * @param {string} key - Cache key
   */
  invalidate(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
    this.status.set(key, CacheStatus.PENDING);
    this.pending.delete(key);
    
    if (this.debug) {
      console.log(`[DataCache] INVALIDATE: ${key}`);
    }
  }
  
  /**
   * Clear all cached data
   */
  clear() {
    this.cache.clear();
    this.timestamps.clear();
    this.pending.clear();
    
    // Reset all statuses to pending
    Object.values(CacheKeys).forEach(key => {
      this.status.set(key, CacheStatus.PENDING);
    });
    
    if (this.debug) {
      console.log('[DataCache] CLEAR ALL');
    }
  }
  
  /**
   * Enforce maximum cache size by evicting oldest entries
   */
  enforceMaxSize() {
    let totalSize = 0;
    const entries = Array.from(this.cache.entries());
    
    // Calculate total size (rough estimate)
    entries.forEach(([key, value]) => {
      const size = JSON.stringify(value).length;
      totalSize += size;
    });
    
    if (totalSize > this.config.maxCacheSize) {
      if (this.debug) {
        console.log(`[DataCache] Cache size (${totalSize}) exceeds max (${this.config.maxCacheSize}), evicting oldest entries`);
      }
      
      // Sort by timestamp (oldest first)
      const sorted = entries.sort((a, b) => {
        const timeA = this.timestamps.get(a[0]) || 0;
        const timeB = this.timestamps.get(b[0]) || 0;
        return timeA - timeB;
      });
      
      // Evict oldest entries until under limit
      let currentSize = totalSize;
      for (const [key, value] of sorted) {
        if (currentSize <= this.config.maxCacheSize * 0.8) {
          break; // Evict to 80% of max
        }
        
        const size = JSON.stringify(value).length;
        this.invalidate(key);
        currentSize -= size;
        
        if (this.debug) {
          console.log(`[DataCache] Evicted: ${key} (size: ${size})`);
        }
      }
    }
  }
  
  /**
   * Get cache metrics
   * @returns {Object} Cache metrics
   */
  getMetrics() {
    const hitRate = this.metrics.hits + this.metrics.misses > 0
      ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.metrics,
      hitRate: `${hitRate}%`,
      cacheSize: this.cache.size,
      pendingRequests: this.pending.size
    };
  }
  
  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      hits: 0,
      misses: 0,
      loads: 0,
      errors: 0
    };
  }
  
  /**
   * Preload cache hash data
   * @returns {Promise<void>}
   */
  async preloadCacheHash() {
    const key = CacheKeys.CACHE_HASH;
    
    // Skip if already loading or ready
    const status = this.getStatus(key);
    if (status === CacheStatus.LOADING || status === CacheStatus.READY) {
      if (this.debug) {
        console.log(`[DataCache] Skip preload (${status}): ${key}`);
      }
      return;
    }
    
    this.setStatus(key, CacheStatus.LOADING);
    this.metrics.loads++;
    
    try {
      if (this.debug) {
        console.log(`[DataCache] Preloading: ${key}`);
      }
      
      // Import API function dynamically
      const { fetchCacheHash } = await import('./api/cacheApi.js');
      const data = await fetchCacheHash();
      
      this.set(key, data);
      
      if (this.debug) {
        console.log(`[DataCache] Preloaded: ${key} (${Object.keys(data).length} entries)`);
      }
    } catch (error) {
      console.error(`[DataCache] Error preloading ${key}:`, error);
      this.setStatus(key, CacheStatus.ERROR);
      this.metrics.errors++;
    }
  }
  
  /**
   * Preload cache info data
   * @returns {Promise<void>}
   */
  async preloadCacheInfo() {
    const key = CacheKeys.CACHE_INFO;
    
    // Skip if already loading or ready
    const status = this.getStatus(key);
    if (status === CacheStatus.LOADING || status === CacheStatus.READY) {
      if (this.debug) {
        console.log(`[DataCache] Skip preload (${status}): ${key}`);
      }
      return;
    }
    
    this.setStatus(key, CacheStatus.LOADING);
    this.metrics.loads++;
    
    try {
      if (this.debug) {
        console.log(`[DataCache] Preloading: ${key}`);
      }
      
      // Import API function dynamically
      const { fetchCacheInfo } = await import('./api/cacheApi.js');
      const data = await fetchCacheInfo();
      
      this.set(key, data);
      
      if (this.debug) {
        console.log(`[DataCache] Preloaded: ${key} (${Object.keys(data).length} entries)`);
      }
    } catch (error) {
      console.error(`[DataCache] Error preloading ${key}:`, error);
      this.setStatus(key, CacheStatus.ERROR);
      this.metrics.errors++;
    }
  }
  
  /**
   * Preload gallery images for a specific folder
   * @param {string} folder - Folder name (notes, input, output)
   * @returns {Promise<void>}
   */
  async preloadGalleryImages(folder = 'notes') {
    const key = `galleryImages:${folder}`;
    
    // Skip if already loading or ready
    const status = this.getStatus(key);
    if (status === CacheStatus.LOADING || status === CacheStatus.READY) {
      if (this.debug) {
        console.log(`[DataCache] Skip preload (${status}): ${key}`);
      }
      return;
    }
    
    this.setStatus(key, CacheStatus.LOADING);
    this.metrics.loads++;
    
    try {
      if (this.debug) {
        console.log(`[DataCache] Preloading: ${key}`);
      }
      
      // Import API function dynamically
      const { loadImagesFromFolder } = await import('./api/galleryApi.js');
      
      const result = await loadImagesFromFolder(folder, null, (msg) => {
        if (this.debug && (msg.includes('Loading') || msg.includes('Complete'))) {
          console.log(`[DataCache] ${key}: ${msg}`);
        }
      });
      
      this.set(key, result);
      
      if (this.debug) {
        console.log(`[DataCache] Preloaded: ${key} (${result.images.length} images, ${result.folders.length} folders)`);
      }
    } catch (error) {
      console.error(`[DataCache] Error preloading ${key}:`, error);
      this.setStatus(key, CacheStatus.ERROR);
      this.metrics.errors++;
    }
  }
  
  /**
   * Preload settings
   * @returns {Promise<void>}
   */
  async preloadSettings() {
    const key = CacheKeys.SETTINGS;
    
    // Skip if already loading or ready
    const status = this.getStatus(key);
    if (status === CacheStatus.LOADING || status === CacheStatus.READY) {
      if (this.debug) {
        console.log(`[DataCache] Skip preload (${status}): ${key}`);
      }
      return;
    }
    
    this.setStatus(key, CacheStatus.LOADING);
    this.metrics.loads++;
    
    try {
      if (this.debug) {
        console.log(`[DataCache] Preloading: ${key}`);
      }
      
      // Import API dynamically
      const { api } = await import('../../../../scripts/api.js');
      const response = await api.fetchApi('/sage_utils/settings');
      
      if (response.ok) {
        const data = await response.json();
        this.set(key, data.settings || {});
        
        if (this.debug) {
          console.log(`[DataCache] Preloaded: ${key}`);
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`[DataCache] Error preloading ${key}:`, error);
      this.setStatus(key, CacheStatus.ERROR);
      this.metrics.errors++;
    }
  }
  
  /**
   * Preload all critical data
   * @returns {Promise<void>}
   */
  async preloadAll() {
    const startTime = performance.now();
    
    if (this.debug) {
      console.log('[DataCache] Starting preload of all critical data...');
    }
    
    // Determine preferred gallery folder from persisted state (fallback to notes)
    let preferredFolder = 'notes';
    try {
      const stored = localStorage.getItem('sageutils_sidebar_state');
      if (stored) {
        const parsed = JSON.parse(stored);
        const selected = parsed?.gallery?.selectedFolder;
        const currentPath = parsed?.gallery?.currentPath;
        if (selected && selected !== 'custom') {
          preferredFolder = selected;
        } else if (selected === 'custom') {
          // Only preload custom if a path exists (DataCache.preloadGalleryImages doesn't take a path yet), otherwise fallback
          if (currentPath && currentPath.trim() !== '') {
            // Fallback: still use notes as DataCache cannot preload custom paths
            preferredFolder = 'notes';
          }
        }
      }
    } catch (e) {
      // Ignore parse errors and fallback to notes
    }

    // Preload in parallel
    await Promise.allSettled([
      this.preloadCacheHash(),
      this.preloadCacheInfo(),
      this.preloadGalleryImages(preferredFolder),
      this.preloadSettings()
    ]);
    
    const duration = performance.now() - startTime;
    
    if (this.debug) {
      console.log(`[DataCache] Preload complete in ${duration.toFixed(2)}ms`);
      console.log('[DataCache] Metrics:', this.getMetrics());
    }
  }
  
  /**
   * Get formatted cache summary
   * @returns {string} Cache summary
   */
  getSummary() {
    const metrics = this.getMetrics();
    const statuses = {};
    
    Object.values(CacheKeys).forEach(key => {
      const status = this.getStatus(key);
      statuses[status] = (statuses[status] || 0) + 1;
    });
    
    return `DataCache Summary:
  - Cache Size: ${metrics.cacheSize} entries
  - Hit Rate: ${metrics.hitRate}
  - Hits: ${metrics.hits}, Misses: ${metrics.misses}
  - Loads: ${metrics.loads}, Errors: ${metrics.errors}
  - Pending: ${metrics.pendingRequests}
  - Status: ${Object.entries(statuses).map(([k, v]) => `${k}=${v}`).join(', ')}`;
  }
}

// Export singleton instance
export const DataCache = new DataCacheClass();

// Export for debugging
if (typeof window !== 'undefined') {
  window.SageUtils_DataCache = DataCache;
}

export default DataCache;

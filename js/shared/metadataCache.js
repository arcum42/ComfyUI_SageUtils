/**
 * Persistent Metadata Cache (LRU + localStorage)
 * Caches image metadata by image path and persists between sessions.
 *
 * Usage:
 *   import { MetadataCache } from './metadataCache.js';
 *   const meta = MetadataCache.get(path);
 *   await MetadataCache.set(path, metadata);
 *   const stats = MetadataCache.getStats();
 */

// Configuration constants
const DEFAULT_MAX_ENTRIES = 300; // limit to avoid exceeding localStorage quota
const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const STORAGE_KEY = 'sageutils:metadataCache:v1';

class MetadataCacheClass {
  constructor() {
    this.maxEntries = DEFAULT_MAX_ENTRIES;
    this.ttlMs = DEFAULT_TTL_MS;
    this.memory = new Map(); // key -> { metadata, ts }
    this.lru = []; // most recent at end
    this.loaded = false;
    this.metrics = { hits: 0, misses: 0, stores: 0, evictions: 0, loads: 0, errors: 0 };
  }

  /** Load cache from localStorage once */
  load() {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.entries)) {
        parsed.entries.forEach(e => {
          if (e && typeof e.key === 'string' && e.value && typeof e.value.ts === 'number') {
            this.memory.set(e.key, e.value);
          }
        });
        // Rebuild LRU order (cap to maxEntries)
        this.lru = Array.isArray(parsed.lru) ? parsed.lru.filter(k => this.memory.has(k)) : Array.from(this.memory.keys());
        if (this.lru.length > this.maxEntries) {
          this.lru = this.lru.slice(-this.maxEntries);
        }
      }
    } catch (err) {
      this.metrics.errors++;
      // If corrupted, clear only the stored blob to avoid repeated JSON.parse failures
      try { window.localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    }
  }

  /** Persist current cache to localStorage */
  persist() {
    try {
      const entries = [];
      // Persist only those still referenced in LRU to bound size
      const allowed = new Set(this.lru);
      this.memory.forEach((value, key) => {
        if (allowed.has(key)) {
          entries.push({ key, value });
        }
      });
      const payload = JSON.stringify({ entries, lru: this.lru });
      window.localStorage.setItem(STORAGE_KEY, payload);
    } catch (err) {
      this.metrics.errors++;
      // Quota exceeded: evict oldest 10% and retry once
      if (this.lru.length > 0) {
        const toEvict = Math.max(1, Math.floor(this.lru.length * 0.1));
        for (let i = 0; i < toEvict; i++) {
          const k = this.lru.shift();
          if (k != null) {
            this.memory.delete(k);
            this.metrics.evictions++;
          }
        }
        try {
          const entries = [];
          const allowed = new Set(this.lru);
          this.memory.forEach((value, key) => {
            if (allowed.has(key)) {
              entries.push({ key, value });
            }
          });
          const payload = JSON.stringify({ entries, lru: this.lru });
          window.localStorage.setItem(STORAGE_KEY, payload);
        } catch (_) {
          // Give up silently; in-memory cache will still function
        }
      }
    }
  }

  /** Normalize key from image input */
  keyFrom(imageInput) {
    if (!imageInput) return null;
    if (typeof imageInput === 'string') return imageInput;
    return imageInput.path || imageInput.relative_path || imageInput.name || null;
  }

  /** Get cached metadata or null */
  get(imageInput) {
    this.load();
    const key = this.keyFrom(imageInput);
    if (!key) return null;
    const rec = this.memory.get(key);
    if (!rec) {
      this.metrics.misses++;
      return null;
    }
    // TTL check (stale entries are returned but marked for revalidation by caller)
    this.touch(key);
    this.metrics.hits++;
    return rec.metadata;
  }

  /** True if an entry exists */
  has(imageInput) {
    this.load();
    const key = this.keyFrom(imageInput);
    return !!key && this.memory.has(key);
  }

  /** Whether cached entry is stale by TTL */
  isStale(imageInput) {
    this.load();
    const key = this.keyFrom(imageInput);
    if (!key) return true;
    const rec = this.memory.get(key);
    if (!rec) return true;
    const age = Date.now() - rec.ts;
    return age > this.ttlMs;
  }

  /** Store metadata */
  set(imageInput, metadata) {
    this.load();
    const key = this.keyFrom(imageInput);
    if (!key) return;
    this.memory.set(key, { metadata, ts: Date.now() });
    this.touch(key);
    // Enforce max entries (LRU eviction)
    while (this.lru.length > this.maxEntries) {
      const k = this.lru.shift();
      if (k != null) {
        this.memory.delete(k);
        this.metrics.evictions++;
      }
    }
    this.metrics.stores++;
    this.persist();
  }

  /** Remove an entry */
  remove(imageInput) {
    this.load();
    const key = this.keyFrom(imageInput);
    if (!key) return;
    this.memory.delete(key);
    const idx = this.lru.indexOf(key);
    if (idx >= 0) this.lru.splice(idx, 1);
    this.persist();
  }

  /** Clear all */
  clear() {
    this.memory.clear();
    this.lru = [];
    try { window.localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }

  /** Update LRU order */
  touch(key) {
    const idx = this.lru.indexOf(key);
    if (idx >= 0) this.lru.splice(idx, 1);
    this.lru.push(key);
  }

  /** Stats */
  getStats() {
    return {
      size: this.memory.size,
      lruSize: this.lru.length,
      maxEntries: this.maxEntries,
      ttlMs: this.ttlMs,
      ...this.metrics
    };
  }
}

export const MetadataCache = new MetadataCacheClass();
export default MetadataCache;

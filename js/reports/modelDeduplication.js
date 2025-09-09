/**
 * Model Deduplication Utilities for SageUtils Reports
 * Handles removal of duplicate models and path normalization
 */

/**
 * Deduplicate models array by multiple criteria to prevent showing the same physical file multiple times
 * @param {Array} models - Array of model objects
 * @returns {Array} - Deduplicated array of models
 */
export function deduplicateModels(models) {
    const seenModels = [];
    const hashMap = new Map(); // Track by file hash
    const pathMap = new Map(); // Track by normalized path  
    const sizeNameMap = new Map(); // Track by size + filename combination
    
    models.forEach(model => {
        const filePath = model.filePath;
        const hash = model.hash;
        const info = model.info || {};
        
        if (!filePath) return; // Skip models without file path
        
        // Normalize the file path to handle relative paths and resolve ../ 
        const normalizedPath = normalizePath(filePath);
        const fileName = normalizedPath.split('/').pop() || '';
        const fileSize = info.file_size || info.fileSize || info.size || 0;
        
        // Create unique identifiers for different deduplication strategies
        const pathKey = normalizedPath;
        const hashKey = hash && hash !== 'Unknown' ? hash : null;
        const sizeNameKey = fileSize && fileName ? `${fileSize}_${fileName}` : null;
        
        let isDuplicate = false;
        let existingIndex = -1;
        let duplicateType = '';
        
        // Check for duplicates in order of reliability:
        // 1. First check by file hash (most reliable)
        if (hashKey && hashMap.has(hashKey)) {
            isDuplicate = true;
            existingIndex = hashMap.get(hashKey);
            duplicateType = 'hash';
        }
        // 2. Then check by exact file path
        else if (pathMap.has(pathKey)) {
            isDuplicate = true;
            existingIndex = pathMap.get(pathKey);
            duplicateType = 'path';
        }
        // 3. Finally check by size + filename (catches different paths to same file)
        else if (sizeNameKey && sizeNameMap.has(sizeNameKey) && fileSize > 0) {
            // Additional verification: only treat as duplicate if it's a substantial file (>1MB)
            // This helps avoid false positives with small config files that might have same size+name
            if (fileSize > 1024 * 1024) {
                isDuplicate = true;
                existingIndex = sizeNameMap.get(sizeNameKey);
                duplicateType = 'size-name';
            }
        }
        
        if (isDuplicate && existingIndex !== -1 && seenModels[existingIndex]) {
            // Merge with existing entry, preferring non-null/non-undefined values
            const existing = seenModels[existingIndex];
            
            // Merge info objects, preferring values that exist
            const mergedInfo = { ...existing.info };
            if (info) {
                Object.keys(info).forEach(key => {
                    if (info[key] != null && 
                        (mergedInfo[key] == null || 
                         (key.includes('size') && mergedInfo[key] === 0) ||
                         (key.includes('Size') && mergedInfo[key] === 0))) {
                        mergedInfo[key] = info[key];
                    }
                });
            }
            
            // Prefer the shorter, cleaner path for display
            let preferredPath = existing.filePath;
            if (filePath.length < existing.filePath.length || 
                (!existing.filePath.includes('/') && filePath.includes('/'))) {
                preferredPath = filePath;
            }
            
            // Update the existing entry with merged data
            seenModels[existingIndex] = {
                filePath: preferredPath,
                hash: hash || existing.hash,
                info: mergedInfo
            };
            
            console.debug(`Merged duplicate model (${duplicateType}): ${filePath} -> ${preferredPath}`);
        } else {
            // First occurrence, add to array and maps
            const newEntry = { ...model, filePath: normalizedPath };
            const newIndex = seenModels.length;
            seenModels.push(newEntry);
            
            pathMap.set(pathKey, newIndex);
            if (hashKey) hashMap.set(hashKey, newIndex);
            if (sizeNameKey) sizeNameMap.set(sizeNameKey, newIndex);
        }
    });
    
    return seenModels;
}

/**
 * Normalize a file path by resolving relative components and cleaning up the path
 * @param {string} filePath - The file path to normalize
 * @returns {string} - Normalized file path
 */
export function normalizePath(filePath) {
    if (!filePath || typeof filePath !== 'string') return '';
    
    // Convert backslashes to forward slashes for consistency
    let normalized = filePath.replace(/\\/g, '/');
    
    // Remove duplicate slashes
    normalized = normalized.replace(/\/+/g, '/');
    
    // Split into components and resolve .. and . references
    const parts = normalized.split('/');
    const resolved = [];
    
    for (const part of parts) {
        if (part === '..') {
            // Go up one directory (remove last component)
            if (resolved.length > 0 && resolved[resolved.length - 1] !== '..') {
                resolved.pop();
            } else if (!normalized.startsWith('/')) {
                // Only keep .. if we're dealing with relative paths
                resolved.push(part);
            }
        } else if (part !== '.' && part !== '') {
            // Add normal directory/file names (skip . and empty parts)
            resolved.push(part);
        }
    }
    
    // Reconstruct the path
    const result = (normalized.startsWith('/') ? '/' : '') + resolved.join('/');
    return result || '/';
}

/**
 * File Management and Organization for SageUtils Cache Browser
 * Handles file sorting, filtering, and folder structure organization
 */

/**
 * Sort files based on selected criteria
 * @param {Array} files - Array of file paths
 * @param {string} sortBy - Sort criteria
 * @param {Object} hashData - Hash data mapping
 * @param {Object} infoData - Info data mapping
 * @returns {Array} - Sorted array of file paths
 */
export function sortFiles(files, sortBy, hashData, infoData) {
    return files.sort((a, b) => {
        const hashA = hashData[a];
        const hashB = hashData[b];
        const infoA = infoData[hashA];
        const infoB = infoData[hashB];
        
        switch (sortBy) {
            case 'name':
                return a.localeCompare(b);
            case 'name-desc':
                return b.localeCompare(a);
            case 'lastused': {
                const lastUsedA = (infoA && (infoA.lastUsed || infoA.last_accessed)) ? new Date(infoA.lastUsed || infoA.last_accessed) : new Date(0);
                const lastUsedB = (infoB && (infoB.lastUsed || infoB.last_accessed)) ? new Date(infoB.lastUsed || infoB.last_accessed) : new Date(0);
                return lastUsedB - lastUsedA; // Recent first
            }
            case 'lastused-desc': {
                const lastUsedA = (infoA && (infoA.lastUsed || infoA.last_accessed)) ? new Date(infoA.lastUsed || infoA.last_accessed) : new Date(0);
                const lastUsedB = (infoB && (infoB.lastUsed || infoB.last_accessed)) ? new Date(infoB.lastUsed || infoB.last_accessed) : new Date(0);
                return lastUsedA - lastUsedB; // Oldest first
            }
            case 'size': {
                const sizeA = (infoA && infoA.file_size) ? infoA.file_size : 0;
                const sizeB = (infoB && infoB.file_size) ? infoB.file_size : 0;
                return sizeA - sizeB; // Small to large
            }
            case 'size-desc': {
                const sizeA = (infoA && infoA.file_size) ? infoA.file_size : 0;
                const sizeB = (infoB && infoB.file_size) ? infoB.file_size : 0;
                return sizeB - sizeA; // Large to small
            }
            case 'type': {
                const typeA = (infoA && infoA.model && infoA.model.type) ? infoA.model.type : 'ZZZ';
                const typeB = (infoB && infoB.model && infoB.model.type) ? infoB.model.type : 'ZZZ';
                if (typeA !== typeB) {
                    return typeA.localeCompare(typeB);
                }
                return a.localeCompare(b); // Secondary sort by name
            }
            default:
                return a.localeCompare(b);
        }
    });
}

/**
 * Filter files based on various criteria
 * @param {Array} filePaths - Array of file paths to filter
 * @param {Object} options - Filter options
 * @param {Object} hashData - Hash data mapping
 * @param {Object} infoData - Info data mapping
 * @returns {Array} - Filtered array of file paths
 */
export function filterFiles(filePaths, options, hashData, infoData) {
    const {
        filterType = 'all',
        searchTerm = '',
        lastUsedFilter = 'all'
    } = options;

    // Calculate date thresholds for last used filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    return filePaths.filter(filePath => {
        const hash = hashData[filePath];
        const info = infoData[hash];
        
        // Check model type filter
        if (filterType !== 'all') {
            if (!info || !info.model || info.model.type !== filterType) {
                return false;
            }
        }
        
        // Check search term filter
        if (searchTerm) {
            const fileName = filePath.split('/').pop() || '';
            const modelName = (info && info.model && info.model.name) || '';
            const versionName = (info && info.name) || '';
            
            const searchableText = `${fileName} ${modelName} ${versionName}`.toLowerCase();
            if (!searchableText.includes(searchTerm.toLowerCase())) {
                return false;
            }
        }
        
        // Check last used filter
        if (lastUsedFilter !== 'all') {
            const lastUsed = info && (info.lastUsed || info.last_accessed);
            
            if (lastUsedFilter === 'never') {
                // Show models that have never been used
                if (lastUsed) {
                    return false;
                }
            } else {
                // Show models used within the specified time frame
                if (!lastUsed) {
                    return false;
                }
                
                const lastUsedDate = new Date(lastUsed);
                
                switch (lastUsedFilter) {
                    case 'today':
                        if (lastUsedDate < today) {
                            return false;
                        }
                        break;
                    case 'week':
                        if (lastUsedDate < weekAgo) {
                            return false;
                        }
                        break;
                    case 'month':
                        if (lastUsedDate < monthAgo) {
                            return false;
                        }
                        break;
                }
            }
        }
        
        return true;
    });
}

/**
 * Organize files into folder structure based on their paths
 * @param {Array} filePaths - Array of file paths
 * @param {Object} hashData - Hash data mapping
 * @param {Object} infoData - Info data mapping
 * @returns {Object} - Folder structure object
 */
export function organizeFolderStructure(filePaths, hashData, infoData) {
    const folderStructure = {};
    
    filePaths.forEach(filePath => {
        const hash = hashData[filePath];
        const info = infoData[hash];
        
        // Extract relative path based on model type
        let relativePath = filePath;
        if (info && info.model && info.model.type) {
            const modelType = info.model.type.toLowerCase();
            
            // Find the appropriate base directory in the path
            let baseDirName = '';
            if (modelType === 'checkpoint') {
                baseDirName = 'checkpoints';
            } else if (modelType === 'lora') {
                baseDirName = 'loras';
            }
            
            if (baseDirName) {
                // Look for the base directory in the path
                const pathParts = filePath.split('/');
                const baseDirIndex = pathParts.findIndex(part => 
                    part.toLowerCase() === baseDirName || 
                    part.toLowerCase().includes(baseDirName)
                );
                
                if (baseDirIndex !== -1 && baseDirIndex < pathParts.length - 1) {
                    // Extract the relative path from the base directory
                    relativePath = pathParts.slice(baseDirIndex + 1).join('/');
                } else {
                    // Fallback to just the filename if we can't find the base directory
                    relativePath = pathParts[pathParts.length - 1];
                }
            } else {
                // For other types, just show the filename
                relativePath = filePath.split('/').pop() || filePath;
            }
        }
        
        // Split the relative path into folder structure
        const pathParts = relativePath.split('/');
        const fileName = pathParts.pop(); // Remove filename
        const folderPath = pathParts.join('/');
        
        // Initialize folder structure
        if (!folderStructure[folderPath]) {
            folderStructure[folderPath] = [];
        }
        
        // Add file to the appropriate folder
        folderStructure[folderPath].push({
            hash: hash,
            fileName: fileName,
            fullPath: filePath,
            info: info
        });
    });
    
    return folderStructure;
}

/**
 * Extract relative path from full path based on model type
 * @param {string} filePath - Full file path
 * @param {Object} info - Model info object
 * @returns {string} - Relative path
 */
export function extractRelativePath(filePath, info) {
    if (!info || !info.model || !info.model.type) {
        return filePath.split('/').pop() || filePath;
    }
    
    const modelType = info.model.type.toLowerCase();
    let baseDirName = '';
    
    if (modelType === 'checkpoint') {
        baseDirName = 'checkpoints';
    } else if (modelType === 'lora') {
        baseDirName = 'loras';
    }
    
    if (baseDirName) {
        const pathParts = filePath.split('/');
        const baseDirIndex = pathParts.findIndex(part => 
            part.toLowerCase() === baseDirName || 
            part.toLowerCase().includes(baseDirName)
        );
        
        if (baseDirIndex !== -1 && baseDirIndex < pathParts.length - 1) {
            return pathParts.slice(baseDirIndex + 1).join('/');
        }
    }
    
    return filePath.split('/').pop() || filePath;
}

/**
 * Group files by model type for reporting
 * @param {Array} filePaths - Array of file paths
 * @param {Object} hashData - Hash data mapping
 * @param {Object} infoData - Info data mapping
 * @returns {Object} - Object with checkpoints and loras arrays
 */
export function groupFilesByType(filePaths, hashData, infoData) {
    const checkpoints = [];
    const loras = [];

    filePaths.forEach(filePath => {
        const hash = hashData[filePath];
        const info = infoData[hash];
        const modelType = info && info.model && info.model.type;
        
        if (modelType === 'Checkpoint') {
            checkpoints.push({ filePath, hash, info });
        } else if (modelType === 'LORA' || modelType === 'LoCon') {
            loras.push({ filePath, hash, info });
        }
    });

    return { checkpoints, loras };
}

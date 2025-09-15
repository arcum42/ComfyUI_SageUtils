/**
 * Model Sorting and Grouping Utilities for SageUtils Reports
 * Handles sorting models by various criteria and grouping by Civitai ID
 */

import {
    hasUpdateAvailable
} from '../shared/civitai.js';

/**
 * Sort models array based on the specified criteria
 * @param {Array} models - Array of model objects
 * @param {string} sortBy - Sort criteria
 * @returns {Array} - Sorted array of models
 */
export function sortModels(models, sortBy) {
    return models.sort((a, b) => {
        const infoA = a.info || {};
        const infoB = b.info || {};
        
        switch (sortBy) {
            case 'name': {
                const nameA = (infoA.model && infoA.model.name) || infoA.name || a.filePath.split('/').pop() || '';
                const nameB = (infoB.model && infoB.model.name) || infoB.name || b.filePath.split('/').pop() || '';
                return nameA.localeCompare(nameB);
            }
            case 'name-desc': {
                const nameA = (infoA.model && infoA.model.name) || infoA.name || a.filePath.split('/').pop() || '';
                const nameB = (infoB.model && infoB.model.name) || infoB.name || b.filePath.split('/').pop() || '';
                return nameB.localeCompare(nameA);
            }
            case 'lastused': {
                const lastUsedA = (infoA.lastUsed || infoA.last_accessed) ? new Date(infoA.lastUsed || infoA.last_accessed) : new Date(0);
                const lastUsedB = (infoB.lastUsed || infoB.last_accessed) ? new Date(infoB.lastUsed || infoB.last_accessed) : new Date(0);
                return lastUsedB - lastUsedA; // Recent first
            }
            case 'lastused-desc': {
                const lastUsedA = (infoA.lastUsed || infoA.last_accessed) ? new Date(infoA.lastUsed || infoA.last_accessed) : new Date(0);
                const lastUsedB = (infoB.lastUsed || infoB.last_accessed) ? new Date(infoB.lastUsed || infoB.last_accessed) : new Date(0);
                return lastUsedA - lastUsedB; // Oldest first
            }
            case 'size': {
                const sizeA = infoA.file_size || 0;
                const sizeB = infoB.file_size || 0;
                return sizeA - sizeB; // Small to large
            }
            case 'size-desc': {
                const sizeA = infoA.file_size || 0;
                const sizeB = infoB.file_size || 0;
                return sizeB - sizeA; // Large to small
            }
            case 'type': {
                const typeA = (infoA.model && infoA.model.type) || infoA.model_type || 'ZZZ';
                const typeB = (infoB.model && infoB.model.type) || infoB.model_type || 'ZZZ';
                if (typeA !== typeB) {
                    return typeA.localeCompare(typeB);
                }
                // Secondary sort by name
                const nameA = (infoA.model && infoA.model.name) || infoA.name || a.filePath.split('/').pop() || '';
                const nameB = (infoB.model && infoB.model.name) || infoB.name || b.filePath.split('/').pop() || '';
                return nameA.localeCompare(nameB);
            }
            case 'type-desc': {
                const typeA = (infoA.model && infoA.model.type) || infoA.model_type || 'ZZZ';
                const typeB = (infoB.model && infoB.model.type) || infoB.model_type || 'ZZZ';
                if (typeA !== typeB) {
                    return typeB.localeCompare(typeA); // Reversed for descending
                }
                // Secondary sort by name (also reversed for descending)
                const nameA = (infoA.model && infoA.model.name) || infoA.name || a.filePath.split('/').pop() || '';
                const nameB = (infoB.model && infoB.model.name) || infoB.name || b.filePath.split('/').pop() || '';
                return nameB.localeCompare(nameA);
            }
            default: {
                // Default to name sorting
                const nameA = (infoA.model && infoA.model.name) || infoA.name || a.filePath.split('/').pop() || '';
                const nameB = (infoB.model && infoB.model.name) || infoB.name || b.filePath.split('/').pop() || '';
                return nameA.localeCompare(nameB);
            }
        }
    });
}

/**
 * Group models by Civitai ID, keeping different versions of the same model together
 * @param {Array} models - Array of model objects
 * @param {string} sortBy - Sort criteria to apply within groups
 * @returns {Array} - Array of models grouped and sorted
 */
export function groupModelsByCivitaiId(models, sortBy) {
    // First, group models by Civitai ID
    const groupedModels = new Map();
    const ungroupedModels = [];
    
    models.forEach(model => {
        const modelId = model.info && (model.info.modelId || model.info.model_id);
        
        if (modelId && modelId !== 'Unknown' && modelId !== null) {
            if (!groupedModels.has(modelId)) {
                groupedModels.set(modelId, []);
            }
            groupedModels.get(modelId).push(model);
        } else {
            ungroupedModels.push(model);
        }
    });
    
    // Sort models within each group
    for (const [modelId, group] of groupedModels) {
        groupedModels.set(modelId, sortModels(group, sortBy));
    }
    
    // Sort ungrouped models
    const sortedUngrouped = sortModels(ungroupedModels, sortBy);
    
    // Combine grouped and ungrouped models
    // First, get all groups and sort them by the first model in each group
    const sortedGroups = Array.from(groupedModels.entries()).sort((a, b) => {
        const firstModelA = a[1][0];
        const firstModelB = b[1][0];
        
        // Use the same sorting logic as the main sort
        const tempModels = [firstModelA, firstModelB];
        const sorted = sortModels(tempModels, sortBy);
        return sorted[0] === firstModelA ? -1 : 1;
    });
    
    // Flatten the result: grouped models first, then ungrouped models
    const result = [];
    
    sortedGroups.forEach(([modelId, group]) => {
        result.push(...group);
    });
    
    result.push(...sortedUngrouped);
    
    return result;
}

/**
 * Generate grouping information for models based on Civitai ID
 * @param {Array} models - Array of models (already grouped and sorted)
 * @returns {Array} - Array of group info objects for each model
 */
export function generateGroupInfo(models) {
    const groupInfo = [];
    let currentModelId = null;
    let groupStartIndex = -1;
    let groupSize = 0;

    models.forEach((model, index) => {
        const modelId = model.info && (model.info.modelId || model.info.model_id);
        const effectiveModelId = (modelId && modelId !== 'Unknown' && modelId !== null) ? modelId : null;
        
        if (effectiveModelId && effectiveModelId === currentModelId) {
            // Continue current group
            groupSize++;
            groupInfo[index] = {
                isGroupMember: true,
                isGroupFirst: false,
                isGroupLast: false,
                groupSize: groupSize,
                modelId: effectiveModelId
            };
        } else {
            // End previous group if it had more than one model
            if (groupSize > 1 && groupStartIndex !== -1) {
                groupInfo[groupStartIndex].isGroupFirst = true;
                groupInfo[index - 1].isGroupLast = true;
                
                // Check if any model in the group doesn't have an update available
                // If so, we likely already have the latest version
                let groupHasLatestVersion = false;
                for (let i = groupStartIndex; i < index; i++) {
                    const modelInGroup = models[i];
                    if (modelInGroup && modelInGroup.info && !hasUpdateAvailable(modelInGroup.info)) {
                        groupHasLatestVersion = true;
                        break;
                    }
                }
                
                // Mark all models in the group
                for (let i = groupStartIndex; i < index; i++) {
                    groupInfo[i].isGroupMember = true;
                    groupInfo[i].groupHasLatestVersion = groupHasLatestVersion;
                }
            }
            
            // Start new group or single model
            currentModelId = effectiveModelId;
            groupStartIndex = effectiveModelId ? index : -1;
            groupSize = effectiveModelId ? 1 : 0;
            
            groupInfo[index] = {
                isGroupMember: effectiveModelId ? true : false,
                isGroupFirst: false,
                isGroupLast: false,
                groupSize: groupSize,
                modelId: effectiveModelId
            };
        }
    });
    
    // Handle the last group if needed
    if (groupSize > 1 && groupStartIndex !== -1) {
        groupInfo[groupStartIndex].isGroupFirst = true;
        groupInfo[models.length - 1].isGroupLast = true;
        
        // Check if any model in the final group doesn't have an update available
        let groupHasLatestVersion = false;
        for (let i = groupStartIndex; i < models.length; i++) {
            const modelInGroup = models[i];
            if (modelInGroup && modelInGroup.info && !hasUpdateAvailable(modelInGroup.info)) {
                groupHasLatestVersion = true;
                break;
            }
        }
        
        // Mark all models in the final group
        for (let i = groupStartIndex; i < models.length; i++) {
            groupInfo[i].isGroupMember = true;
            groupInfo[i].groupHasLatestVersion = groupHasLatestVersion;
        }
    }
    
    return groupInfo;
}

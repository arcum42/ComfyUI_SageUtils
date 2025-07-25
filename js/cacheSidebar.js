/**
 * SageUtils Cache Sidebar Tab
 * Displays cached files and their detailed information
 */

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// Import shared modules
import { 
    escapeHtml, 
    formatFileSize, 
    getBaseModelStyle, 
    generateTableRows, 
    generateHtmlContent, 
    openHtmlReport 
} from "./shared/reportGenerator.js";

import { 
    fetchCacheHash, 
    fetchCacheInfo, 
    pullMetadata, 
    updateCacheInfo, 
    refreshCacheData, 
    getFilePathForHash,
    cacheData 
} from "./shared/cacheApi.js";

import { 
    sortFiles, 
    filterFiles, 
    organizeFolderStructure, 
    extractRelativePath, 
    groupFilesByType 
} from "./shared/fileManager.js";

import { 
    createButton, 
    createSelect, 
    createInput, 
    createLabel, 
    createContainer, 
    createProgressBar, 
    addDropdownStyles, 
    createCustomDropdown, 
    createNsfwToggle,
    BUTTON_STYLES,
    INPUT_STYLES 
} from "./shared/uiComponents.js";

import { 
    createDialog, 
    confirmDialog, 
    alertDialog, 
    promptDialog, 
    createImageDialog, 
    createMetadataDialog 
} from "./shared/dialogManager.js";

/**
 * Find other versions of the same model by modelId
 */
function findOtherModelVersions(modelId, currentHash) {
    const versions = [];
    
    // Search through all cached info for matching modelId
    for (const [hash, info] of Object.entries(cacheData.info)) {
        if (info.modelId === modelId) {
            // Find the file path for this hash
            let filePath = null;
            for (const [path, pathHash] of Object.entries(cacheData.hash)) {
                if (pathHash === hash) {
                    filePath = path;
                    break;
                }
            }
            
            if (filePath) {
                versions.push({
                    hash: hash,
                    info: info,
                    filePath: filePath
                });
            }
        }
    }
    
    // Sort versions by version ID or name
    versions.sort((a, b) => {
        const aId = a.info.id || 0;
        const bId = b.info.id || 0;
        if (aId !== bId) {
            return bId - aId; // Newer versions first (higher ID numbers)
        }
        
        const aName = a.info.name || '';
        const bName = b.info.name || '';
        return aName.localeCompare(bName);
    });
    
    return versions;
}

/**
 * Extract filename from a full file path
 */
function getFileNameFromPath(filePath) {
    if (!filePath) return 'Unknown';
    
    // Handle both forward and backward slashes
    const parts = filePath.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || filePath;
}

/**
 * Show edit dialog for model information
 */
async function showEditDialog(hash, info) {
    return new Promise((resolve) => {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        // Create dialog
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #2a2a2a;
            border: 1px solid #555;
            border-radius: 8px;
            padding: 20px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            color: #fff;
        `;

        // Create form HTML for editing
        dialog.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: #fff;">Edit Model Information</h3>
            <div style="display: grid; grid-template-columns: 120px 1fr; gap: 10px; align-items: start; margin-bottom: 20px;">
                <label style="font-weight: bold; padding-top: 5px;">Model Name:</label>
                <input type="text" id="edit-model-name" value="${escapeHtml((info.model && info.model.name) || '')}" style="padding: 8px; border: 1px solid #555; background: #333; color: #fff; border-radius: 4px;">
                
                <label style="font-weight: bold; padding-top: 5px;">Version Name:</label>
                <input type="text" id="edit-version-name" value="${escapeHtml(info.name || '')}" style="padding: 8px; border: 1px solid #555; background: #333; color: #fff; border-radius: 4px;">
                
                <label style="font-weight: bold; padding-top: 5px;">Description:</label>
                <textarea id="edit-description" rows="3" style="padding: 8px; border: 1px solid #555; background: #333; color: #fff; border-radius: 4px; resize: vertical;">${escapeHtml(info.description || '')}</textarea>
                
                <label style="font-weight: bold; padding-top: 5px;">Base Model:</label>
                <input type="text" id="edit-basemodel" value="${escapeHtml(info.baseModel || '')}" style="padding: 8px; border: 1px solid #555; background: #333; color: #fff; border-radius: 4px;">
                
                <label style="font-weight: bold; padding-top: 5px;">Keywords:</label>
                <textarea id="edit-keywords" rows="2" placeholder="comma-separated keywords" style="padding: 8px; border: 1px solid #555; background: #333; color: #fff; border-radius: 4px; resize: vertical;">${escapeHtml((info.trainedWords || []).join(', '))}</textarea>
                
                <label style="font-weight: bold; padding-top: 5px;">Type:</label>
                <select id="edit-type" style="padding: 8px; border: 1px solid #555; background: #333; color: #fff; border-radius: 4px;">
                    <option value="LORA" ${(info.model && info.model.type === 'LORA') || info.model_type === 'LORA' ? 'selected' : ''}>LoRA</option>
                    <option value="Checkpoint" ${(info.model && info.model.type === 'Checkpoint') || info.model_type === 'Checkpoint' ? 'selected' : ''}>Checkpoint</option>
                    <option value="TextualInversion" ${(info.model && info.model.type === 'TextualInversion') || info.model_type === 'TextualInversion' ? 'selected' : ''}>Textual Inversion</option>
                    <option value="Hypernetwork" ${(info.model && info.model.type === 'Hypernetwork') || info.model_type === 'Hypernetwork' ? 'selected' : ''}>Hypernetwork</option>
                    <option value="AestheticGradient" ${(info.model && info.model.type === 'AestheticGradient') || info.model_type === 'AestheticGradient' ? 'selected' : ''}>Aesthetic Gradient</option>
                    <option value="Controlnet" ${(info.model && info.model.type === 'Controlnet') || info.model_type === 'Controlnet' ? 'selected' : ''}>ControlNet</option>
                    <option value="Poses" ${(info.model && info.model.type === 'Poses') || info.model_type === 'Poses' ? 'selected' : ''}>Poses</option>
                    <option value="Other" ${(info.model && info.model.type === 'Other') || info.model_type === 'Other' ? 'selected' : ''}>Other</option>
                </select>
                
                <label style="font-weight: bold; padding-top: 5px;">External URL:</label>
                <input type="url" id="edit-url" value="${escapeHtml(info.external_url || '')}" placeholder="https://..." style="padding: 8px; border: 1px solid #555; background: #333; color: #fff; border-radius: 4px;">
                
                <label style="font-weight: bold; padding-top: 5px;">Notes:</label>
                <textarea id="edit-notes" rows="3" placeholder="Personal notes about this model" style="padding: 8px; border: 1px solid #555; background: #333; color: #fff; border-radius: 4px; resize: vertical;">${escapeHtml(info.notes || '')}</textarea>
                
                <label style="font-weight: bold; padding-top: 5px;">NSFW:</label>
                <select id="edit-nsfw" style="padding: 8px; border: 1px solid #555; background: #333; color: #fff; border-radius: 4px;">
                    <option value="false" ${!(info.model && info.model.nsfw) ? 'selected' : ''}>No</option>
                    <option value="true" ${(info.model && info.model.nsfw) ? 'selected' : ''}>Yes</option>
                </select>
                
                <label style="font-weight: bold; padding-top: 5px;">POI:</label>
                <select id="edit-poi" style="padding: 8px; border: 1px solid #555; background: #333; color: #fff; border-radius: 4px;">
                    <option value="false" ${!(info.model && info.model.poi) ? 'selected' : ''}>No</option>
                    <option value="true" ${(info.model && info.model.poi) ? 'selected' : ''}>Yes</option>
                </select>
                
                <label style="font-weight: bold; padding-top: 5px;">Civitai Blacklist:</label>
                <select id="edit-civitai-blacklist" style="padding: 8px; border: 1px solid #555; background: #333; color: #fff; border-radius: 4px;">
                    <option value="false" ${!info.civitai_blacklist ? 'selected' : ''}>No</option>
                    <option value="true" ${info.civitai_blacklist ? 'selected' : ''}>Yes</option>
                </select>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="edit-cancel" style="padding: 8px 16px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button id="edit-save" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Save</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Handle save button
        dialog.querySelector('#edit-save').addEventListener('click', async () => {
            try {
                // Collect form data
                const modelName = dialog.querySelector('#edit-model-name').value.trim();
                const versionName = dialog.querySelector('#edit-version-name').value.trim();
                const description = dialog.querySelector('#edit-description').value.trim();
                const baseModel = dialog.querySelector('#edit-basemodel').value.trim();
                const keywords = dialog.querySelector('#edit-keywords').value.trim();
                const type = dialog.querySelector('#edit-type').value;
                const externalUrl = dialog.querySelector('#edit-url').value.trim();
                const notes = dialog.querySelector('#edit-notes').value.trim();
                const nsfw = dialog.querySelector('#edit-nsfw').value === 'true';
                const poi = dialog.querySelector('#edit-poi').value === 'true';
                const civitaiBlacklist = dialog.querySelector('#edit-civitai-blacklist').value === 'true';

                // Process keywords into array
                const trainedWords = keywords ? keywords.split(',').map(k => k.trim()).filter(k => k.length > 0) : [];

                // Update the cache info
                const updatedInfo = { ...info };
                
                // Update basic fields
                if (versionName) updatedInfo.name = versionName;
                if (description) updatedInfo.description = description;
                if (baseModel) updatedInfo.baseModel = baseModel;
                if (trainedWords.length > 0) updatedInfo.trainedWords = trainedWords;
                if (externalUrl) updatedInfo.external_url = externalUrl;
                if (notes) updatedInfo.notes = notes;
                updatedInfo.civitai_blacklist = civitaiBlacklist;

                // Ensure model object exists and update it
                if (!updatedInfo.model) updatedInfo.model = {};
                updatedInfo.model.type = type;
                updatedInfo.model.nsfw = nsfw;
                updatedInfo.model.poi = poi;
                if (modelName) updatedInfo.model.name = modelName;

                // Send update to server
                const response = await api.fetchApi('/sage_utils/update_cache_info', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        hash: hash,
                        info: updatedInfo
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const updateResult = await response.json();
                
                if (updateResult.success) {
                    // Update local cache
                    cacheData.info[hash] = updatedInfo;
                    
                    // Close dialog and resolve with updated info
                    document.body.removeChild(overlay);
                    resolve(updatedInfo);
                } else {
                    throw new Error(updateResult.error || 'Unknown error occurred');
                }

            } catch (error) {
                console.error('Error updating cache info:', error);
                alert(`Failed to update model information: ${error.message}`);
            }
        });

        // Handle cancel button
        dialog.querySelector('#edit-cancel').addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(null);
        });

        // Handle clicking outside dialog
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
                resolve(null);
            }
        });

        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', handleEscape);
                resolve(null);
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}



/**
 * Fetch images for a model version from Civitai API
 */
async function fetchCivitaiImages(hash) {
    try {
        const response = await fetch(`https://civitai.com/api/v1/model-versions/by-hash/${hash}`);
        if (!response.ok) {
            console.error('Failed to fetch Civitai images:', response.status);
            return [];
        }
        const data = await response.json();
        return data.images || [];
    } catch (error) {
        console.error('Error fetching Civitai images:', error);
        return [];
    }
}

/**
 * Create image gallery section for a model
 */
async function createImageGallery(hash, showNsfw = false) {
    const images = await fetchCivitaiImages(hash);
    
    if (!images || images.length === 0) {
        return null;
    }

    // Filter images based on NSFW setting
    const filteredImages = images.filter(img => {
        const nsfwLevel = img.nsfwLevel || 0;
        return showNsfw || nsfwLevel <= 1; // Show SFW (0) and Soft (1) by default
    });

    if (filteredImages.length === 0) {
        return null;
    }

    const galleryContainer = document.createElement('div');
    galleryContainer.style.cssText = `
        margin-bottom: 12px;
    `;

    const galleryHeader = document.createElement('div');
    galleryHeader.innerHTML = `<strong style="color: #E91E63;">Model Images:</strong>`;
    galleryHeader.style.marginBottom = '8px';

    const imageGrid = document.createElement('div');
    imageGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 8px;
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid #444;
        border-radius: 4px;
        padding: 8px;
        background: #1a1a1a;
    `;

    filteredImages.forEach(img => {
        const imageContainer = document.createElement('div');
        imageContainer.style.cssText = `
            position: relative;
            cursor: pointer;
            border-radius: 4px;
            overflow: hidden;
            background: #333;
            aspect-ratio: 1;
        `;

        const image = document.createElement('img');
        image.src = img.url;
        image.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.2s;
        `;

        // Add NSFW overlay if needed
        if (img.nsfwLevel > 1) {
            const nsfwOverlay = document.createElement('div');
            nsfwOverlay.style.cssText = `
                position: absolute;
                top: 2px;
                right: 2px;
                background: #f44336;
                color: white;
                font-size: 8px;
                padding: 2px 4px;
                border-radius: 2px;
                font-weight: bold;
            `;
            nsfwOverlay.textContent = 'NSFW';
            imageContainer.appendChild(nsfwOverlay);
        }

        // Click to open full size
        imageContainer.addEventListener('click', () => {
            window.open(img.url, '_blank');
        });

        // Hover effect
        imageContainer.addEventListener('mouseenter', () => {
            image.style.transform = 'scale(1.05)';
        });

        imageContainer.addEventListener('mouseleave', () => {
            image.style.transform = 'scale(1)';
        });

        imageContainer.appendChild(image);
        imageGrid.appendChild(imageContainer);
    });

    galleryContainer.appendChild(galleryHeader);
    galleryContainer.appendChild(imageGrid);

    return galleryContainer;
}



/**
 * Create a styled information display for a cache entry
 */
async function createInfoDisplay(hash, info, showNsfw = false) {
    const container = document.createElement('div');
    container.style.cssText = `
        padding: 15px;
        background: #2a2a2a;
        border-radius: 8px;
        margin-top: 10px;
        font-family: monospace;
        font-size: 12px;
        line-height: 1.4;
        color: #e0e0e0;
    `;

    if (!info) {
        container.innerHTML = `
            <div style="color: #888; text-align: center; padding: 20px;">
                No information available for this file
            </div>
        `;
        return container;
    }

    // Create sections for different types of information
    const sections = [];

    // Basic file information
    if (hash) {
        sections.push(`
            <div style="margin-bottom: 12px;">
                <strong style="color: #4CAF50;">Hash:</strong><br>
                <span style="color: #81C784; word-break: break-all;">${hash}</span>
            </div>
        `);
    }

    // Model information
    if (info.model_name || info.base_model || info.model_type || (info.model && (info.model.name || info.model.type))) {
        let modelInfo = '<div style="margin-bottom: 12px;"><strong style="color: #2196F3;">Model Information:</strong><br>';
        
        // Check both old and new data structure
        const modelName = info.model_name || (info.model && info.model.name) || info.name;
        const baseModel = info.base_model || info.baseModel;
        const modelType = info.model_type || (info.model && info.model.type);
        
        if (modelName) modelInfo += `<span style="color: #64B5F6;">Name:</span> ${modelName}<br>`;
        if (baseModel) modelInfo += `<span style="color: #64B5F6;">Base Model:</span> ${baseModel}<br>`;
        if (modelType) modelInfo += `<span style="color: #64B5F6;">Type:</span> ${modelType}<br>`;
        modelInfo += '</div>';
        sections.push(modelInfo);
    }

    // File details
    if (info.file_size || info.file_path) {
        let fileInfo = '<div style="margin-bottom: 12px;"><strong style="color: #FF9800;">File Details:</strong><br>';
        if (info.file_path) fileInfo += `<span style="color: #FFB74D;">Path:</span> ${info.file_path}<br>`;
        if (info.file_size) {
            const sizeInMB = (info.file_size / (1024 * 1024)).toFixed(2);
            fileInfo += `<span style="color: #FFB74D;">Size:</span> ${sizeInMB} MB<br>`;
        }
        fileInfo += '</div>';
        sections.push(fileInfo);
    }

    // Civitai information
    if (info.id || info.modelId || info.downloadUrl || info.update_available) {
        let civitaiInfo = '<div style="margin-bottom: 12px;"><strong style="color: #9C27B0;">Civitai Information:</strong><br>';
        if (info.id) civitaiInfo += `<span style="color: #BA68C8;">Version ID:</span> ${info.id}<br>`;
        if (info.modelId) civitaiInfo += `<span style="color: #BA68C8;">Model ID:</span> ${info.modelId}<br>`;
        
        // Show current version link if we have model_id and version_id
        if (info.modelId && info.id) {
            const currentUrl = `https://civitai.com/models/${info.modelId}?modelVersionId=${info.id}`;
            civitaiInfo += `<span style="color: #BA68C8;">Current Version:</span> <a href="${currentUrl}" style="color: #CE93D8;" target="_blank">View on Civitai</a><br>`;
        }
        
        // Show updated version link if available
        if (info.update_available && info.update_version_id && info.modelId) {
            const updateUrl = `https://civitai.com/models/${info.modelId}?modelVersionId=${info.update_version_id}`;
            civitaiInfo += `<span style="color: #FF9800;">Updated Version:</span> <a href="${updateUrl}" style="color: #FFB74D;" target="_blank">🔗 New Version Available</a><br>`;
        }
        
        if (info.downloadUrl) civitaiInfo += `<span style="color: #BA68C8;">Download URL:</span> <a href="${info.downloadUrl}" style="color: #CE93D8;" target="_blank">Link</a><br>`;
        civitaiInfo += '</div>';
        sections.push(civitaiInfo);
    }

    // Timestamps
    if (info.created_at || info.updated_at || info.last_accessed || info.lastUsed) {
        let timeInfo = '<div style="margin-bottom: 12px;"><strong style="color: #607D8B;">Timestamps:</strong><br>';
        if (info.created_at) timeInfo += `<span style="color: #90A4AE;">Created:</span> ${new Date(info.created_at).toLocaleString()}<br>`;
        if (info.updated_at) timeInfo += `<span style="color: #90A4AE;">Updated:</span> ${new Date(info.updated_at).toLocaleString()}<br>`;
        if (info.last_accessed) timeInfo += `<span style="color: #90A4AE;">Last Accessed:</span> ${new Date(info.last_accessed).toLocaleString()}<br>`;
        if (info.lastUsed) timeInfo += `<span style="color: #90A4AE;">Last Used:</span> ${new Date(info.lastUsed).toLocaleString()}<br>`;
        timeInfo += '</div>';
        sections.push(timeInfo);
    }

    // Other versions of this model
    if (info.modelId) {
        const otherVersions = findOtherModelVersions(info.modelId, hash);
        if (otherVersions.length > 0) {
            let versionsInfo = '<div style="margin-bottom: 12px;"><strong style="color: #00BCD4;">Other Versions:</strong><br>';
            otherVersions.forEach(version => {
                const fileName = getFileNameFromPath(version.filePath);
                const isCurrentVersion = version.hash === hash;
                const versionName = version.info.name || version.info.id || 'Unknown';
                const versionId = version.info.id || 'N/A';
                
                versionsInfo += `<div style="margin: 4px 0; padding: 4px; ${isCurrentVersion ? 'background: #333; border-left: 3px solid #00BCD4;' : 'background: #1a1a1a;'} border-radius: 3px;">`;
                versionsInfo += `<span style="color: #81D4FA;">Version:</span> ${versionName}<br>`;
                versionsInfo += `<span style="color: #81D4FA;">ID:</span> ${versionId}<br>`;
                versionsInfo += `<span style="color: #81D4FA;">File:</span> <span style="font-size: 11px; color: #B0BEC5;">${fileName}</span>`;
                if (isCurrentVersion) {
                    versionsInfo += '<br><span style="color: #00E676; font-size: 10px; font-weight: bold;">◄ CURRENT</span>';
                }
                versionsInfo += '</div>';
            });
            versionsInfo += '</div>';
            sections.push(versionsInfo);
        }
    }

    // Additional metadata
    const metadataKeys = Object.keys(info).filter(key => 
        !['model_name', 'base_model', 'model_type', 'file_size', 'file_path', 'id', 'modelId', 'downloadUrl', 'update_available', 'update_version_id', 'created_at', 'updated_at', 'last_accessed', 'lastUsed', 'model', 'name', 'baseModel'].includes(key)
    );

    if (metadataKeys.length > 0) {
        let metadataInfo = '<div style="margin-bottom: 12px;"><strong style="color: #795548;">Additional Metadata:</strong><br>';
        metadataKeys.forEach(key => {
            const value = info[key];
            if (value !== null && value !== undefined && value !== '') {
                metadataInfo += `<span style="color: #A1887F;">${key}:</span> ${JSON.stringify(value)}<br>`;
            }
        });
        metadataInfo += '</div>';
        sections.push(metadataInfo);
    }

    // Add sections to container first
    container.innerHTML = sections.join('');

    // Add image gallery if we have Civitai data
    if (info.id || info.modelId) {
        try {
            const imageGallery = await createImageGallery(hash, showNsfw);
            if (imageGallery) {
                container.appendChild(imageGallery);
            }
        } catch (error) {
            console.error('Error creating image gallery:', error);
        }
    }

    return container;
}

/**
 * Create the main cache sidebar content
 */
function createCacheSidebar(el) {
    const container = document.createElement('div');
    container.style.cssText = `
        padding: 10px;
        height: 100%;
        overflow-y: auto;
        background: #1e1e1e;
        color: #ffffff;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid #444;
    `;
    header.innerHTML = `
        <h3 style="margin: 0; color: #ffffff; font-size: 16px;">SageUtils Cache Browser</h3>
        <p style="margin: 5px 0 0 0; color: #aaa; font-size: 12px;">Browse cached files and their metadata</p>
    `;

    // Filter dropdown
    const filterContainer = document.createElement('div');
    filterContainer.style.marginBottom = '10px';

    const filterLabel = document.createElement('label');
    filterLabel.textContent = 'Filter by Type:';
    filterLabel.style.cssText = `
        display: block;
        margin-bottom: 5px;
        color: #ffffff;
        font-size: 13px;
        font-weight: bold;
    `;

    const filterSelector = document.createElement('select');
    filterSelector.style.cssText = `
        width: 100%;
        padding: 8px;
        background: #333;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        font-size: 12px;
        margin-bottom: 10px;
    `;

    // Populate filter options
    filterSelector.innerHTML = `
        <option value="all">All Models</option>
        <option value="Checkpoint">Checkpoints Only</option>
        <option value="LORA">LoRAs Only</option>
    `;

    // Search filter
    const searchContainer = document.createElement('div');
    searchContainer.style.marginBottom = '10px';

    const searchLabel = document.createElement('label');
    searchLabel.textContent = 'Search Models:';
    searchLabel.style.cssText = `
        display: block;
        margin-bottom: 5px;
        color: #ffffff;
        font-size: 13px;
        font-weight: bold;
    `;

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Type to search...';
    searchInput.style.cssText = `
        width: 100%;
        padding: 8px;
        background: #333;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        font-size: 12px;
        margin-bottom: 10px;
        box-sizing: border-box;
    `;

    searchContainer.appendChild(searchLabel);
    searchContainer.appendChild(searchInput);

    // Last Used filter
    const lastUsedContainer = document.createElement('div');
    lastUsedContainer.style.marginBottom = '10px';

    const lastUsedLabel = document.createElement('label');
    lastUsedLabel.textContent = 'Filter by Last Used:';
    lastUsedLabel.style.cssText = `
        display: block;
        margin-bottom: 5px;
        color: #ffffff;
        font-size: 13px;
        font-weight: bold;
    `;

    const lastUsedSelector = document.createElement('select');
    lastUsedSelector.style.cssText = `
        width: 100%;
        padding: 8px;
        background: #333;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        font-size: 12px;
        margin-bottom: 10px;
    `;

    // Populate last used options
    lastUsedSelector.innerHTML = `
        <option value="all">All Models</option>
        <option value="today">Used Today</option>
        <option value="week">Used This Week</option>
        <option value="month">Used This Month</option>
        <option value="never">Never Used</option>
    `;

    lastUsedContainer.appendChild(lastUsedLabel);
    lastUsedContainer.appendChild(lastUsedSelector);

    // Update Available filter
    const updateContainer = document.createElement('div');
    updateContainer.style.marginBottom = '10px';

    const updateLabel = document.createElement('label');
    updateLabel.textContent = 'Filter by Updates:';
    updateLabel.style.cssText = `
        display: block;
        margin-bottom: 5px;
        color: #ffffff;
        font-size: 13px;
        font-weight: bold;
    `;

    const updateSelector = document.createElement('select');
    updateSelector.style.cssText = `
        width: 100%;
        padding: 8px;
        background: #333;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        font-size: 12px;
        margin-bottom: 10px;
    `;

    // Populate update options
    updateSelector.innerHTML = `
        <option value="all">All Models</option>
        <option value="available">Updates Available</option>
        <option value="none">No Updates Available</option>
    `;

    updateContainer.appendChild(updateLabel);
    updateContainer.appendChild(updateSelector);

    // Sort options
    const sortContainer = document.createElement('div');
    sortContainer.style.marginBottom = '10px';

    const sortLabel = document.createElement('label');
    sortLabel.textContent = 'Sort by:';
    sortLabel.style.cssText = `
        display: block;
        margin-bottom: 5px;
        color: #ffffff;
        font-size: 13px;
        font-weight: bold;
    `;

    const sortSelector = document.createElement('select');
    sortSelector.style.cssText = `
        width: 100%;
        padding: 8px;
        background: #333;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        font-size: 12px;
        margin-bottom: 10px;
    `;

    // Populate sort options
    sortSelector.innerHTML = `
        <option value="name">Name (A-Z)</option>
        <option value="name-desc">Name (Z-A)</option>
        <option value="lastused">Last Used (Recent First)</option>
        <option value="lastused-desc">Last Used (Oldest First)</option>
        <option value="size">File Size (Small to Large)</option>
        <option value="size-desc">File Size (Large to Small)</option>
        <option value="type">Type</option>
    `;

    sortContainer.appendChild(sortLabel);
    sortContainer.appendChild(sortSelector);

    // NSFW toggle
    const nsfwContainer = document.createElement('div');
    nsfwContainer.style.cssText = `
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 8px;
    `;

    const nsfwCheckbox = document.createElement('input');
    nsfwCheckbox.type = 'checkbox';
    nsfwCheckbox.id = 'nsfw-toggle';
    nsfwCheckbox.style.cssText = `
        margin: 0;
        transform: scale(1.2);
    `;

    const nsfwLabel = document.createElement('label');
    nsfwLabel.htmlFor = 'nsfw-toggle';
    nsfwLabel.textContent = 'Show NSFW Images';
    nsfwLabel.style.cssText = `
        color: #ffffff;
        font-size: 13px;
        font-weight: bold;
        cursor: pointer;
        user-select: none;
    `;

    nsfwContainer.appendChild(nsfwCheckbox);
    nsfwContainer.appendChild(nsfwLabel);

    // File selector dropdown
    const selectorContainer = document.createElement('div');
    selectorContainer.style.marginBottom = '15px';

    const selectorLabel = document.createElement('label');
    selectorLabel.textContent = 'Select File:';
    selectorLabel.style.cssText = `
        display: block;
        margin-bottom: 5px;
        color: #ffffff;
        font-size: 13px;
        font-weight: bold;
    `;

    // Create custom dropdown container
    const selector = document.createElement('div');
    selector.style.cssText = `
        position: relative;
        width: 100%;
    `;
    selector.id = 'cache-file-selector';
    
    // Create dropdown button
    const dropdownButton = document.createElement('div');
    dropdownButton.style.cssText = `
        width: 100%;
        padding: 8px;
        background: #333;
        color: #fff;
        border: 1px solid #555;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        user-select: none;
    `;
    dropdownButton.innerHTML = '<span>Select a file...</span><span>▼</span>';
    
    // Create dropdown menu
    const dropdownMenu = document.createElement('div');
    dropdownMenu.style.cssText = `
        position: fixed;
        background: #333;
        border: 1px solid #555;
        border-top: none;
        border-radius: 0 0 4px 4px;
        max-height: 600px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
        box-shadow: 2px 2px 8px rgba(0,0,0,0.3);
    `;
    
    // Add CSS for custom dropdown
    const style = document.createElement('style');
    style.textContent = `
        .cache-dropdown-item {
            padding: 6px 10px;
            cursor: pointer;
            position: relative;
            border-bottom: 1px solid #444;
            font-size: 11px;
        }
        .cache-dropdown-item:hover {
            background: #444;
        }
        .cache-dropdown-item.folder {
            background: #383838;
            font-weight: bold;
        }
        .cache-dropdown-item.folder:hover {
            background: #484848;
        }
        .cache-dropdown-item.folder::after {
            content: "▶";
            float: right;
        }
        .cache-dropdown-submenu {
            position: fixed;
            background: #333;
            border: 1px solid #555;
            border-radius: 4px;
            min-width: 250px;
            max-height: 300px;
            overflow-y: auto;
            z-index: 1001;
            display: none;
            box-shadow: 2px 2px 8px rgba(0,0,0,0.3);
        }
        .cache-dropdown-item.file {
            color: #e0e0e0;
        }
        .cache-dropdown-item.selected {
            background: #4CAF50;
        }
    `;
    document.head.appendChild(style);
    
    selector.appendChild(dropdownButton);
    // Append dropdown menu to body to avoid container constraints
    document.body.appendChild(dropdownMenu);
    
    let selectedHash = null;
    let isDropdownOpen = false;

    // Refresh button
    const refreshButton = document.createElement('button');
    refreshButton.textContent = '↻ Refresh';
    refreshButton.style.cssText = `
        margin-top: 8px;
        margin-right: 8px;
        padding: 6px 12px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;

    // Pull metadata button
    const pullButton = document.createElement('button');
    pullButton.textContent = '⬇ Pull';
    pullButton.style.cssText = `
        margin-top: 8px;
        padding: 6px 12px;
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;
    pullButton.disabled = true; // Initially disabled until a file is selected
    pullButton.style.opacity = '0.5';

    // Edit button
    const editButton = document.createElement('button');
    editButton.textContent = '✏ Edit';
    editButton.style.cssText = `
        margin-top: 8px;
        padding: 6px 12px;
        background: #FF9800;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;
    editButton.disabled = true; // Initially disabled until a file is selected
    editButton.style.opacity = '0.5';

    // Scan button
    const scanButton = document.createElement('button');
    scanButton.textContent = '🔍 Scan All';
    scanButton.style.cssText = `
        margin-top: 8px;
        padding: 6px 12px;
        background: #9C27B0;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;

    // Report button
    const reportButton = document.createElement('button');
    reportButton.textContent = '📊 Generate Report';
    reportButton.style.cssText = `
        margin-top: 8px;
        padding: 6px 12px;
        background: #673AB7;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    `;

    // Progress bar container (initially hidden)
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
        margin-top: 10px;
        display: none;
    `;

    const progressLabel = document.createElement('div');
    progressLabel.style.cssText = `
        color: #fff;
        font-size: 12px;
        margin-bottom: 5px;
    `;
    progressLabel.textContent = 'Scanning models...';

    const progressBarOuter = document.createElement('div');
    progressBarOuter.style.cssText = `
        width: 100%;
        height: 20px;
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        overflow: hidden;
    `;

    const progressBarInner = document.createElement('div');
    progressBarInner.style.cssText = `
        height: 100%;
        background: linear-gradient(90deg, #9C27B0, #E91E63);
        width: 0%;
        transition: width 0.3s ease;
        position: relative;
    `;

    const progressText = document.createElement('div');
    progressText.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 11px;
        font-weight: bold;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
    `;
    progressText.textContent = '0%';

    progressBarInner.appendChild(progressText);
    progressBarOuter.appendChild(progressBarInner);
    progressContainer.appendChild(progressLabel);
    progressContainer.appendChild(progressBarOuter);

    // Info display area
    const infoDisplay = document.createElement('div');
    infoDisplay.id = 'cache-info-display';

    // Loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.style.cssText = `
        text-align: center;
        padding: 20px;
        color: #888;
        font-style: italic;
    `;
    loadingIndicator.textContent = 'Loading cache data...';

    // Populate dropdown with files
    async function updateFileList() {
        try {
            loadingIndicator.textContent = 'Loading cache data...';
            infoDisplay.innerHTML = '';
            infoDisplay.appendChild(loadingIndicator);

            // Clean up any existing submenus
            document.querySelectorAll('.cache-dropdown-submenu').forEach(menu => {
                menu.remove();
            });

            // Fetch both hash and info data
            const [hashData, infoData] = await Promise.all([
                fetchCacheHash(),
                fetchCacheInfo()
            ]);

            // Clear and populate dropdown menu
            dropdownMenu.innerHTML = '';
            dropdownButton.innerHTML = '<span>Select a file...</span><span>▼</span>';
            selectedHash = null;

            // Get current filter values
            const filterType = filterSelector.value;
            const searchTerm = searchInput.value.toLowerCase().trim();
            const lastUsedFilter = lastUsedSelector.value;
            const updateFilter = updateSelector.value;

            // Calculate date thresholds for last used filter
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

            // Filter files based on model type, search term, last used, and updates
            const filteredFiles = Object.keys(hashData).filter(filePath => {
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
                    if (!searchableText.includes(searchTerm)) {
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
                
                // Check update filter
                if (updateFilter !== 'all') {
                    const hasUpdate = info && info.update_available;
                    
                    if (updateFilter === 'available') {
                        // Show only models with updates available
                        if (!hasUpdate) {
                            return false;
                        }
                    } else if (updateFilter === 'none') {
                        // Show only models without updates available
                        if (hasUpdate) {
                            return false;
                        }
                    }
                }
                
                return true;
            });

            // Function to sort files based on selected criteria
            function sortFiles(files, sortBy) {
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

            const sortBy = sortSelector.value;
            const sortedFiles = sortFiles(filteredFiles, sortBy);
            
            if (sortedFiles.length === 0) {
                const filterText = filterType === 'all' ? 'cached files' : `${filterType.toLowerCase()}s`;
                const noFilesItem = document.createElement('div');
                noFilesItem.className = 'cache-dropdown-item';
                noFilesItem.textContent = `No ${filterText} found`;
                noFilesItem.style.color = '#888';
                dropdownMenu.appendChild(noFilesItem);
                infoDisplay.innerHTML = `<div style="text-align: center; padding: 20px; color: #888;">No ${filterText} available</div>`;
                return;
            }

            // Organize files into folder structure
            const folderStructure = {};
            
            sortedFiles.forEach(filePath => {
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
            
            // Helper function to create file item
            function createFileItem(file) {
                const item = document.createElement('div');
                item.className = 'cache-dropdown-item file';
                item.dataset.hash = file.hash;
                
                let displayName = file.fileName;
                if (file.info && file.info.model && file.info.model.type) {
                    displayName += ` [${file.info.model.type}]`;
                }
                
                item.textContent = displayName;
                item.title = file.fullPath;
                
                item.addEventListener('click', async () => {
                    selectedHash = file.hash;
                    dropdownButton.innerHTML = `<span>${displayName}</span><span>▼</span>`;
                    dropdownMenu.style.display = 'none';
                    isDropdownOpen = false;
                    
                    // Enable buttons when a file is selected
                    pullButton.disabled = false;
                    pullButton.style.opacity = '1';
                    editButton.disabled = false;
                    editButton.style.opacity = '1';
                    
                    // Show loading while creating info display
                    infoDisplay.innerHTML = '<div style="text-align: center; padding: 20px; color: #888; font-style: italic;">Loading model information...</div>';
                    
                    // Update info display
                    const selectedInfo = cacheData.info[selectedHash];
                    const showNsfw = nsfwCheckbox.checked;
                    const infoElement = await createInfoDisplay(selectedHash, selectedInfo, showNsfw);
                    infoDisplay.innerHTML = '';
                    infoDisplay.appendChild(infoElement);
                });
                
                return item;
            }
            
            // Helper function to create submenu
            function createSubmenu(files) {
                const submenu = document.createElement('div');
                submenu.className = 'cache-dropdown-submenu';
                
                // Sort files within the submenu using the same criteria
                const sortedSubFiles = files.map(file => file.fullPath);
                const sortedSubFilePaths = sortFiles(sortedSubFiles, sortBy);
                
                // Create a map for quick lookup
                const fileMap = new Map();
                files.forEach(file => fileMap.set(file.fullPath, file));
                
                // Add files in sorted order
                sortedSubFilePaths.forEach(filePath => {
                    const file = fileMap.get(filePath);
                    if (file) {
                        submenu.appendChild(createFileItem(file));
                    }
                });
                
                return submenu;
            }
            
            // Sort folders and create dropdown items
            const sortedFolders = Object.keys(folderStructure).sort((a, b) => {
                // Empty folder (root files) should come first
                if (a === '') return -1;
                if (b === '') return 1;
                return a.localeCompare(b);
            });
            
            // Add root files first
            if (folderStructure['']) {
                // Sort root files using the same criteria
                const rootFiles = folderStructure[''];
                const rootFilePaths = rootFiles.map(file => file.fullPath);
                const sortedRootFilePaths = sortFiles(rootFilePaths, sortBy);
                
                // Create a map for quick lookup
                const rootFileMap = new Map();
                rootFiles.forEach(file => rootFileMap.set(file.fullPath, file));
                
                // Add files in sorted order
                sortedRootFilePaths.forEach(filePath => {
                    const file = rootFileMap.get(filePath);
                    if (file) {
                        dropdownMenu.appendChild(createFileItem(file));
                    }
                });
            }
            
            // Add folders with submenus
            sortedFolders.forEach(folderPath => {
                if (folderPath === '') return; // Skip root files, already added
                
                const files = folderStructure[folderPath];
                const folderItem = document.createElement('div');
                folderItem.className = 'cache-dropdown-item folder';
                folderItem.textContent = folderPath;
                
                const submenu = createSubmenu(files);
                // Append submenu to document body instead of folder item to avoid clipping
                document.body.appendChild(submenu);
                
                let submenuTimeout;
                
                // Show submenu on hover with slight delay
                folderItem.addEventListener('mouseenter', (e) => {
                    // Clear any existing timeout
                    clearTimeout(submenuTimeout);
                    
                    // Hide all other submenus first
                    document.querySelectorAll('.cache-dropdown-submenu').forEach(menu => {
                        if (menu !== submenu) {
                            menu.style.display = 'none';
                        }
                    });
                    
                    // Position submenu next to the folder item
                    const rect = folderItem.getBoundingClientRect();
                    submenu.style.left = `${rect.right + 5}px`;
                    submenu.style.top = `${rect.top}px`;
                    
                    // Show this submenu
                    submenu.style.display = 'block';
                });
                
                // Keep submenu open when hovering over the submenu itself
                submenu.addEventListener('mouseenter', () => {
                    clearTimeout(submenuTimeout);
                    submenu.style.display = 'block';
                });
                
                // Hide submenu when leaving both folder and submenu
                folderItem.addEventListener('mouseleave', (e) => {
                    submenuTimeout = setTimeout(() => {
                        submenu.style.display = 'none';
                    }, 150);
                });
                
                submenu.addEventListener('mouseleave', (e) => {
                    submenuTimeout = setTimeout(() => {
                        submenu.style.display = 'none';
                    }, 150);
                });
                
                // Re-enter submenu cancels the hide timeout
                submenu.addEventListener('mouseenter', () => {
                    clearTimeout(submenuTimeout);
                });
                
                // Re-enter folder cancels the hide timeout
                folderItem.addEventListener('mouseenter', () => {
                    clearTimeout(submenuTimeout);
                });
                
                // Click handling for folders
                folderItem.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    // Hide all other submenus
                    document.querySelectorAll('.cache-dropdown-submenu').forEach(menu => {
                        if (menu !== submenu) {
                            menu.style.display = 'none';
                        }
                    });
                    
                    // Toggle this submenu
                    if (submenu.style.display === 'block') {
                        submenu.style.display = 'none';
                    } else {
                        // Position submenu next to the folder item
                        const rect = folderItem.getBoundingClientRect();
                        submenu.style.left = `${rect.right + 5}px`;
                        submenu.style.top = `${rect.top}px`;
                        submenu.style.display = 'block';
                    }
                });
                
                dropdownMenu.appendChild(folderItem);
            });

            infoDisplay.innerHTML = '<div style="text-align: center; padding: 20px; color: #888;">Select a file to view its information</div>';

        } catch (error) {
            console.error('Error updating file list:', error);
            selector.innerHTML = '<option value="">Error loading files</option>';
            infoDisplay.innerHTML = '<div style="text-align: center; padding: 20px; color: #f44336;">Error loading cache data</div>';
        }
    }

    // Handle dropdown button click
    dropdownButton.addEventListener('click', () => {
        isDropdownOpen = !isDropdownOpen;
        
        if (isDropdownOpen) {
            // Position dropdown menu dynamically
            const rect = dropdownButton.getBoundingClientRect();
            dropdownMenu.style.left = `${rect.left}px`;
            dropdownMenu.style.top = `${rect.bottom}px`;
            dropdownMenu.style.width = `${rect.width}px`;
            dropdownMenu.style.display = 'block';
            dropdownButton.innerHTML = '<span>Select a file...</span><span>▲</span>';
        } else {
            dropdownMenu.style.display = 'none';
            dropdownButton.innerHTML = '<span>Select a file...</span><span>▼</span>';
            
            // Hide all submenus when closing dropdown
            document.querySelectorAll('.cache-dropdown-submenu').forEach(menu => {
                menu.style.display = 'none';
            });
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!selector.contains(e.target) && !dropdownMenu.contains(e.target) && isDropdownOpen) {
            dropdownMenu.style.display = 'none';
            isDropdownOpen = false;
            dropdownButton.innerHTML = selectedHash ? 
                dropdownButton.innerHTML.replace('▲', '▼') : 
                '<span>Select a file...</span><span>▼</span>';
                
            // Hide all submenus when closing dropdown
            document.querySelectorAll('.cache-dropdown-submenu').forEach(menu => {
                menu.style.display = 'none';
            });
        }
    });

    // Function to pull metadata for selected file
    async function pullMetadata() {
        if (!selectedHash) {
            console.error('No file selected for metadata pull');
            return;
        }

        try {
            // Find the file path for the selected hash
            let selectedFilePath = null;
            for (const [filePath, hash] of Object.entries(cacheData.hash)) {
                if (hash === selectedHash) {
                    selectedFilePath = filePath;
                    break;
                }
            }

            if (!selectedFilePath) {
                console.error('Could not find file path for selected hash');
                return;
            }

            // Disable pull button and show loading state
            pullButton.disabled = true;
            pullButton.style.opacity = '0.5';
            pullButton.textContent = '⬇ Pulling...';

            // Show loading in info display
            infoDisplay.innerHTML = '<div style="text-align: center; padding: 20px; color: #888; font-style: italic;">Pulling metadata...</div>';

            // Call the pull_metadata API endpoint
            const response = await api.fetchApi('/sage_utils/pull_metadata', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    file_path: selectedFilePath,
                    force: true
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                // Refresh cache data to get updated information
                const [hashData, infoData] = await Promise.all([
                    fetchCacheHash(),
                    fetchCacheInfo()
                ]);
                
                cacheData.hash = hashData;
                cacheData.info = infoData;

                // Update info display with new data
                const updatedInfo = cacheData.info[selectedHash];
                const showNsfw = nsfwCheckbox.checked;
                const infoElement = await createInfoDisplay(selectedHash, updatedInfo, showNsfw);
                infoDisplay.innerHTML = '';
                infoDisplay.appendChild(infoElement);
                
                console.log('Metadata pulled successfully');
            } else {
                throw new Error(result.error || 'Unknown error occurred');
            }

        } catch (error) {
            console.error('Error pulling metadata:', error);
            infoDisplay.innerHTML = `<div style="text-align: center; padding: 20px; color: #f44336;">Error pulling metadata: ${error.message}</div>`;
        } finally {
            // Re-enable pull button
            pullButton.disabled = false;
            pullButton.style.opacity = '1';
            pullButton.textContent = '⬇ Pull';
        }
    }

    // Function to generate HTML report
    async function generateHtmlReport() {
        try {
            // Get current filtered files
            const [hashData, infoData] = await Promise.all([
                fetchCacheHash(),
                fetchCacheInfo()
            ]);

            // Apply same filtering logic as updateFileList
            const filterType = filterSelector.value;
            const searchTerm = searchInput.value.toLowerCase().trim();
            const lastUsedFilter = lastUsedSelector.value;
            const updateFilter = updateSelector.value;

            // Calculate date thresholds for last used filter
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

            const filteredFiles = Object.keys(hashData).filter(filePath => {
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
                    if (!searchableText.includes(searchTerm)) {
                        return false;
                    }
                }
                
                // Check last used filter
                if (lastUsedFilter !== 'all') {
                    const lastUsed = info && (info.lastUsed || info.last_accessed);
                    
                    if (lastUsedFilter === 'never') {
                        if (lastUsed) {
                            return false;
                        }
                    } else {
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
                
                // Check update filter
                if (updateFilter !== 'all') {
                    const hasUpdate = info && info.update_available;
                    
                    if (updateFilter === 'available') {
                        // Show only models with updates available
                        if (!hasUpdate) {
                            return false;
                        }
                    } else if (updateFilter === 'none') {
                        // Show only models without updates available
                        if (hasUpdate) {
                            return false;
                        }
                    }
                }
                
                return true;
            });

            // Sort files based on selected criteria
            function sortFiles(files, sortBy) {
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

            const sortBy = sortSelector.value;
            const sortedFiles = sortFiles(filteredFiles, sortBy);

            if (sortedFiles.length === 0) {
                alert('No models found to include in report with current filters.');
                return;
            }

            // Group files by model type
            const checkpoints = [];
            const loras = [];

            sortedFiles.forEach(filePath => {
                const hash = hashData[filePath];
                const info = infoData[hash];
                const modelType = info && info.model && info.model.type;
                
                if (modelType === 'Checkpoint') {
                    checkpoints.push({ filePath, hash, info });
                } else if (modelType === 'LORA' || modelType === 'LoCon') {
                    loras.push({ filePath, hash, info });
                }
            });

            // Generate complete HTML using shared module
            const filterDescription = filterType === 'all' ? 'All Models' : `${filterType}s Only`;
            const searchDescription = searchTerm ? ` (Search: "${searchTerm}")` : '';
            const lastUsedDescription = lastUsedFilter !== 'all' ? ` (Last Used: ${lastUsedFilter})` : '';
            const sortDescription = ` (Sorted by: ${sortSelector.options[sortSelector.selectedIndex].text})`;

            const htmlContent = generateHtmlContent({
                sortedFiles,
                checkpoints,
                loras,
                filterDescription,
                searchDescription,
                lastUsedDescription,
                sortDescription
            });

            // Open report using shared module
            const currentDateTime = new Date().toLocaleString();
            openHtmlReport(htmlContent, `SageUtils Model Report - ${currentDateTime}`);

        } catch (error) {
            console.error('Error generating HTML report:', error);
            alert(`Error generating report: ${error.message}`);
        }
    }

    // Function to edit model information
    async function editModelInfo() {
        if (!selectedHash) {
            console.error('No file selected for editing');
            return;
        }

        try {
            const currentInfo = cacheData.info[selectedHash];
            const updatedInfo = await showEditDialog(selectedHash, currentInfo);

            if (updatedInfo) {
                // Show loading while updating info display
                infoDisplay.innerHTML = '<div style="text-align: center; padding: 20px; color: #888; font-style: italic;">Updating display...</div>';

                // Update info display with new data
                const showNsfw = nsfwCheckbox.checked;
                const infoElement = await createInfoDisplay(selectedHash, updatedInfo, showNsfw);
                infoDisplay.innerHTML = '';
                infoDisplay.appendChild(infoElement);

                console.log('Model information updated successfully');
            }

        } catch (error) {
            console.error('Error editing model info:', error);
            infoDisplay.innerHTML = `<div style="text-align: center; padding: 20px; color: #f44336;">Error editing model info: ${error.message}</div>`;
        }
    }

    // Function to scan all filtered models for metadata
    async function scanAllModels() {
        try {
            // Get current filtered files
            const [hashData, infoData] = await Promise.all([
                fetchCacheHash(),
                fetchCacheInfo()
            ]);

            // Apply same filtering logic as updateFileList
            const filterType = filterSelector.value;
            const searchTerm = searchInput.value.toLowerCase().trim();
            const lastUsedFilter = lastUsedSelector.value;
            const updateFilter = updateSelector.value;

            // Calculate date thresholds for last used filter
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

            const filteredFiles = Object.keys(hashData).filter(filePath => {
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
                    if (!searchableText.includes(searchTerm)) {
                        return false;
                    }
                }
                
                // Check last used filter
                if (lastUsedFilter !== 'all') {
                    const lastUsed = info && (info.lastUsed || info.last_accessed);
                    
                    if (lastUsedFilter === 'never') {
                        if (lastUsed) {
                            return false;
                        }
                    } else {
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
                
                // Check update filter
                if (updateFilter !== 'all') {
                    const hasUpdate = info && info.update_available;
                    
                    if (updateFilter === 'available') {
                        // Show only models with updates available
                        if (!hasUpdate) {
                            return false;
                        }
                    } else if (updateFilter === 'none') {
                        // Show only models without updates available
                        if (hasUpdate) {
                            return false;
                        }
                    }
                }
                
                return true;
            });

            if (filteredFiles.length === 0) {
                alert('No models found to scan with current filters.');
                return;
            }

            // Show progress bar and disable scan button
            progressContainer.style.display = 'block';
            scanButton.disabled = true;
            scanButton.style.opacity = '0.5';
            scanButton.textContent = '🔍 Scanning...';

            let completed = 0;
            let errors = 0;
            const total = filteredFiles.length;

            // Update progress
            function updateProgress() {
                const percentage = Math.round((completed / total) * 100);
                progressBarInner.style.width = `${percentage}%`;
                progressText.textContent = `${percentage}%`;
                progressLabel.textContent = `Scanning models... ${completed}/${total} (${errors} errors)`;
            }

            updateProgress();

            // Process files with rate limiting (1 request per 2 seconds to be respectful)
            for (let i = 0; i < filteredFiles.length; i++) {
                const filePath = filteredFiles[i];
                
                try {
                    // Check if file has civitai_blacklist flag
                    const hash = hashData[filePath];
                    const info = infoData[hash];
                    if (info && info.civitai_blacklist) {
                        console.log(`Skipping blacklisted file: ${filePath}`);
                        completed++;
                        updateProgress();
                        continue;
                    }

                    // Call the pull_metadata API endpoint
                    const response = await api.fetchApi('/sage_utils/pull_metadata', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            file_path: filePath,
                            force: false // Don't force recheck to avoid unnecessary API calls
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const result = await response.json();
                    if (!result.success) {
                        throw new Error(result.error || 'Unknown error occurred');
                    }

                    console.log(`Successfully processed: ${filePath}`);

                } catch (error) {
                    console.error(`Error processing ${filePath}:`, error);
                    errors++;
                }

                completed++;
                updateProgress();

                // Rate limiting: wait 2 seconds between requests (except for the last one)
                if (i < filteredFiles.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            // Refresh cache data and file list when done
            await updateFileList();

            // Show completion message
            progressLabel.textContent = `Scan complete! Processed ${completed}/${total} models (${errors} errors)`;
            
            // Hide progress bar after 3 seconds
            setTimeout(() => {
                progressContainer.style.display = 'none';
            }, 3000);

        } catch (error) {
            console.error('Error during scan:', error);
            progressLabel.textContent = `Scan failed: ${error.message}`;
        } finally {
            // Re-enable scan button
            scanButton.disabled = false;
            scanButton.style.opacity = '1';
            scanButton.textContent = '🔍 Scan All';
        }
    }

    // Handle NSFW toggle change
    nsfwCheckbox.addEventListener('change', async () => {
        if (selectedHash) {
            // Show loading while updating info display
            infoDisplay.innerHTML = '<div style="text-align: center; padding: 20px; color: #888; font-style: italic;">Updating images...</div>';
            
            // Update info display with new NSFW setting
            const selectedInfo = cacheData.info[selectedHash];
            const showNsfw = nsfwCheckbox.checked;
            const infoElement = await createInfoDisplay(selectedHash, selectedInfo, showNsfw);
            infoDisplay.innerHTML = '';
            infoDisplay.appendChild(infoElement);
        }
    });

    // Handle filter change
    filterSelector.addEventListener('change', updateFileList);

    // Handle search input change
    searchInput.addEventListener('input', updateFileList);

    // Handle last used filter change
    lastUsedSelector.addEventListener('change', updateFileList);

    // Handle update filter change
    updateSelector.addEventListener('change', updateFileList);

    // Handle sort change
    sortSelector.addEventListener('change', updateFileList);

    // Handle refresh button
    refreshButton.addEventListener('click', updateFileList);

    // Handle pull metadata button
    pullButton.addEventListener('click', pullMetadata);

    // Handle edit button
    editButton.addEventListener('click', editModelInfo);

    // Handle report button
    reportButton.addEventListener('click', generateHtmlReport);

    // Handle scan button
    scanButton.addEventListener('click', scanAllModels);

    // Assemble the UI
    filterContainer.appendChild(filterLabel);
    filterContainer.appendChild(filterSelector);
    
    selectorContainer.appendChild(selectorLabel);
    selectorContainer.appendChild(selector);
    
    // Create button container for side-by-side layout
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 4px;
        margin-top: 8px;
        flex-wrap: wrap;
    `;
    buttonContainer.appendChild(refreshButton);
    buttonContainer.appendChild(pullButton);
    buttonContainer.appendChild(editButton);
    buttonContainer.appendChild(reportButton);
    buttonContainer.appendChild(scanButton);
    selectorContainer.appendChild(buttonContainer);
    selectorContainer.appendChild(progressContainer);

    container.appendChild(header);
    container.appendChild(filterContainer);
    container.appendChild(searchContainer);
    container.appendChild(lastUsedContainer);
    container.appendChild(updateContainer);
    container.appendChild(sortContainer);
    container.appendChild(nsfwContainer);
    container.appendChild(selectorContainer);
    container.appendChild(infoDisplay);

    el.appendChild(container);

    // Initial load
    updateFileList();
}

// Register the sidebar tab
app.registerExtension({
    name: "arcum42.sage.utils.cache.sidebar",
    
    async setup() {
        console.log("Setting up SageUtils Cache Sidebar...");
        
        app.extensionManager.registerSidebarTab({
            id: "sageUtilsCache",
            icon: "pi pi-hammer",
            title: "Cache Browser",
            tooltip: "Browse SageUtils cached files and metadata",
            type: "custom",
            render: createCacheSidebar
        });
    }
});

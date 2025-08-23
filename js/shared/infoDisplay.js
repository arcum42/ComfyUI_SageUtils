/**
 * Information display utilities for Sage Utils cache browser
 * Handles detailed model information display with images and metadata
 */

import { selectors } from "./stateManager.js";
import { extractCivitaiInfo } from "./civitai.js";

/**
 * Find all versions of the same model (including current version and undownloaded versions from Civitai)
 */
async function findAllModelVersions(modelId, currentHash) {
    const cacheData = selectors.cacheData();
    if (!cacheData || !cacheData.hash || !cacheData.info) {
        return [];
    }
    
    const { hash: hashData, info: infoData } = cacheData;
    const localVersions = [];
    
    // First, find all locally downloaded versions
    Object.entries(hashData).forEach(([filePath, hash]) => {
        const info = infoData[hash];
        if (info && info.modelId === modelId) {
            localVersions.push({
                hash,
                filePath,
                info,
                isCurrent: hash === currentHash,
                isDownloaded: true
            });
        }
    });
    
    // If we have a model ID, fetch all versions from Civitai
    let allVersions = [...localVersions];
    if (modelId && modelId !== 'Unknown') {
        try {
            const civitaiModelUrl = `https://civitai.com/api/v1/models/${modelId}`;
            const response = await fetch(civitaiModelUrl);
            
            if (response.ok) {
                const modelData = await response.json();
                const civitaiVersions = modelData.modelVersions || [];
                
                // Add undownloaded versions from Civitai
                civitaiVersions.forEach(version => {
                    // Check if we already have this version locally
                    const isLocallyAvailable = localVersions.some(local => 
                        local.info.id === version.id || 
                        local.info.versionId === version.id
                    );
                    
                    if (!isLocallyAvailable && version.status === 'Published' && version.availability === 'Public') {
                        allVersions.push({
                            hash: null,
                            filePath: null,
                            info: {
                                id: version.id,
                                name: version.name,
                                createdAt: version.createdAt,
                                downloadUrl: version.downloadUrl,
                                trainedWords: version.trainedWords || [],
                                description: version.description
                            },
                            isCurrent: false,
                            isDownloaded: false,
                            civitaiData: version
                        });
                    }
                });
                
                // Sort by creation date (newest first)
                allVersions.sort((a, b) => {
                    const dateA = new Date(a.info.createdAt || 0);
                    const dateB = new Date(b.info.createdAt || 0);
                    return dateB - dateA;
                });
            }
        } catch (error) {
            console.debug('Could not fetch Civitai model versions:', error);
            // Continue with just local versions if Civitai fetch fails
        }
    }
    
    return allVersions;
}

/**
 * Extract filename from file path
 */
function getFileNameFromPath(filePath) {
    return filePath.split('/').pop() || filePath;
}

/**
 * Create image gallery for a model using direct Civitai API calls like the report generator
 */
async function createCivitaiImageGallery(hash, showNsfw = false) {
    if (!hash) return null;
    
    try {
        // Use the same approach as report generator - direct Civitai API call
        const civitaiImageUrl = `https://civitai.com/api/v1/model-versions/by-hash/${encodeURIComponent(hash)}`;
        const response = await fetch(civitaiImageUrl);
        
        if (!response.ok) {
            return null;
        }
        
        const data = await response.json();
        const images = data.images || [];
        
        if (images.length === 0) {
            return null;
        }
        
        // Filter images based on NSFW setting
        const filteredImages = showNsfw ? images : images.filter(img => (img.nsfwLevel || 0) <= 1);
        
        if (filteredImages.length === 0) {
            return null;
        }
        
        const galleryContainer = document.createElement('div');
        galleryContainer.style.cssText = `
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #444;
        `;
        
        const galleryHeader = document.createElement('div');
        galleryHeader.innerHTML = `<strong style="color: #E91E63;">Preview Images (${filteredImages.length}):</strong>`;
        galleryHeader.style.marginBottom = '10px';
        galleryContainer.appendChild(galleryHeader);
        
        const imagesGrid = document.createElement('div');
        imagesGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 10px;
            max-height: 500px;
            overflow-y: auto;
        `;
        
        // Create image elements with the same styling as report generator
        filteredImages.forEach((image, index) => {
            const imageContainer = document.createElement('div');
            imageContainer.style.cssText = `
                position: relative;
                border-radius: 4px;
                overflow: hidden;
                background: #1a1a1a;
                width: 150px;
                height: 100px;
            `;
            
            const img = document.createElement('img');
            img.src = image.url;
            img.style.cssText = `
                width: 150px;
                height: 100px;
                object-fit: cover;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.3s ease;
            `;
            img.alt = 'Model example image';
            img.loading = 'lazy';
            img.title = 'Click to expand/collapse';
            
            // Add the same click handler as report generator
            img.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleImageExpand(this);
            });
            
            img.onerror = function() { 
                this.parentElement.innerHTML = '<span style="color:#999;font-size:11px;display:flex;align-items:center;justify-content:center;height:100px;">No image</span>';
            };
            
            // Add NSFW indicator if needed
            if ((image.nsfwLevel || 0) > 1) {
                const nsfwIndicator = document.createElement('div');
                nsfwIndicator.textContent = 'NSFW';
                nsfwIndicator.style.cssText = `
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    background: #F44336;
                    color: white;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 10px;
                    font-weight: bold;
                `;
                imageContainer.appendChild(nsfwIndicator);
            }
            
            imageContainer.appendChild(img);
            imagesGrid.appendChild(imageContainer);
        });
        
        galleryContainer.appendChild(imagesGrid);
        return galleryContainer;
        
    } catch (error) {
        console.error('Error loading Civitai image gallery:', error);
        return null;
    }
}

// Add the toggleImageExpand function from report generator for consistency
function toggleImageExpand(img) {
    if (img.expanded) {
        // Collapse the image
        if (img.backdrop && img.backdrop.parentNode) {
            img.backdrop.parentNode.removeChild(img.backdrop);
        }
        img.expanded = false;
        delete img.backdrop;
    } else {
        // Expand the image
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            cursor: pointer;
        `;
        
        const expandedImg = document.createElement('img');
        expandedImg.src = img.src;
        expandedImg.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
            border-radius: 8px;
        `;
        
        backdrop.appendChild(expandedImg);
        
        // Close when clicking backdrop
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                document.body.removeChild(backdrop);
                img.expanded = false;
                delete img.backdrop;
            }
        });
        
        // Close with ESC key
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(backdrop);
                img.expanded = false;
                delete img.backdrop;
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
        
        document.body.appendChild(backdrop);
        img.expanded = true;
        img.backdrop = backdrop;
    }
}

/**
 * Create a detailed information display for a cache entry
 */
export async function createDetailedInfoDisplay(hash, info, showNsfw = false) {
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

    // Try to fetch enhanced data from Civitai if we have a hash
    let enhancedInfo = info;
    if (hash) {
        try {
            const civitaiUrl = `https://civitai.com/api/v1/model-versions/by-hash/${encodeURIComponent(hash)}`;
            const response = await fetch(civitaiUrl);
            if (response.ok) {
                const civitaiData = await response.json();
                // Merge Civitai data with cached info, preferring Civitai data when available
                enhancedInfo = {
                    ...info,
                    ...civitaiData,
                    // Keep some local fields that might not be in Civitai response
                    file_path: info.file_path,
                    file_size: info.file_size,
                    last_accessed: info.last_accessed,
                    lastUsed: info.lastUsed,
                    notes: info.notes,
                    favorite: info.favorite,
                    is_favorite: info.is_favorite
                };
            }
        } catch (error) {
            console.debug('Could not fetch enhanced Civitai data:', error);
            // Continue with cached info only
        }
    }

    // Create sections for different types of information
    const sections = [];

    // Model header with name and version
    const modelName = enhancedInfo.model?.name || enhancedInfo.model_name || 'Unknown Model';
    const versionName = enhancedInfo.name || 'Unknown Version';
    const modelType = enhancedInfo.model?.type || enhancedInfo.model_type || 'Unknown';
    
    sections.push(`
        <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #444;">
            <h2 style="margin: 0 0 5px 0; color: #569cd6; font-size: 16px;">${escapeHtml(modelName)}</h2>
            <div style="color: #4CAF50; font-size: 14px; margin-bottom: 5px;">${escapeHtml(versionName)}</div>
            <div style="color: #FF9800; font-size: 12px;">
                <span style="background: #333; padding: 2px 6px; border-radius: 3px;">${escapeHtml(modelType)}</span>
                ${enhancedInfo.baseModel ? `<span style="background: #333; padding: 2px 6px; border-radius: 3px; margin-left: 5px;">${escapeHtml(enhancedInfo.baseModel)}</span>` : ''}
            </div>
        </div>
    `);

    // Model description
    if (enhancedInfo.description) {
        // Clean up HTML description
        const cleanDescription = enhancedInfo.description.replace(/<[^>]*>/g, '').substring(0, 500);
        sections.push(`
            <div style="margin-bottom: 12px;">
                <strong style="color: #2196F3;">Description:</strong><br>
                <div style="color: #B0BEC5; font-style: italic; padding: 8px; background: #1a1a1a; border-radius: 4px; margin-top: 5px;">
                    ${escapeHtml(cleanDescription)}${enhancedInfo.description.length > 500 ? '...' : ''}
                </div>
            </div>
        `);
    }

    // Trigger words
    if (enhancedInfo.trainedWords && enhancedInfo.trainedWords.length > 0) {
        const triggers = enhancedInfo.trainedWords.join(', ');
        sections.push(`
            <div style="margin-bottom: 12px;">
                <strong style="color: #E91E63;">Trigger Words:</strong><br>
                <div style="color: #F8BBD9; background: #2a1a2a; padding: 6px; border-radius: 4px; margin-top: 5px; font-family: monospace;">
                    ${escapeHtml(triggers)}
                </div>
            </div>
        `);
    }

    // Statistics from Civitai
    if (enhancedInfo.stats) {
        const stats = enhancedInfo.stats;
        sections.push(`
            <div style="margin-bottom: 12px;">
                <strong style="color: #9C27B0;">Community Stats:</strong><br>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 5px;">
                    ${stats.downloadCount !== undefined ? `<span style="color: #BA68C8;">Downloads:</span> <span style="color: #CE93D8;">${stats.downloadCount.toLocaleString()}</span>` : ''}
                    ${stats.thumbsUpCount !== undefined ? `<span style="color: #BA68C8;">👍 Likes:</span> <span style="color: #CE93D8;">${stats.thumbsUpCount.toLocaleString()}</span>` : ''}
                    ${stats.thumbsDownCount !== undefined ? `<span style="color: #BA68C8;">👎 Dislikes:</span> <span style="color: #CE93D8;">${stats.thumbsDownCount.toLocaleString()}</span>` : ''}
                    ${stats.commentCount !== undefined ? `<span style="color: #BA68C8;">Comments:</span> <span style="color: #CE93D8;">${stats.commentCount.toLocaleString()}</span>` : ''}
                </div>
            </div>
        `);
    }

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
    if (enhancedInfo.model_name || enhancedInfo.base_model || enhancedInfo.model_type || (enhancedInfo.model && (enhancedInfo.model.name || enhancedInfo.model.type))) {
        let modelInfo = '<div style="margin-bottom: 12px;"><strong style="color: #2196F3;">Model Information:</strong><br>';
        
        // Check both old and new data structure
        const modelName = enhancedInfo.model_name || (enhancedInfo.model && enhancedInfo.model.name) || enhancedInfo.name;
        const baseModel = enhancedInfo.base_model || enhancedInfo.baseModel;
        const modelType = enhancedInfo.model_type || (enhancedInfo.model && enhancedInfo.model.type);
        
        if (modelName) modelInfo += `<span style="color: #64B5F6;">Name:</span> ${escapeHtml(modelName)}<br>`;
        if (baseModel) modelInfo += `<span style="color: #64B5F6;">Base Model:</span> ${escapeHtml(baseModel)}<br>`;
        if (modelType) modelInfo += `<span style="color: #64B5F6;">Type:</span> ${escapeHtml(modelType)}<br>`;
        modelInfo += '</div>';
        sections.push(modelInfo);
    }

    // File details
    if (enhancedInfo.file_size || enhancedInfo.file_path || enhancedInfo.files) {
        let fileInfo = '<div style="margin-bottom: 12px;"><strong style="color: #FF9800;">File Details:</strong><br>';
        
        if (enhancedInfo.file_path) {
            fileInfo += `<span style="color: #FFB74D;">Path:</span> ${escapeHtml(enhancedInfo.file_path)}<br>`;
        }
        
        // File size from local cache or Civitai
        let fileSize = enhancedInfo.file_size;
        if (!fileSize && enhancedInfo.files && enhancedInfo.files[0]) {
            fileSize = enhancedInfo.files[0].sizeKB * 1024; // Convert KB to bytes
        }
        
        if (fileSize) {
            const sizeInMB = (fileSize / (1024 * 1024)).toFixed(2);
            fileInfo += `<span style="color: #FFB74D;">Size:</span> ${sizeInMB} MB<br>`;
        }
        
        // File format and other metadata from Civitai
        if (enhancedInfo.files && enhancedInfo.files[0]) {
            const file = enhancedInfo.files[0];
            if (file.metadata) {
                if (file.metadata.format) fileInfo += `<span style="color: #FFB74D;">Format:</span> ${file.metadata.format}<br>`;
                if (file.metadata.fp) fileInfo += `<span style="color: #FFB74D;">Precision:</span> ${file.metadata.fp}<br>`;
                if (file.metadata.size) fileInfo += `<span style="color: #FFB74D;">Model Size:</span> ${file.metadata.size}<br>`;
            }
            if (file.pickleScanResult) fileInfo += `<span style="color: #FFB74D;">Safety Scan:</span> ${file.pickleScanResult}<br>`;
        }
        
        fileInfo += '</div>';
        sections.push(fileInfo);
    }

    // Civitai information
    const civitaiData = extractCivitaiInfo(enhancedInfo);
    if (civitaiData.hasInfo) {
        let civitaiInfo = '<div style="margin-bottom: 12px;"><strong style="color: #9C27B0;">Civitai Information:</strong><br>';
        
        if (civitaiData.versionId) {
            civitaiInfo += `<span style="color: #BA68C8;">Version ID:</span> ${civitaiData.versionId}<br>`;
        }
        if (civitaiData.modelId) {
            civitaiInfo += `<span style="color: #BA68C8;">Model ID:</span> ${civitaiData.modelId}<br>`;
        }
        
        // Show current version link
        if (civitaiData.modelUrl !== '#') {
            civitaiInfo += `<span style="color: #BA68C8;">Current Version:</span> <a href="${civitaiData.modelUrl}" style="color: #CE93D8;" target="_blank">View on Civitai</a><br>`;
        }
        
        // Show updated version link only if we don't already have it locally
        if (civitaiData.hasUpdate && civitaiData.updateUrl !== '#') {
            // Check if we already have the updated version locally
            const updateVersionId = enhancedInfo.update_version_id;
            let alreadyHaveUpdate = false;
            
            if (updateVersionId && enhancedInfo.modelId) {
                const allVersions = await findAllModelVersions(enhancedInfo.modelId, hash);
                alreadyHaveUpdate = allVersions.some(version => 
                    version.info.id === updateVersionId || 
                    version.info.versionId === updateVersionId
                );
            }
            
            if (!alreadyHaveUpdate) {
                civitaiInfo += `<span style="color: #FF9800;">Updated Version:</span> <a href="${civitaiData.updateUrl}" style="color: #FFB74D;" target="_blank">🔗 New Version Available</a><br>`;
            } else {
                civitaiInfo += `<span style="color: #4CAF50;">Updated Version:</span> <span style="color: #81C784;">✓ Already downloaded locally</span><br>`;
            }
        }
        
        if (civitaiData.downloadUrl !== '#') {
            civitaiInfo += `<span style="color: #BA68C8;">Download URL:</span> <a href="${civitaiData.downloadUrl}" style="color: #CE93D8;" target="_blank">Link</a><br>`;
        }
        
        civitaiInfo += '</div>';
        sections.push(civitaiInfo);
    }

    // Timestamps
    if (enhancedInfo.created_at || enhancedInfo.updated_at || enhancedInfo.last_accessed || enhancedInfo.lastUsed) {
        let timeInfo = '<div style="margin-bottom: 12px;"><strong style="color: #607D8B;">Timestamps:</strong><br>';
        if (enhancedInfo.created_at) timeInfo += `<span style="color: #90A4AE;">Created:</span> ${new Date(enhancedInfo.created_at).toLocaleString()}<br>`;
        if (enhancedInfo.updated_at) timeInfo += `<span style="color: #90A4AE;">Updated:</span> ${new Date(enhancedInfo.updated_at).toLocaleString()}<br>`;
        if (enhancedInfo.last_accessed) timeInfo += `<span style="color: #90A4AE;">Last Accessed:</span> ${new Date(enhancedInfo.last_accessed).toLocaleString()}<br>`;
        if (enhancedInfo.lastUsed) timeInfo += `<span style="color: #90A4AE;">Last Used:</span> ${new Date(enhancedInfo.lastUsed).toLocaleString()}<br>`;
        timeInfo += '</div>';
        sections.push(timeInfo);
    }

    // All versions of this model (including current and undownloaded from Civitai)
    if (enhancedInfo.modelId) {
        try {
            const allVersions = await findAllModelVersions(enhancedInfo.modelId, hash);
            if (allVersions.length > 1) {
                let versionsInfo = '<div style="margin-bottom: 12px;"><strong style="color: #00BCD4;">All Versions:</strong><br>';
                allVersions.forEach(version => {
                    const fileName = version.filePath ? getFileNameFromPath(version.filePath) : 'Not downloaded';
                    const isCurrentVersion = version.isCurrent;
                    const isDownloaded = version.isDownloaded;
                    const versionName = version.info.name || version.info.id || 'Unknown';
                    const versionId = version.info.id || 'N/A';
                    const createdAt = version.info.createdAt ? new Date(version.info.createdAt).toLocaleDateString() : 'Unknown';
                    
                    // Different styling based on download status
                    let backgroundColor = '#1a1a1a';
                    let borderColor = 'transparent';
                    let statusIndicator = '';
                    
                    if (isCurrentVersion) {
                        backgroundColor = '#333';
                        borderColor = '#00BCD4';
                        statusIndicator = '<br><span style="color: #00E676; font-size: 10px; font-weight: bold;">◄ CURRENT</span>';
                    } else if (isDownloaded) {
                        backgroundColor = '#1a2a1a';
                        borderColor = '#4CAF50';
                        statusIndicator = '<br><span style="color: #4CAF50; font-size: 10px; font-weight: bold;">● DOWNLOADED</span>';
                    } else {
                        backgroundColor = '#2a1a1a';
                        borderColor = '#FF9800';
                        statusIndicator = '<br><span style="color: #FF9800; font-size: 10px; font-weight: bold;">○ AVAILABLE</span>';
                    }
                    
                    versionsInfo += `<div style="margin: 4px 0; padding: 6px; background: ${backgroundColor}; border-left: 3px solid ${borderColor}; border-radius: 3px;">`;
                    versionsInfo += `<span style="color: #81D4FA;">Version:</span> ${versionName}<br>`;
                    versionsInfo += `<span style="color: #81D4FA;">ID:</span> ${versionId}<br>`;
                    versionsInfo += `<span style="color: #81D4FA;">Created:</span> ${createdAt}<br>`;
                    
                    if (isDownloaded) {
                        versionsInfo += `<span style="color: #81D4FA;">File:</span> <span style="font-size: 11px; color: #B0BEC5;">${fileName}</span>`;
                    } else {
                        // Add download link for undownloaded versions
                        const downloadUrl = version.info.downloadUrl || `https://civitai.com/api/download/models/${versionId}`;
                        versionsInfo += `<span style="color: #81D4FA;">Download:</span> <a href="${downloadUrl}" style="color: #FFB74D; font-size: 11px;" target="_blank" title="Download this version">Download Link</a>`;
                    }
                    
                    versionsInfo += statusIndicator;
                    versionsInfo += '</div>';
                });
                versionsInfo += '</div>';
                sections.push(versionsInfo);
            }
        } catch (error) {
            console.error('Error fetching model versions:', error);
            // Fallback to local versions only
            const localVersions = [];
            const { hash: hashData, info: infoData } = selectors.cacheData();
            Object.entries(hashData).forEach(([filePath, versionHash]) => {
                const versionInfo = infoData[versionHash];
                if (versionInfo && versionInfo.modelId === enhancedInfo.modelId) {
                    localVersions.push({
                        hash: versionHash,
                        filePath,
                        info: versionInfo,
                        isCurrent: versionHash === hash
                    });
                }
            });
            
            if (localVersions.length > 1) {
                let versionsInfo = '<div style="margin-bottom: 12px;"><strong style="color: #00BCD4;">Local Versions:</strong><br>';
                localVersions.forEach(version => {
                    const fileName = getFileNameFromPath(version.filePath);
                    const isCurrentVersion = version.isCurrent;
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
    }

    // Additional metadata
    const metadataKeys = Object.keys(enhancedInfo).filter(key => 
        !['model_name', 'base_model', 'model_type', 'file_size', 'file_path', 'id', 'modelId', 'downloadUrl', 'update_available', 'update_version_id', 'created_at', 'updated_at', 'last_accessed', 'lastUsed', 'model', 'name', 'baseModel', 'description', 'trainedWords', 'images', 'stats', 'files'].includes(key)
    );

    if (metadataKeys.length > 0) {
        let metadataInfo = '<div style="margin-bottom: 12px;"><strong style="color: #795548;">Additional Metadata:</strong><br>';
        metadataKeys.forEach(key => {
            const value = enhancedInfo[key];
            if (value !== null && value !== undefined && value !== '') {
                metadataInfo += `<span style="color: #A1887F;">${escapeHtml(key)}:</span> ${escapeHtml(JSON.stringify(value))}<br>`;
            }
        });
        metadataInfo += '</div>';
        sections.push(metadataInfo);
    }

    // Add sections to container first
    container.innerHTML = sections.join('');

    // Add image gallery using direct Civitai API like report generator
    if (hash) {
        try {
            const imageGallery = await createCivitaiImageGallery(hash, showNsfw);
            if (imageGallery) {
                container.appendChild(imageGallery);
            }
        } catch (error) {
            console.error('Error creating image gallery:', error);
        }
    }

    return container;
}

// Helper function to escape HTML
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

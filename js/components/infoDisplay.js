/**
 * Information display utilities for Sage Utils cache browser
 * Handles detailed model information display with images and metadata
 */

import { selectors } from '../shared/stateManager.js';
import { extractCivitaiInfo } from '../shared/civitai.js';
import { copyToClipboard } from './clipboard.js';
import { sendTextToPromptBuilder, showNotification } from '../shared/crossTabMessaging.js';

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
        galleryContainer.className = 'sage-gallery-container';
        
        const galleryHeader = document.createElement('div');
        galleryHeader.className = 'sage-gallery-header';
        
        const titleSpan = document.createElement('span');
        titleSpan.innerHTML = `<strong class="sage-gallery-title">Preview Images (${filteredImages.length}):</strong>`;
        galleryHeader.appendChild(titleSpan);
        
        // Add NSFW toggle placeholder (will be populated from parent)
        const nsfwToggleSpot = document.createElement('div');
        nsfwToggleSpot.id = 'nsfw-toggle-spot';
        galleryHeader.appendChild(nsfwToggleSpot);
        
        galleryContainer.appendChild(galleryHeader);
        
        const imagesGrid = document.createElement('div');
        imagesGrid.className = 'sage-gallery-grid';
        
        // Create image elements with the same styling as report generator
        filteredImages.forEach((image, index) => {
            const imageContainer = document.createElement('div');
            imageContainer.className = 'sage-gallery-item';
            
            const img = document.createElement('img');
            img.src = image.url;
            img.className = 'sage-gallery-image';
            img.alt = 'Model example image';
            img.loading = 'lazy';
            img.title = 'Click to expand/collapse';
            
            // Add the same click handler as report generator
            img.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleImageExpand(this);
            });
            
            img.onerror = function() { 
                this.parentElement.innerHTML = '<span class="sage-gallery-no-image">No image</span>';
            };
            
            // Add NSFW indicator if needed
            if ((image.nsfwLevel || 0) > 1) {
                const nsfwIndicator = document.createElement('div');
                nsfwIndicator.textContent = 'NSFW';
                nsfwIndicator.className = 'sage-nsfw-indicator';
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
        backdrop.className = 'sage-backdrop';
        
        const expandedImg = document.createElement('img');
        expandedImg.src = img.src;
        expandedImg.className = 'sage-backdrop-image';
        
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
    container.className = 'sage-info-panel';

    if (!info) {
        container.innerHTML = `
            <div class="sage-info-empty">
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
        <div class="sage-info-header">
            <h2 class="sage-info-title">${escapeHtml(modelName)}</h2>
            <div class="sage-info-version">${escapeHtml(versionName)}</div>
            <div class="sage-info-chip-row">
                <span class="sage-info-chip">${escapeHtml(modelType)}</span>
                ${enhancedInfo.baseModel ? `<span class="sage-info-chip">${escapeHtml(enhancedInfo.baseModel)}</span>` : ''}
            </div>
        </div>
    `);

    // Model description
    if (enhancedInfo.description) {
        // Clean up HTML description
        const cleanDescription = enhancedInfo.description.replace(/<[^>]*>/g, '').substring(0, 500);
        sections.push(`
            <div class="sage-info-block">
                <strong class="sage-info-label sage-info-label--blue">Description:</strong><br>
                <div class="sage-description-text">
                    ${escapeHtml(cleanDescription)}${enhancedInfo.description.length > 500 ? '...' : ''}
                </div>
            </div>
        `);
    }

    // Trigger words (keywords)
    if (enhancedInfo.trainedWords && enhancedInfo.trainedWords.length > 0) {
        const triggers = enhancedInfo.trainedWords.join(', ');
        sections.push(`
            <div class="sage-trigger-words-block">
                <div class="sage-trigger-words-row">
                    <strong class="sage-info-label sage-info-label--magenta">Trigger Words:</strong>
                    <div class="sage-trigger-words-actions">
                        <button type="button" class="sage-trigger-btn trigger-copy-btn">Copy</button>
                        <button type="button" class="sage-trigger-btn trigger-append-btn">Append to Prompt</button>
                    </div>
                </div>
                <div class="sage-trigger-words-text">
                    ${escapeHtml(triggers)}
                </div>
            </div>
        `);
    }

    // Statistics from Civitai
    if (enhancedInfo.stats) {
        const stats = enhancedInfo.stats;
        sections.push(`
            <div class="sage-info-block">
                <strong class="sage-info-label sage-info-label--purple">Community Stats:</strong><br>
                <div class="sage-stats-grid">
                    ${stats.downloadCount !== undefined ? `<span class="sage-info-key">Downloads:</span> <span class="sage-info-value">${stats.downloadCount.toLocaleString()}</span>` : ''}
                    ${stats.thumbsUpCount !== undefined ? `<span class="sage-info-key">👍 Likes:</span> <span class="sage-info-value">${stats.thumbsUpCount.toLocaleString()}</span>` : ''}
                    ${stats.thumbsDownCount !== undefined ? `<span class="sage-info-key">👎 Dislikes:</span> <span class="sage-info-value">${stats.thumbsDownCount.toLocaleString()}</span>` : ''}
                    ${stats.commentCount !== undefined ? `<span class="sage-info-key">Comments:</span> <span class="sage-info-value">${stats.commentCount.toLocaleString()}</span>` : ''}
                </div>
            </div>
        `);
    }

    // Basic file information
    if (hash) {
        sections.push(`
            <div class="sage-info-block">
                <strong class="sage-info-label sage-info-label--green">Hash:</strong><br>
                <span class="sage-info-value sage-info-value--break">${hash}</span>
            </div>
        `);
    }

    // Model information
    if (enhancedInfo.model_name || enhancedInfo.base_model || enhancedInfo.model_type || (enhancedInfo.model && (enhancedInfo.model.name || enhancedInfo.model.type))) {
        let modelInfo = '<div class="sage-info-block"><strong class="sage-info-label sage-info-label--blue">Model Information:</strong><br>';
        
        // Check both old and new data structure
        const modelName = enhancedInfo.model_name || (enhancedInfo.model && enhancedInfo.model.name) || enhancedInfo.name;
        const baseModel = enhancedInfo.base_model || enhancedInfo.baseModel;
        const modelType = enhancedInfo.model_type || (enhancedInfo.model && enhancedInfo.model.type);
        
        if (modelName) modelInfo += `<span class="sage-info-key">Name:</span> ${escapeHtml(modelName)}<br>`;
        if (baseModel) modelInfo += `<span class="sage-info-key">Base Model:</span> ${escapeHtml(baseModel)}<br>`;
        if (modelType) modelInfo += `<span class="sage-info-key">Type:</span> ${escapeHtml(modelType)}<br>`;
        modelInfo += '</div>';
        sections.push(modelInfo);
    }

    // File details
    if (enhancedInfo.file_size || enhancedInfo.file_path || enhancedInfo.files) {
        let fileInfo = '<div class="sage-info-block"><strong class="sage-info-label sage-info-label--orange">File Details:</strong><br>';
        
        if (enhancedInfo.file_path) {
            fileInfo += `<span class="sage-info-key">Path:</span> ${escapeHtml(enhancedInfo.file_path)}<br>`;
        }
        
        // File size from local cache or Civitai
        let fileSize = enhancedInfo.file_size;
        if (!fileSize && enhancedInfo.files && enhancedInfo.files[0]) {
            fileSize = enhancedInfo.files[0].sizeKB * 1024; // Convert KB to bytes
        }
        
        if (fileSize) {
            const sizeInMB = (fileSize / (1024 * 1024)).toFixed(2);
            fileInfo += `<span class="sage-info-key">Size:</span> ${sizeInMB} MB<br>`;
        }
        
        // File format and other metadata from Civitai
        if (enhancedInfo.files && enhancedInfo.files[0]) {
            const file = enhancedInfo.files[0];
            if (file.metadata) {
                if (file.metadata.format) fileInfo += `<span class="sage-info-key">Format:</span> ${file.metadata.format}<br>`;
                if (file.metadata.fp) fileInfo += `<span class="sage-info-key">Precision:</span> ${file.metadata.fp}<br>`;
                if (file.metadata.size) fileInfo += `<span class="sage-info-key">Model Size:</span> ${file.metadata.size}<br>`;
            }
            if (file.pickleScanResult) fileInfo += `<span class="sage-info-key">Safety Scan:</span> ${file.pickleScanResult}<br>`;
        }
        
        fileInfo += '</div>';
        sections.push(fileInfo);
    }

    // Civitai information
    const civitaiData = extractCivitaiInfo(enhancedInfo);
    if (civitaiData.hasInfo) {
        let civitaiInfo = '<div class="sage-info-block"><strong class="sage-info-label sage-info-label--purple">Civitai Information:</strong><br>';
        
        if (civitaiData.versionId) {
            civitaiInfo += `<span class="sage-info-key">Version ID:</span> ${civitaiData.versionId}<br>`;
        }
        if (civitaiData.modelId) {
            civitaiInfo += `<span class="sage-info-key">Model ID:</span> ${civitaiData.modelId}<br>`;
        }
        
        // Show current version link
        if (civitaiData.modelUrl !== '#') {
            civitaiInfo += `<span class="sage-info-key">Current Version:</span> <a class="sage-info-link" href="${civitaiData.modelUrl}" target="_blank">View on Civitai</a><br>`;
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
                civitaiInfo += `<span class="sage-info-key">Updated Version:</span> <a class="sage-info-link sage-info-link--warning" href="${civitaiData.updateUrl}" target="_blank">🔗 New Version Available</a><br>`;
            } else {
                civitaiInfo += `<span class="sage-info-key">Updated Version:</span> <span class="sage-info-value sage-info-value--success">✓ Already downloaded locally</span><br>`;
            }
        }
        
        if (civitaiData.downloadUrl !== '#') {
            civitaiInfo += `<span class="sage-info-key">Download URL:</span> <a class="sage-info-link" href="${civitaiData.downloadUrl}" target="_blank">Link</a><br>`;
        }
        
        civitaiInfo += '</div>';
        sections.push(civitaiInfo);
    }

    // Timestamps
    if (enhancedInfo.created_at || enhancedInfo.updated_at || enhancedInfo.last_accessed || enhancedInfo.lastUsed) {
        let timeInfo = '<div class="sage-info-block"><strong class="sage-info-label sage-info-label--gray">Timestamps:</strong><br>';
        if (enhancedInfo.created_at) timeInfo += `<span class="sage-info-key">Created:</span> ${new Date(enhancedInfo.created_at).toLocaleString()}<br>`;
        if (enhancedInfo.updated_at) timeInfo += `<span class="sage-info-key">Updated:</span> ${new Date(enhancedInfo.updated_at).toLocaleString()}<br>`;
        if (enhancedInfo.last_accessed) timeInfo += `<span class="sage-info-key">Last Accessed:</span> ${new Date(enhancedInfo.last_accessed).toLocaleString()}<br>`;
        if (enhancedInfo.lastUsed) timeInfo += `<span class="sage-info-key">Last Used:</span> ${new Date(enhancedInfo.lastUsed).toLocaleString()}<br>`;
        timeInfo += '</div>';
        sections.push(timeInfo);
    }

    // All versions of this model (including current and undownloaded from Civitai)
    if (enhancedInfo.modelId) {
        try {
            const allVersions = await findAllModelVersions(enhancedInfo.modelId, hash);
            if (allVersions.length > 1) {
                let versionsInfo = '<div class="sage-info-block"><strong class="sage-info-label sage-info-label--teal">All Versions:</strong><br>';
                allVersions.forEach(version => {
                    const fileName = version.filePath ? getFileNameFromPath(version.filePath) : 'Not downloaded';
                    const isCurrentVersion = version.isCurrent;
                    const isDownloaded = version.isDownloaded;
                    const versionName = version.info.name || version.info.id || 'Unknown';
                    const versionId = version.info.id || 'N/A';
                    const createdAt = version.info.createdAt ? new Date(version.info.createdAt).toLocaleDateString() : 'Unknown';
                    
                    const cardClass = isCurrentVersion ? 'sage-version-card sage-version-card--current' : isDownloaded ? 'sage-version-card sage-version-card--downloaded' : 'sage-version-card sage-version-card--available';
                    let statusIndicator = isCurrentVersion ? '<span class="sage-version-card-status sage-version-card-status--current">◄ CURRENT</span>' : isDownloaded ? '<span class="sage-version-card-status sage-version-card-status--downloaded">● DOWNLOADED</span>' : '<span class="sage-version-card-status sage-version-card-status--available">○ AVAILABLE</span>';
                    
                    versionsInfo += `<div class="${cardClass}">`;
                    versionsInfo += `<span class="sage-info-key">Version:</span> ${versionName}<br>`;
                    versionsInfo += `<span class="sage-info-key">ID:</span> ${versionId}<br>`;
                    versionsInfo += `<span class="sage-info-key">Created:</span> ${createdAt}<br>`;
                    
                    if (isDownloaded) {
                        versionsInfo += `<span class="sage-info-key">File:</span> <span class="sage-info-value sage-info-value--small">${fileName}</span>`;
                    } else {
                        const downloadUrl = version.info.downloadUrl || `https://civitai.com/api/download/models/${versionId}`;
                        versionsInfo += `<span class="sage-info-key">Download:</span> <a class="sage-info-link sage-info-link--warning" href="${downloadUrl}" target="_blank" title="Download this version">Download Link</a>`;
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
                let versionsInfo = '<div class="sage-info-block"><strong class="sage-info-label sage-info-label--teal">Local Versions:</strong><br>';
                localVersions.forEach(version => {
                    const fileName = getFileNameFromPath(version.filePath);
                    const isCurrentVersion = version.isCurrent;
                    const versionName = version.info.name || version.info.id || 'Unknown';
                    const versionId = version.info.id || 'N/A';
                    const cardClass = isCurrentVersion ? 'sage-version-card sage-version-card--current' : 'sage-version-card';
                    
                    versionsInfo += `<div class="${cardClass}">`;
                    versionsInfo += `<span class="sage-info-key">Version:</span> ${versionName}<br>`;
                    versionsInfo += `<span class="sage-info-key">ID:</span> ${versionId}<br>`;
                    versionsInfo += `<span class="sage-info-key">File:</span> <span class="sage-info-value sage-info-value--small">${fileName}</span>`;
                    if (isCurrentVersion) {
                        versionsInfo += '<br><span class="sage-version-card-status sage-version-card-status--current">◄ CURRENT</span>';
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
        let metadataInfo = '<div class="sage-info-block"><strong class="sage-info-label sage-info-label--brown">Additional Metadata:</strong><br>';
        metadataKeys.forEach(key => {
            const value = enhancedInfo[key];
            if (value !== null && value !== undefined && value !== '') {
                metadataInfo += `<span class="sage-info-meta-key">${escapeHtml(key)}:</span> ${escapeHtml(JSON.stringify(value))}<br>`;
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

    // Wire up trigger word actions if present
    try {
        const copyBtn = container.querySelector('.trigger-copy-btn');
        const appendBtn = container.querySelector('.trigger-append-btn');
        const textEl = container.querySelector('.trigger-words-text');

        if (copyBtn && appendBtn && textEl) {
            const triggersText = (textEl.textContent || '').trim();

            copyBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const ok = await copyToClipboard(triggersText);
                if (ok) {
                    showNotification('Keywords copied to clipboard', 'success', { duration: 2000, source: 'models-tab' });
                } else {
                    showNotification('Failed to copy keywords', 'error', { duration: 2500, source: 'models-tab' });
                }
            });

            appendBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (triggersText) {
                    // Append to Prompt Builder's positive prompt
                    sendTextToPromptBuilder(triggersText, { source: 'models-tab', autoSwitch: true, append: true });
                    showNotification('Keywords appended to Prompt Builder', 'success', { duration: 2000, source: 'models-tab' });
                }
            });
        }
    } catch (err) {
        console.warn('Failed to initialize trigger word actions:', err);
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

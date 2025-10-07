/**
 * Model Scan Dialog
 * 
 * Provides a comprehensive interface for scanning model folders with options for:
 * - Folder selection
 * - Force metadata refresh
 * - Include cached models
 * - Rate limiting for Civitai API
 * - Progress tracking with cancel support
 */

import { notifications } from '../shared/notifications.js';

class ModelScanDialog {
    constructor(options = {}) {
        this.dialog = null;
        this.isScanning = false;
        this.cancelRequested = false;
        this.currentRequest = null;
        this.progressInterval = null;
        this.scanResults = {
            totalFiles: 0,
            processed: 0,
            errors: 0,
            startTime: null,
            completed: false
        };
        this.onScanComplete = options.onScanComplete || null;
    }

    /**
     * Show the model scan dialog
     */
    async show() {
        if (this.dialog) {
            this.dialog.remove();
        }

        this.dialog = this.createDialog();
        document.body.appendChild(this.dialog);
        
        // Center the dialog and wait for it to be ready
        await this.centerDialog();
        
        // Load available folders
        await this.loadAvailableFolders();
    }

    /**
     * Create the dialog DOM structure
     */
    createDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'model-scan-dialog-overlay';
        dialog.innerHTML = `
            <div class="model-scan-dialog">
                <div class="model-scan-header">
                    <h3>Model Metadata Scan</h3>
                    <button class="close-btn" type="button">&times;</button>
                </div>
                
                <div class="model-scan-content">
                    <div class="scan-options">
                        <div class="option-group">
                            <label class="option-label">
                                <strong>Scan Folders:</strong>
                            </label>
                            <div class="folder-list" id="folderList">
                                <div class="loading">Loading folders...</div>
                            </div>
                            <div class="folder-summary" id="folderSummary" style="display: none;">
                                <small class="help-text">
                                    <span id="selectedFolderCount">0</span> folders selected, 
                                    <span id="totalFileCount">0</span> files total
                                </small>
                            </div>
                        </div>
                        
                        <div class="option-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="forceRefresh" />
                                Force metadata refresh (ignore cache)
                            </label>
                            <small class="help-text">
                                Check to re-download metadata even if recently cached
                            </small>
                        </div>
                        
                        <div class="option-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="includeCached" checked />
                                Include models already in cache
                            </label>
                            <small class="help-text">
                                Uncheck to only scan new/modified models
                            </small>
                        </div>
                        
                        <div class="option-group">
                            <label for="rateLimitDelay" class="option-label">
                                Civitai API Rate Limit (ms):
                            </label>
                            <input type="number" id="rateLimitDelay" value="1000" min="100" max="5000" step="100" />
                            <small class="help-text">
                                Delay between API requests to prevent rate limiting (recommended: 1000ms)
                            </small>
                        </div>
                    </div>
                    
                    <div class="scan-progress" id="scanProgress" style="display: none;">
                        <div class="progress-info">
                            <div class="progress-stats">
                                <span id="progressText">Initializing scan...</span>
                                <span id="progressStats" class="stats-text"></span>
                            </div>
                            <div class="progress-time">
                                <span id="elapsedTime">00:00</span>
                            </div>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar" id="progressBar">
                                <div class="progress-fill" id="progressFill"></div>
                            </div>
                            <div class="progress-percentage" id="progressPercentage">0%</div>
                        </div>
                        <div class="scan-log" id="scanLog"></div>
                    </div>
                </div>
                
                <div class="model-scan-footer">
                    <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
                    <button class="btn btn-primary" id="startScanBtn">Start Scan</button>
                </div>
            </div>
        `;

        this.addDialogStyles();
        this.bindEvents(dialog);
        return dialog;
    }

    /**
     * Add CSS styles for the dialog
     */
    addDialogStyles() {
        if (document.getElementById('model-scan-dialog-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'model-scan-dialog-styles';
        style.textContent = `
            .model-scan-dialog-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            
            .model-scan-dialog {
                background: var(--comfy-menu-bg);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
            }
            
            .model-scan-header {
                padding: 16px 20px;
                border-bottom: 1px solid var(--border-color);
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .model-scan-header h3 {
                margin: 0;
                color: var(--input-text);
                font-size: 18px;
            }
            
            .close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: var(--input-text);
                padding: 0;
                line-height: 1;
            }
            
            .close-btn:hover {
                color: var(--error-text);
            }
            
            .model-scan-content {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
            }
            
            .option-group {
                margin-bottom: 20px;
            }
            
            .option-label {
                display: block;
                margin-bottom: 8px;
                color: var(--input-text);
                font-weight: 500;
            }
            
            .checkbox-label {
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--input-text);
                cursor: pointer;
            }
            
            .checkbox-label input[type="checkbox"] {
                margin: 0;
            }
            
            .help-text {
                display: block;
                margin-top: 4px;
                color: var(--descrip-text);
                font-size: 12px;
                line-height: 1.4;
            }
            
            .folder-list {
                border: 1px solid var(--border-color);
                border-radius: 4px;
                max-height: 150px;
                overflow-y: auto;
                background: var(--comfy-input-bg);
            }
            
            .folder-item {
                padding: 8px 12px;
                border-bottom: 1px solid var(--border-color);
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .folder-item:last-child {
                border-bottom: none;
            }
            
            .folder-item:hover {
                background: var(--comfy-input-bg);
                filter: brightness(1.1);
            }
            
            .folder-item input[type="checkbox"] {
                margin: 0;
            }
            
            .folder-name {
                flex: 1;
                color: var(--input-text);
                font-family: monospace;
                font-size: 13px;
            }
            
            .folder-count {
                color: var(--descrip-text);
                font-size: 12px;
            }
            
            .loading {
                padding: 20px;
                text-align: center;
                color: var(--descrip-text);
            }
            
            .folder-summary {
                margin-top: 8px;
                padding: 8px 12px;
                background: var(--comfy-menu-bg);
                border: 1px solid var(--border-color);
                border-radius: 4px;
            }
            
            .folder-summary .help-text {
                margin: 0;
                font-weight: 500;
                color: var(--input-text);
            }
            
            #rateLimitDelay {
                width: 100px;
                padding: 6px 8px;
                border: 1px solid var(--border-color);
                border-radius: 4px;
                background: var(--comfy-input-bg);
                color: var(--input-text);
            }
            
            .scan-progress {
                border: 1px solid var(--border-color);
                border-radius: 6px;
                padding: 16px;
                background: var(--comfy-input-bg);
            }
            
            .progress-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }
            
            .progress-stats {
                flex: 1;
            }
            
            #progressText {
                display: block;
                color: var(--input-text);
                font-weight: 500;
                margin-bottom: 4px;
            }
            
            .stats-text {
                color: var(--descrip-text);
                font-size: 13px;
            }
            
            .progress-time {
                color: var(--descrip-text);
                font-size: 14px;
                font-family: monospace;
            }
            
            .progress-bar-container {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
            }
            
            .progress-bar {
                flex: 1;
                height: 20px;
                background: #2a2a2a;
                background: var(--comfy-menu-bg, #2a2a2a);
                border: 1px solid #555;
                border: 1px solid var(--border-color, #555);
                border-radius: 10px;
                overflow: hidden;
                position: relative;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #007acc, #005a9e);
                background: linear-gradient(90deg, var(--primary-color, #007acc), var(--primary-color-hover, #005a9e));
                transition: width 0.3s ease;
                width: 0%;
            }
            
            .progress-percentage {
                min-width: 45px;
                text-align: right;
                color: var(--input-text);
                font-family: monospace;
                font-size: 13px;
            }
            
            .scan-log {
                max-height: 120px;
                overflow-y: auto;
                font-family: monospace;
                font-size: 12px;
                line-height: 1.4;
                background: var(--comfy-menu-bg);
                border: 1px solid var(--border-color);
                border-radius: 4px;
                padding: 8px;
            }
            
            .log-entry {
                margin-bottom: 2px;
                color: var(--descrip-text);
            }
            
            .log-entry.success {
                color: var(--success-text);
            }
            
            .log-entry.error {
                color: var(--error-text);
            }
            
            .log-entry.info {
                color: var(--info-text);
            }
            
            .model-scan-footer {
                padding: 16px 20px;
                border-top: 1px solid var(--border-color);
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }
            
            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .btn-primary {
                background: var(--primary-color);
                color: white;
            }
            
            .btn-primary:hover {
                background: var(--primary-color-hover);
            }
            
            .btn-primary:disabled {
                background: var(--border-color);
                cursor: not-allowed;
            }
            
            .btn-secondary {
                background: var(--comfy-input-bg);
                color: var(--input-text);
                border: 1px solid var(--border-color);
            }
            
            .btn-secondary:hover {
                background: var(--comfy-menu-bg);
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Bind event handlers
     */
    bindEvents(dialog) {
        // Close button
        dialog.querySelector('.close-btn').addEventListener('click', () => {
            this.close();
        });

        // Cancel button
        const cancelBtn = dialog.querySelector('#cancelBtn');
        cancelBtn.addEventListener('click', () => {
            if (this.isScanning) {
                this.cancelScan();
            } else {
                this.close();
            }
        });

        // Start scan button
        dialog.querySelector('#startScanBtn').addEventListener('click', () => {
            this.startScan();
        });

        // Close on overlay click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                if (!this.isScanning) {
                    this.close();
                }
            }
        });

        // Prevent closing during scan with Escape
        document.addEventListener('keydown', this.handleKeydown.bind(this));
    }

    /**
     * Handle keyboard events
     */
    handleKeydown(e) {
        if (e.key === 'Escape' && !this.isScanning) {
            this.close();
        }
    }

    /**
     * Center the dialog on screen
     */
    centerDialog() {
        return new Promise((resolve) => {
            // Already centered with CSS flexbox, but we add animation
            requestAnimationFrame(() => {
                if (!this.dialog) {
                    resolve();
                    return;
                }
                
                this.dialog.style.opacity = '0';
                this.dialog.style.transform = 'scale(0.95)';
                this.dialog.style.transition = 'opacity 0.2s, transform 0.2s';
                
                requestAnimationFrame(() => {
                    if (!this.dialog) {
                        resolve();
                        return;
                    }
                    
                    this.dialog.style.opacity = '1';
                    this.dialog.style.transform = 'scale(1)';
                    
                    // Wait for animation to complete
                    setTimeout(() => resolve(), 200);
                });
            });
        });
    }

    /**
     * Load available model folders from server
     */
    async loadAvailableFolders() {
        try {
            const response = await fetch('/sage_cache/scan_model_folders');
            if (!response.ok) {
                throw new Error(`Failed to load folders: ${response.status}`);
            }

            const data = await response.json();
            this.renderFolderList(data.folders || []);
        } catch (error) {
            console.error('Error loading folders:', error);
            this.renderFolderList([], 'Failed to load folders');
        }
    }

    /**
     * Render the folder selection list
     */
    renderFolderList(folders, errorMessage = null) {
        if (!this.dialog) {
            console.error('Cannot render folder list: dialog not initialized');
            return;
        }
        
        const folderList = this.dialog.querySelector('#folderList');
        if (!folderList) {
            console.error('Cannot render folder list: folderList element not found');
            return;
        }
        
        if (errorMessage) {
            folderList.innerHTML = `<div class="loading error">${errorMessage}</div>`;
            return;
        }

        if (!folders.length) {
            folderList.innerHTML = '<div class="loading">No model folders found</div>';
            return;
        }

        folderList.innerHTML = folders.map(folder => `
            <div class="folder-item">
                <input type="checkbox" id="folder_${folder.name.replace(/[^a-zA-Z0-9]/g, '_')}" 
                       value="${JSON.stringify(folder.paths || [folder.path]).replace(/"/g, '&quot;')}" checked />
                <label for="folder_${folder.name.replace(/[^a-zA-Z0-9]/g, '_')}" class="folder-name">
                    ${folder.name}
                </label>
                <span class="folder-count">(${folder.count || 0} files)</span>
            </div>
        `).join('');
        
        // Add change listeners to update summary
        const checkboxes = folderList.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateFolderSummary(folders));
        });
        
        this.updateFolderSummary(folders);
    }

    /**
     * Update the folder selection summary
     */
    updateFolderSummary(allFolders) {
        if (!this.dialog) {
            console.error('Cannot update folder summary: dialog not initialized');
            return;
        }
        
        const selectedFolders = Array.from(this.dialog.querySelectorAll('.folder-item input:checked'))
            .map(checkbox => {
                try {
                    // Try to parse as JSON array (new format)
                    return JSON.parse(checkbox.value);
                } catch {
                    // Fallback to single path (old format)
                    return [checkbox.value];
                }
            })
            .flat(); // Flatten array of arrays into single array of paths
        
        const selectedFolderData = allFolders.filter(folder => {
            // Check if any of this folder's paths are selected
            const folderPaths = folder.paths || [folder.path];
            return folderPaths.some(path => selectedFolders.includes(path));
        });
        const totalFiles = selectedFolderData.reduce((sum, folder) => sum + (folder.count || 0), 0);
        
        const summaryElement = this.dialog.querySelector('#folderSummary');
        const selectedCountElement = this.dialog.querySelector('#selectedFolderCount');
        const totalFileCountElement = this.dialog.querySelector('#totalFileCount');
        
        if (summaryElement && selectedCountElement && totalFileCountElement) {
            selectedCountElement.textContent = selectedFolderData.length; // Number of categories, not paths
            totalFileCountElement.textContent = totalFiles;
            summaryElement.style.display = selectedFolderData.length > 0 ? 'block' : 'none';
        }
    }

    /**
     * Get selected scan options
     */
    getScanOptions() {
        if (!this.dialog) {
            console.error('Cannot get scan options: dialog not initialized');
            return {
                folders: [],
                forceRefresh: false,
                includeCached: true,
                rateLimitDelay: 1000
            };
        }
        
        const selectedFolders = Array.from(this.dialog.querySelectorAll('.folder-item input:checked'))
            .map(checkbox => {
                try {
                    // Try to parse as JSON array (new format)
                    return JSON.parse(checkbox.value);
                } catch {
                    // Fallback to single path (old format)
                    return [checkbox.value];
                }
            })
            .flat(); // Flatten array of arrays into single array of paths
        
        return {
            folders: selectedFolders,
            forceRefresh: this.dialog.querySelector('#forceRefresh').checked,
            includeCached: this.dialog.querySelector('#includeCached').checked,
            rateLimitDelay: parseInt(this.dialog.querySelector('#rateLimitDelay').value, 10)
        };
    }

    /**
     * Start the model scan process
     */
    async startScan() {
        const options = this.getScanOptions();
        
        if (!options.folders.length) {
            notifications.error('Please select at least one folder to scan');
            return;
        }

        this.isScanning = true;
        this.cancelRequested = false;
        this.scanResults = {
            totalFiles: 0,
            processed: 0,
            errors: 0,
            startTime: Date.now()
        };

        // Update UI for scanning state
        this.updateScanUI(true);
        
        try {
            // Start the scan
            await this.performScan(options);
            
            // showScanComplete is called from pollScanProgress when complete
        } catch (error) {
            console.error('Scan error:', error);
            this.addLogEntry(`Scan failed: ${error.message}`, 'error');
            notifications.error('Scan failed', error.message);
        } finally {
            this.isScanning = false;
            this.updateScanUI(false);
        }
    }

    /**
     * Perform the actual scan process
     */
    async performScan(options) {
        this.addLogEntry('Starting model scan...', 'info');
        this.updateProgress('Initializing scan...', 0);

        // Call the new POST endpoint to start the scan
        const scanData = {
            folders: options.folders,
            force: options.forceRefresh,
            include_cached: options.includeCached
        };

        try {
            // Start the scan (non-blocking)
            const startResponse = await fetch('/sage_cache/scan_model_folders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(scanData)
            });

            if (!startResponse.ok) {
                const errorText = await startResponse.text();
                throw new Error(`Server error ${startResponse.status}: ${errorText}`);
            }

            // Start polling for progress updates
            await this.pollScanProgress();
            
        } catch (error) {
            throw error;
        }
    }

    /**
     * Poll the server for scan progress updates
     */
    async pollScanProgress() {
        return new Promise((resolve, reject) => {
            const pollInterval = setInterval(async () => {
                try {
                    if (this.cancelRequested) {
                        clearInterval(pollInterval);
                        await this.cancelServerScan();
                        resolve();
                        return;
                    }

                    const response = await fetch('/sage_cache/scan_progress');
                    if (!response.ok) {
                        throw new Error(`Failed to get progress: ${response.status}`);
                    }

                    const data = await response.json();
                    
                    if (!data.success) {
                        throw new Error(data.error || 'Failed to get progress');
                    }

                    const progress = data.progress;
                    console.log('Received progress data:', progress);
                    
                    // Update UI based on progress
                    if (progress.active) {
                        // Calculate percentage
                        const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
                        
                        // Update progress display
                        const statusText = progress.current_file || progress.status || 'Processing...';
                        console.log(`Updating progress: ${statusText}, ${percentage}%`);
                        this.updateProgress(statusText, percentage);
                        
                        // Update scan results for stats display
                        this.scanResults.totalFiles = progress.total;
                        this.scanResults.processed = progress.current;
                        
                        // Log status updates
                        if (progress.status === 'discovering_folders') {
                            this.addLogEntry('Discovering model folders...', 'info');
                        } else if (progress.status === 'scanning_files') {
                            this.addLogEntry(`Found ${progress.total} files to process`, 'info');
                        } else if (progress.status === 'processing_metadata' && progress.current_file) {
                            // Only log every 10th file to avoid spam
                            if (progress.current % 10 === 0 || progress.current === progress.total) {
                                this.addLogEntry(`Processing: ${progress.current_file}`, 'success');
                            }
                        }
                        
                    } else {
                        // Scan is complete or stopped
                        clearInterval(pollInterval);
                        
                        if (progress.status === 'completed') {
                            this.updateProgress('Scan completed successfully', 100);
                            this.addLogEntry(`Scan completed: ${progress.current}/${progress.total} files processed`, 'success');
                            this.showScanComplete();
                            resolve();
                        } else if (progress.status === 'cancelled') {
                            this.updateProgress('Scan cancelled', progress.total > 0 ? (progress.current / progress.total) * 100 : 0);
                            this.addLogEntry('Scan cancelled by user', 'info');
                            resolve();
                        } else if (progress.status === 'error') {
                            this.updateProgress('Scan failed', 0);
                            this.addLogEntry(`Scan failed: ${progress.error}`, 'error');
                            reject(new Error(progress.error || 'Scan failed'));
                        } else {
                            // Unknown status, assume completion
                            this.updateProgress('Scan completed', 100);
                            this.addLogEntry('Scan completed', 'success');
                            this.showScanComplete();
                            resolve();
                        }
                    }
                    
                } catch (error) {
                    clearInterval(pollInterval);
                    console.error('Progress polling error:', error);
                    reject(error);
                }
            }, 1000); // Poll every second
        });
    }

    /**
     * Cancel the scan on the server
     */
    async cancelServerScan() {
        try {
            const response = await fetch('/sage_cache/cancel_scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                this.addLogEntry('Scan cancellation requested', 'info');
            }
        } catch (error) {
            console.error('Failed to cancel scan on server:', error);
        }
    }

    /**
     * Cancel the current scan
     */
    async cancelScan() {
        this.cancelRequested = true;
        this.addLogEntry('Cancelling scan...', 'info');
        
        // Immediately call the server to cancel
        try {
            await this.cancelServerScan();
        } catch (error) {
            console.error('Error cancelling scan:', error);
            this.addLogEntry('Error cancelling scan: ' + error.message, 'error');
        }
    }

    /**
     * Update the scan UI state
     */
    updateScanUI(scanning) {
        const startBtn = this.dialog.querySelector('#startScanBtn');
        const cancelBtn = this.dialog.querySelector('#cancelBtn');
        const progressSection = this.dialog.querySelector('#scanProgress');
        const optionsSection = this.dialog.querySelector('.scan-options');
        
        if (scanning) {
            startBtn.disabled = true;
            startBtn.textContent = 'Scanning...';
            cancelBtn.textContent = 'Cancel Scan';
            progressSection.style.display = 'block';
            optionsSection.style.display = 'none';
            
            this.startProgressTimer();
        } else {
            startBtn.disabled = false;
            startBtn.textContent = 'Start Scan';
            cancelBtn.textContent = 'Close';
            
            this.stopProgressTimer();
        }
    }

    /**
     * Start the progress timer
     */
    startProgressTimer() {
        this.progressInterval = setInterval(() => {
            if (this.scanResults.startTime) {
                const elapsed = Date.now() - this.scanResults.startTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                
                this.dialog.querySelector('#elapsedTime').textContent = timeStr;
                
                // Show file processing stats if available
                const { processed, totalFiles, errors } = this.scanResults;
                let statsText = 'Scanning model folders...';
                
                if (totalFiles > 0) {
                    statsText = `${processed}/${totalFiles} processed`;
                    if (errors > 0) {
                        statsText += `, ${errors} errors`;
                    }
                }
                
                this.dialog.querySelector('#progressStats').textContent = statsText;
            }
        }, 1000);
    }

    /**
     * Stop the progress timer
     */
    stopProgressTimer() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    /**
     * Update progress display
     */
    updateProgress(text, percentage) {
        console.log(`UpdateProgress called: ${text}, ${percentage}%`);
        
        const progressFill = this.dialog.querySelector('#progressFill');
        const progressText = this.dialog.querySelector('#progressText');
        const progressPercentage = this.dialog.querySelector('#progressPercentage');
        
        if (progressText) {
            progressText.textContent = text;
        }
        
        if (progressFill) {
            const width = `${Math.max(0, Math.min(100, percentage))}%`;
            console.log(`Setting progress bar width to: ${width}`);
            console.log('Progress fill element:', progressFill);
            console.log('Current computed style:', window.getComputedStyle(progressFill));
            
            // Set the width
            progressFill.style.width = width;
            
            // Add inline background color as fallback in case CSS variables aren't working
            progressFill.style.background = 'linear-gradient(90deg, #007acc, #005a9e)';
            progressFill.style.height = '100%';
            
            // Force a repaint to ensure the change is applied
            progressFill.offsetHeight;
            
            console.log('After setting width - computed style:', window.getComputedStyle(progressFill));
        } else {
            console.error('Progress fill element not found!');
        }
        
        if (progressPercentage) {
            progressPercentage.textContent = `${Math.round(percentage)}%`;
        }
    }

    /**
     * Add entry to scan log
     */
    addLogEntry(message, type = 'info') {
        const logContainer = this.dialog.querySelector('#scanLog');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    /**
     * Show scan completion summary
     */
    showScanComplete() {
        // This method is called from the polling system when scan completes
        // The progress and log messages are already updated in pollScanProgress
        this.scanResults.completed = true;
        notifications.success('Model scan completed successfully');
        
        // Call the completion callback if provided
        if (this.onScanComplete && typeof this.onScanComplete === 'function') {
            try {
                this.onScanComplete();
            } catch (error) {
                console.error('Error in scan completion callback:', error);
            }
        }
    }

    /**
     * Utility function for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Close and cleanup the dialog
     */
    close() {
        if (this.isScanning) {
            // Don't allow closing during scan
            return;
        }

        this.stopProgressTimer();
        
        document.removeEventListener('keydown', this.handleKeydown.bind(this));
        
        if (this.dialog) {
            this.dialog.style.opacity = '0';
            this.dialog.style.transform = 'scale(0.95)';
            
            setTimeout(() => {
                if (this.dialog && this.dialog.parentNode) {
                    this.dialog.remove();
                }
                this.dialog = null;
            }, 200);
        }
    }
}

// Export for use in other modules
export { ModelScanDialog };

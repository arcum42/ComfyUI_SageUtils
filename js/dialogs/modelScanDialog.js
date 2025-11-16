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

import { createDialog } from '../components/dialogManager.js';
import { notifications } from '../shared/notifications.js';
import { selectors } from '../shared/stateManager.js';

class ModelScanDialog {
    constructor(options = {}) {
        this.dialogObj = null;
        this.dialog = null;  // Will be the dialog container element
        this.contentArea = null;
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
        if (this.dialogObj) {
            this.dialogObj.close();
        }

        this.buildDialog();
        this.dialogObj.show();
        
        // Load available folders
        await this.loadAvailableFolders();
    }

    /**
     * Build the dialog structure using dialogManager
     */
    buildDialog() {
        // Create the main content container
        const content = document.createElement('div');
        content.style.cssText = `
            min-width: 550px;
            max-width: 600px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        `;

        // Create scan options section
        const scanOptions = this.createScanOptionsSection();
        content.appendChild(scanOptions);

        // Create progress section (hidden initially)
        const progressSection = this.createProgressSection();
        content.appendChild(progressSection);

        // Create the dialog using dialogManager
        this.dialogObj = createDialog({
            title: 'Model Metadata Scan',
            content: content,
            width: '600px',
            height: 'auto',
            showFooter: true,
            closeOnOverlayClick: false,
            onClose: () => {
                if (!this.isScanning) {
                    this.cleanup();
                }
            }
        });

        // Store references to key elements
        this.dialog = this.dialogObj.dialog;
        this.contentArea = this.dialogObj.contentArea;
        
        // Add footer buttons
        this.dialogObj.addFooterButton('Cancel', () => {
            if (this.isScanning) {
                this.cancelScan();
            } else {
                this.close();
            }
        }, { background: '#666', id: 'cancelBtn' });

        this.dialogObj.addFooterButton('Start Scan', () => {
            this.startScan();
        }, { background: '#007acc', id: 'startScanBtn' });

        // Setup keyboard handlers
        this.setupKeyboardHandlers();
    }

    /**
     * Create the scan options section
     */
    createScanOptionsSection() {
        const section = document.createElement('div');
        section.className = 'scan-options';
        section.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 16px;
        `;

        // Folder selection
        const folderGroup = this.createFolderSelectionGroup();
        section.appendChild(folderGroup);

        // Force refresh checkbox
        const forceRefreshGroup = this.createCheckboxOption(
            'forceRefresh',
            'Force metadata refresh (ignore cache)',
            'Check to re-download metadata even if recently cached. Blacklisted models are skipped unless forced.',
            false
        );
        section.appendChild(forceRefreshGroup);

        // Include cached checkbox
        const includeCachedGroup = this.createCheckboxOption(
            'includeCached',
            'Include models already in cache',
            'Uncheck to only scan new/modified models',
            true
        );
        section.appendChild(includeCachedGroup);

        // Rate limit input
        const rateLimitGroup = this.createRateLimitGroup();
        section.appendChild(rateLimitGroup);

        return section;
    }

    /**
     * Create folder selection group
     */
    createFolderSelectionGroup() {
        const group = document.createElement('div');
        group.className = 'option-group';
        group.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;

        const label = document.createElement('label');
        label.className = 'option-label';
        label.innerHTML = '<strong>Scan Folders:</strong>';
        label.style.cssText = `
            color: var(--input-text);
            font-weight: 500;
        `;

        const folderList = document.createElement('div');
        folderList.id = 'folderList';
        folderList.className = 'folder-list';
        folderList.style.cssText = `
            border: 1px solid var(--border-color);
            border-radius: 4px;
            max-height: 150px;
            overflow-y: auto;
            background: var(--comfy-input-bg);
        `;
        folderList.innerHTML = '<div class="loading" style="padding: 20px; text-align: center; color: var(--descrip-text);">Loading folders...</div>';

        const folderSummary = document.createElement('div');
        folderSummary.id = 'folderSummary';
        folderSummary.className = 'folder-summary';
        folderSummary.style.cssText = `
            display: none;
            padding: 8px 12px;
            background: var(--comfy-menu-bg);
            border: 1px solid var(--border-color);
            border-radius: 4px;
        `;
        folderSummary.innerHTML = `
            <small class="help-text" style="margin: 0; font-weight: 500; color: var(--input-text); font-size: 12px;">
                <span id="selectedFolderCount">0</span> folders selected, 
                <span id="totalFileCount">0</span> files total
            </small>
        `;

        group.appendChild(label);
        group.appendChild(folderList);
        group.appendChild(folderSummary);

        return group;
    }

    /**
     * Create a checkbox option group
     */
    createCheckboxOption(id, labelText, helpText, checked = false) {
        const group = document.createElement('div');
        group.className = 'option-group';

        const label = document.createElement('label');
        label.className = 'checkbox-label';
        label.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--input-text);
            cursor: pointer;
        `;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;
        checkbox.checked = checked;
        checkbox.style.margin = '0';

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(labelText));

        const help = document.createElement('small');
        help.className = 'help-text';
        help.textContent = helpText;
        help.style.cssText = `
            display: block;
            margin-top: 4px;
            margin-left: 24px;
            color: var(--descrip-text);
            font-size: 12px;
            line-height: 1.4;
        `;

        group.appendChild(label);
        group.appendChild(help);

        return group;
    }

    /**
     * Create rate limit input group
     */
    createRateLimitGroup() {
        const group = document.createElement('div');
        group.className = 'option-group';
        group.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;

        const label = document.createElement('label');
        label.htmlFor = 'rateLimitDelay';
        label.className = 'option-label';
        label.textContent = 'Civitai API Rate Limit (ms):';
        label.style.cssText = `
            color: var(--input-text);
            font-weight: 500;
        `;

        const input = document.createElement('input');
        input.type = 'number';
        input.id = 'rateLimitDelay';
        input.value = '1000';
        input.min = '100';
        input.max = '5000';
        input.step = '100';
        input.style.cssText = `
            width: 100px;
            padding: 6px 8px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            background: var(--comfy-input-bg);
            color: var(--input-text);
        `;

        const help = document.createElement('small');
        help.className = 'help-text';
        help.textContent = 'Delay between API requests to prevent rate limiting (recommended: 1000ms)';
        help.style.cssText = `
            display: block;
            margin-top: 4px;
            color: var(--descrip-text);
            font-size: 12px;
            line-height: 1.4;
        `;

        group.appendChild(label);
        group.appendChild(input);
        group.appendChild(help);

        return group;
    }

    /**
     * Create progress section
     */
    createProgressSection() {
        const section = document.createElement('div');
        section.id = 'scanProgress';
        section.className = 'scan-progress';
        section.style.cssText = `
            display: none;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 16px;
            background: var(--comfy-input-bg);
        `;

        // Progress info header
        const progressInfo = document.createElement('div');
        progressInfo.className = 'progress-info';
        progressInfo.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        `;

        const progressStats = document.createElement('div');
        progressStats.className = 'progress-stats';
        progressStats.style.flex = '1';

        const progressText = document.createElement('span');
        progressText.id = 'progressText';
        progressText.textContent = 'Initializing scan...';
        progressText.style.cssText = `
            display: block;
            color: var(--input-text);
            font-weight: 500;
            margin-bottom: 4px;
        `;

        const statsText = document.createElement('span');
        statsText.id = 'progressStats';
        statsText.className = 'stats-text';
        statsText.style.cssText = `
            color: var(--descrip-text);
            font-size: 13px;
        `;

        progressStats.appendChild(progressText);
        progressStats.appendChild(statsText);

        const progressTime = document.createElement('div');
        progressTime.className = 'progress-time';
        progressTime.style.cssText = `
            color: var(--descrip-text);
            font-size: 14px;
            font-family: monospace;
        `;

        const elapsedTime = document.createElement('span');
        elapsedTime.id = 'elapsedTime';
        elapsedTime.textContent = '00:00';

        progressTime.appendChild(elapsedTime);
        progressInfo.appendChild(progressStats);
        progressInfo.appendChild(progressTime);

        // Progress bar container
        const progressBarContainer = document.createElement('div');
        progressBarContainer.className = 'progress-bar-container';
        progressBarContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        `;

        const progressBar = document.createElement('div');
        progressBar.id = 'progressBar';
        progressBar.className = 'progress-bar';
        progressBar.style.cssText = `
            flex: 1;
            height: 20px;
            background: var(--comfy-menu-bg, #2a2a2a);
            border: 1px solid var(--border-color, #555);
            border-radius: 10px;
            overflow: hidden;
            position: relative;
        `;

        const progressFill = document.createElement('div');
        progressFill.id = 'progressFill';
        progressFill.className = 'progress-fill';
        progressFill.style.cssText = `
            height: 100%;
            background: linear-gradient(90deg, var(--primary-color, #007acc), var(--primary-color-hover, #005a9e));
            transition: width 0.3s ease;
            width: 0%;
        `;

        progressBar.appendChild(progressFill);

        const progressPercentage = document.createElement('div');
        progressPercentage.id = 'progressPercentage';
        progressPercentage.className = 'progress-percentage';
        progressPercentage.textContent = '0%';
        progressPercentage.style.cssText = `
            min-width: 45px;
            text-align: right;
            color: var(--input-text);
            font-family: monospace;
            font-size: 13px;
        `;

        progressBarContainer.appendChild(progressBar);
        progressBarContainer.appendChild(progressPercentage);

        // Scan log
        const scanLog = document.createElement('div');
        scanLog.id = 'scanLog';
        scanLog.className = 'scan-log';
        scanLog.style.cssText = `
            max-height: 120px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 12px;
            line-height: 1.4;
            background: var(--comfy-menu-bg);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 8px;
        `;

        section.appendChild(progressInfo);
        section.appendChild(progressBarContainer);
        section.appendChild(scanLog);

        return section;
    }

    /**
     * Setup keyboard event handlers
     */
    setupKeyboardHandlers() {
        this.handleKeydown = (e) => {
            if (e.key === 'Escape' && !this.isScanning) {
                this.close();
            }
        };
        document.addEventListener('keydown', this.handleKeydown);
    }

    /**
     * Center the dialog on screen (deprecated - dialogManager handles this)
     */
    centerDialog() {
        // No-op: dialogManager handles centering and animations
        return Promise.resolve();
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
            this._allFolders = data.folders || [];
            this.renderFolderList(this._allFolders);
        } catch (error) {
            console.error('Error loading folders:', error);
            this.renderFolderList([], 'Failed to load folders');
        }
    }

    /**
     * Render the folder selection list
     */
    renderFolderList(folders, errorMessage = null) {
        if (!this.contentArea) {
            console.error('Cannot render folder list: dialog not initialized');
            return;
        }
        
        const folderList = this.contentArea.querySelector('#folderList');
        if (!folderList) {
            console.error('Cannot render folder list: folderList element not found');
            return;
        }
        
        if (errorMessage) {
            folderList.innerHTML = `<div class="loading error" style="padding: 20px; text-align: center; color: var(--error-text);">${errorMessage}</div>`;
            return;
        }

        if (!folders.length) {
            folderList.innerHTML = '<div class="loading" style="padding: 20px; text-align: center; color: var(--descrip-text);">No model folders found</div>';
            return;
        }

        folderList.innerHTML = folders.map(folder => `
            <div class="folder-item" style="padding: 8px 12px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="folder_${folder.name.replace(/[^a-zA-Z0-9]/g, '_')}" 
                       value="${JSON.stringify(folder.paths || [folder.path]).replace(/"/g, '&quot;')}" 
                       checked style="margin: 0;" />
                <label for="folder_${folder.name.replace(/[^a-zA-Z0-9]/g, '_')}" 
                       class="folder-name" 
                       style="flex: 1; color: var(--input-text); font-family: monospace; font-size: 13px; cursor: pointer;">
                    ${folder.name}
                </label>
                <span class="folder-count" style="color: var(--descrip-text); font-size: 12px;">(${folder.count || 0} files)</span>
            </div>
        `).join('');
        
        // Add change listeners to update summary
        const checkboxes = folderList.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateFolderSummary(folders));
        });
        
        // Update summary when force toggle changes (exclude blacklisted unless forced)
        const forceToggle = this.contentArea.querySelector('#forceRefresh');
        if (forceToggle) {
            forceToggle.addEventListener('change', () => this.updateFolderSummary(this._allFolders || folders));
        }

        this.updateFolderSummary(folders);
    }

    /**
     * Update the folder selection summary
     */
    updateFolderSummary(allFolders) {
        if (!this.contentArea) {
            console.error('Cannot update folder summary: dialog not initialized');
            return;
        }
        
        const selectedFolders = Array.from(this.contentArea.querySelectorAll('.folder-item input:checked'))
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

        // Compute filtered count using cached hash/info and blacklist flag
        let totalFiles = 0;
        try {
            const force = !!(this.contentArea.querySelector('#forceRefresh')?.checked);
            const cache = selectors.cacheData() || { hash: {}, info: {} };
            const filePaths = Object.keys(cache.hash || {});

            // Build a lookup of selected base paths for quick startsWith checks
            const selectedPaths = new Set(selectedFolders);

            const hasModelExtension = (p) => {
                const lower = p.toLowerCase();
                return lower.endsWith('.safetensors') || lower.endsWith('.ckpt') || lower.endsWith('.pt') || lower.endsWith('.bin');
            };

            for (const fp of filePaths) {
                if (!hasModelExtension(fp)) continue;
                // Check if file path is within any selected folder path
                let inSelected = false;
                for (const base of selectedPaths) {
                    if (fp.startsWith(base)) { inSelected = true; break; }
                }
                if (!inSelected) continue;

                const h = cache.hash[fp];
                const info = (cache.info || {})[h] || {};
                const isBlacklisted = info && info.blacklist === true;
                if (!force && isBlacklisted) continue; // skip blacklisted unless forced
                totalFiles += 1;
            }
        } catch (e) {
            // Fallback to server-reported counts if anything goes wrong
            totalFiles = selectedFolderData.reduce((sum, folder) => sum + (folder.count || 0), 0);
        }
        
        const summaryElement = this.contentArea.querySelector('#folderSummary');
        const selectedCountElement = this.contentArea.querySelector('#selectedFolderCount');
        const totalFileCountElement = this.contentArea.querySelector('#totalFileCount');
        
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
        if (!this.contentArea) {
            console.error('Cannot get scan options: dialog not initialized');
            return {
                folders: [],
                forceRefresh: false,
                includeCached: true,
                rateLimitDelay: 1000
            };
        }
        
        const selectedFolders = Array.from(this.contentArea.querySelectorAll('.folder-item input:checked'))
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
            forceRefresh: this.contentArea.querySelector('#forceRefresh').checked,
            includeCached: this.contentArea.querySelector('#includeCached').checked,
            rateLimitDelay: parseInt(this.contentArea.querySelector('#rateLimitDelay').value, 10)
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
                        } else if (progress.status === 'hashing' && progress.current_file) {
                            // Always log when hashing begins as it can take a while
                            this.addLogEntry(`Calculating hash for ${progress.current_file}...`, 'info');
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
        const startBtn = this.dialogObj.footer.querySelector('button:last-child');
        const cancelBtn = this.dialogObj.footer.querySelector('button:first-child');
        const progressSection = this.contentArea.querySelector('#scanProgress');
        const optionsSection = this.contentArea.querySelector('.scan-options');
        
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
            cancelBtn.textContent = 'Cancel';
            
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
                
                const elapsedTimeEl = this.contentArea.querySelector('#elapsedTime');
                if (elapsedTimeEl) {
                    elapsedTimeEl.textContent = timeStr;
                }
                
                // Show file processing stats if available
                const { processed, totalFiles, errors } = this.scanResults;
                let statsText = 'Scanning model folders...';
                
                if (totalFiles > 0) {
                    statsText = `${processed}/${totalFiles} processed`;
                    if (errors > 0) {
                        statsText += `, ${errors} errors`;
                    }
                }
                
                const progressStatsEl = this.contentArea.querySelector('#progressStats');
                if (progressStatsEl) {
                    progressStatsEl.textContent = statsText;
                }
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
        
        const progressFill = this.contentArea.querySelector('#progressFill');
        const progressText = this.contentArea.querySelector('#progressText');
        const progressPercentage = this.contentArea.querySelector('#progressPercentage');
        
        if (progressText) {
            progressText.textContent = text;
        }
        
        if (progressFill) {
            const width = `${Math.max(0, Math.min(100, percentage))}%`;
            console.log(`Setting progress bar width to: ${width}`);
            
            // Set the width
            progressFill.style.width = width;
            
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
        const logContainer = this.contentArea.querySelector('#scanLog');
        if (!logContainer) {
            console.error('Cannot add log entry: scanLog element not found');
            return;
        }
        
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.style.cssText = `
            margin-bottom: 2px;
            color: var(--descrip-text);
        `;
        
        // Add type-specific colors
        if (type === 'success') {
            entry.style.color = 'var(--success-text, #4CAF50)';
        } else if (type === 'error') {
            entry.style.color = 'var(--error-text, #f44336)';
        } else if (type === 'info') {
            entry.style.color = 'var(--info-text, #2196F3)';
        }
        
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
     * Cleanup resources
     */
    cleanup() {
        this.stopProgressTimer();
        
        if (this.handleKeydown) {
            document.removeEventListener('keydown', this.handleKeydown);
            this.handleKeydown = null;
        }
        
        this.dialogObj = null;
        this.dialog = null;
        this.contentArea = null;
    }

    /**
     * Close and cleanup the dialog
     */
    close() {
        if (this.isScanning) {
            // Don't allow closing during scan
            return;
        }

        if (this.dialogObj) {
            this.dialogObj.close();
        }
        
        this.cleanup();
    }
}

// Export for use in other modules
export { ModelScanDialog };

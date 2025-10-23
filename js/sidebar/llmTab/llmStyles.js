/**
 * LLM Tab Styles
 * All CSS-in-JS styles for the LLM tab
 */

/**
 * Add LLM tab styles to the document
 */
export function addLLMStyles() {
    const styleId = 'llm-tab-styles';
    
    // Remove existing styles if they exist
    const existingStyles = document.getElementById(styleId);
    if (existingStyles) {
        existingStyles.remove();
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        /* Main container */
        .llm-tab {
            height: 100%;
            display: flex;
            flex-direction: column;
            background: var(--bg-color, #1a1a1a);
            color: var(--fg-color, #ffffff);
            font-family: var(--font-family, 'Segoe UI', sans-serif);
        }

        .llm-wrapper {
            height: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* Header */
        .llm-header {
            padding: 16px;
            border-bottom: 1px solid var(--border-color, #444);
            background: var(--bg-color-secondary, #2a2a2a);
        }

        .llm-title {
            margin: 0 0 8px 0;
            font-size: 20px;
            font-weight: 600;
            color: var(--primary-color, #4a9eff);
        }

        .llm-description {
            margin: 0;
            font-size: 14px;
            color: var(--text-secondary, #cccccc);
            line-height: 1.4;
        }

        /* Model selection */
        .llm-model-selection {
            padding: 12px;
            border-bottom: 1px solid var(--border-color, #444);
            background: var(--bg-color-tertiary, #1e1e1e);
        }

        .llm-selection-row {
            display: flex;
            gap: 8px;
            align-items: flex-end;
            margin-bottom: 8px;
        }

        .llm-selection-row:last-child {
            margin-bottom: 0;
        }

        .llm-form-group {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .llm-label {
            font-size: 11px;
            font-weight: 500;
            color: var(--text-secondary, #cccccc);
        }

        .llm-select {
            padding: 5px 10px;
            background: var(--bg-color, #1a1a1a);
            border: 1px solid var(--border-color, #444);
            border-radius: 4px;
            color: var(--fg-color, #ffffff);
            font-size: 11px;
            cursor: pointer;
            transition: border-color 0.2s, box-shadow 0.2s;
            line-height: 1.4;
            height: 28px;
        }

        .llm-select:hover {
            border-color: var(--primary-color, #4a9eff);
        }

        .llm-select:focus {
            outline: none;
            border-color: var(--primary-color, #4a9eff);
            box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.2);
        }

        .llm-select:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* Status indicator */
        .llm-status-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
            color: var(--text-secondary, #cccccc);
        }

        .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            animation: pulse 2s ease-in-out infinite;
        }

        .status-dot.status-online {
            background: #6bcf7f;
            box-shadow: 0 0 8px rgba(107, 207, 127, 0.5);
        }

        .status-dot.status-offline {
            background: #888;
        }

        .status-dot.status-error {
            background: #f44336;
            box-shadow: 0 0 8px rgba(244, 67, 54, 0.5);
        }

        .status-dot.status-loading {
            background: #4a9eff;
            animation: pulse 1s ease-in-out infinite;
        }

        .status-dot.status-disabled {
            background: #666;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        /* Vision section */
        .llm-vision-section {
            padding: 16px;
            border-bottom: 1px solid var(--border-color, #444);
            background: var(--bg-color-secondary, #2a2a2a);
        }

        .llm-vision-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }

        .llm-image-count {
            font-size: 11px;
            color: var(--text-secondary, #cccccc);
            margin-left: auto;
            margin-right: 12px;
        }

        .llm-clear-all-images-btn {
            font-size: 11px;
            padding: 4px 10px;
        }

        /* Upload zone */
        .llm-upload-zone {
            border: 2px dashed var(--border-color, #444);
            border-radius: 8px;
            padding: 32px 16px;
            text-align: center;
            cursor: pointer;
            background: var(--bg-color, #1a1a1a);
            transition: border-color 0.2s, background-color 0.2s;
        }

        .llm-upload-zone:hover {
            border-color: var(--primary-color, #4a9eff);
            background: var(--bg-color-tertiary, #222);
        }

        .llm-upload-zone.drag-over {
            border-color: var(--primary-color, #4a9eff);
            background: rgba(74, 158, 255, 0.1);
        }

        .llm-upload-icon {
            font-size: 48px;
            margin-bottom: 12px;
        }

        .llm-upload-text {
            color: var(--text-secondary, #cccccc);
        }

        .llm-upload-text strong {
            display: block;
            color: var(--fg-color, #ffffff);
            margin-bottom: 8px;
            font-size: 12px;
        }

        .llm-upload-text span {
            font-size: 11px;
            color: var(--text-tertiary, #999);
        }

        .llm-file-input {
            display: none;
        }

        /* Image preview grid */
        .llm-image-preview-grid {
            /* Grid layout now handled by createResponsiveGrid() component */
        }

        .llm-image-preview-item {
            position: relative;
            aspect-ratio: 1;
            border-radius: 8px;
            overflow: hidden;
            background: var(--bg-color, #1a1a1a);
            border: 1px solid var(--border-color, #444);
        }

        .llm-preview-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .llm-remove-image-btn {
            position: absolute;
            top: 4px;
            right: 4px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border: none;
            font-size: 18px;
            line-height: 1;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s;
        }

        .llm-remove-image-btn:hover {
            background: rgba(244, 67, 54, 0.9);
        }

        /* Input section */
        .llm-input-section {
            padding: 12px;
            border-bottom: 1px solid var(--border-color, #444);
            background: var(--bg-color-secondary, #2a2a2a);
        }

        .llm-input-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .llm-section-title {
            margin: 0;
            font-size: 12px;
            font-weight: 500;
            color: var(--fg-color, #ffffff);
        }

        .llm-char-counter {
            font-size: 11px;
            color: var(--text-secondary, #888);
        }

        .llm-textarea {
            width: 100%;
            padding: 10px;
            background: var(--bg-color, #1a1a1a);
            border: 1px solid var(--border-color, #444);
            border-radius: 4px;
            color: var(--fg-color, #ffffff);
            font-size: 12px;
            font-family: var(--font-family, 'Segoe UI', sans-serif);
            resize: vertical;
            min-height: 80px;
            transition: border-color 0.2s, box-shadow 0.2s;
        }

        .llm-textarea:focus {
            outline: none;
            border-color: var(--primary-color, #4a9eff);
            box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.2);
        }

        .llm-textarea::placeholder {
            color: var(--text-secondary, #666);
        }

        .llm-action-buttons {
            display: flex;
            gap: 8px;
            margin: 12px 0;
        }

        /* Advanced options section */
        .llm-advanced-section {
            border-bottom: 1px solid var(--border-color, #444);
            background: var(--bg-color-tertiary, #1e1e1e);
        }

        .llm-advanced-header {
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            background: var(--bg-color-secondary, #2a2a2a);
            transition: background-color 0.2s;
        }

        .llm-advanced-header:hover {
            background: var(--bg-color-tertiary, #333);
        }
        
        .llm-header-actions {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        
        .llm-reset-settings-btn {
            font-size: 11px;
            padding: 4px 8px !important;
            opacity: 0.8;
        }
        
        .llm-reset-settings-btn:hover {
            opacity: 1;
        }

        .llm-collapse-btn {
            background: none;
            border: none;
            color: var(--fg-color, #ffffff);
            font-size: 11px;
            cursor: pointer;
            padding: 4px 8px;
            transition: transform 0.2s;
        }

        .llm-advanced-content {
            padding: 16px;
        }

        .llm-settings-row {
            display: flex;
            gap: 16px;
            margin-bottom: 16px;
        }

        .llm-settings-row .llm-form-group {
            flex: 1;
        }

        .llm-subsection-title {
            margin: 12px 0 8px 0 !important;
            font-size: 12px !important;
            font-weight: 500;
            color: var(--primary-color, #4a9eff);
            border-bottom: 1px solid var(--border-color, #444);
            padding-bottom: 4px !important;
        }

        .llm-ollama-settings {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid var(--border-color, #444);
        }

        .llm-lmstudio-settings {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid var(--border-color, #444);
        }
        
        /* Shared collapsible section styling */
        .llm-collapsible-section-header {
            font-size: 12px !important;
            padding-bottom: 6px !important;
            margin-bottom: 8px !important;
        }
        
        .llm-collapsible-section-arrow {
            font-size: 10px !important;
            margin-right: 4px;
        }
        
        .llm-collapsible-section-content {
            padding: 8px !important;
        }
        
        /* Apply to Advanced Options collapsible sections */
        .llm-advanced-options .llm-system-prompt-section > div:first-child,
        .llm-advanced-options .llm-template-section > div:first-child,
        .llm-advanced-options .llm-ollama-options > div:first-child,
        .llm-advanced-options .llm-lmstudio-options > div:first-child {
            font-size: 12px !important;
            padding-bottom: 6px !important;
            margin-bottom: 8px !important;
        }
        
        .llm-advanced-options .llm-system-prompt-section > div:first-child > span:first-child,
        .llm-advanced-options .llm-template-section > div:first-child > span:first-child,
        .llm-advanced-options .llm-ollama-options > div:first-child > span:first-child,
        .llm-advanced-options .llm-lmstudio-options > div:first-child > span:first-child {
            font-size: 10px !important;
            margin-right: 4px;
        }
        
        .llm-advanced-options .llm-system-prompt-section > div:last-child,
        .llm-advanced-options .llm-template-section > div:last-child,
        .llm-advanced-options .llm-ollama-options > div:last-child,
        .llm-advanced-options .llm-lmstudio-options > div:last-child {
            padding: 8px !important;
        }

        /* Template selector */
        .llm-template-selector-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .llm-category-select,
        .llm-template-select {
            width: 100%;
        }

        /* Prompt extras */
        .llm-prompt-extras {
            margin: 16px 0;
        }

        .llm-extras-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 8px;
            margin-top: 12px;
        }

        /* Style the checkbox container (the outer box) */
        .checkbox-container.llm-extra-checkbox {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: var(--bg-color, #1a1a1a);
            border: 1px solid var(--border-color, #444);
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s, border-color 0.2s;
            margin-bottom: 0; /* Override formElements default */
            min-height: 36px; /* Ensure consistent height */
        }

        .checkbox-container.llm-extra-checkbox:hover {
            background: var(--bg-color-tertiary, #222);
            border-color: var(--primary-color, #4a9eff);
        }

        /* Style the actual checkbox input inside */
        .checkbox-container.llm-extra-checkbox input[type="checkbox"] {
            cursor: pointer;
            width: 16px;
            height: 16px;
            flex-shrink: 0;
        }

        /* Style the label text inside */
        .checkbox-container.llm-extra-checkbox label {
            font-size: 13px;
            color: var(--fg-color, #ffffff);
            user-select: none;
            cursor: pointer;
            margin: 0;
            flex: 1;
        }

        /* Sliders */
        .llm-slider-container,
        .slider-container.llm-slider-container {
            display: flex;
            flex-direction: column;
            margin-bottom: 6px !important;
            gap: 1px;
        }
        
        .llm-slider-container > div:first-child,
        .slider-container.llm-slider-container > div:first-child {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1px !important;
        }
        
        .llm-slider-container label,
        .slider-container.llm-slider-container label {
            font-size: 11px !important;
            margin-bottom: 0 !important;
            color: var(--fg-color, #ffffff);
        }

        .llm-slider,
        input[type="range"].llm-slider {
            -webkit-appearance: none;
            appearance: none;
            flex: 1;
            width: 100%;
            height: 16px;
            background: transparent;
            border: none;
            outline: none;
            cursor: pointer;
            margin: 0 !important;
            padding: 0 !important;
        }

        .llm-slider::-webkit-slider-thumb,
        input[type="range"].llm-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--bg-color, #1a1a1a);
            border: 2px solid var(--primary-color, #4a9eff);
            cursor: pointer;
            transition: border-color 0.2s, transform 0.1s, background-color 0.2s;
            margin-top: 0;
        }

        .llm-slider::-webkit-slider-thumb:hover,
        input[type="range"].llm-slider::-webkit-slider-thumb:hover {
            border-color: var(--primary-light, #5ba9ff);
            background: var(--bg-color-secondary, #222);
            transform: scale(1.2);
        }

        .llm-slider::-moz-range-thumb,
        input[type="range"].llm-slider::-moz-range-thumb {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--bg-color, #1a1a1a);
            border: 2px solid var(--primary-color, #4a9eff);
            cursor: pointer;
            transition: border-color 0.2s, transform 0.1s, background-color 0.2s;
        }

        .llm-slider::-moz-range-thumb:hover,
        input[type="range"].llm-slider::-moz-range-thumb:hover {
            border-color: var(--primary-light, #5ba9ff);
            background: var(--bg-color-secondary, #222);
            transform: scale(1.2);
        }
        
        /* Firefox specific track styling */
        .llm-slider::-moz-range-track,
        input[type="range"].llm-slider::-moz-range-track {
            width: 100%;
            height: 2px;
            background: var(--primary-color, #4a9eff);
            border: none;
            border-radius: 0;
        }
        
        /* Webkit specific track styling */
        .llm-slider::-webkit-slider-runnable-track,
        input[type="range"].llm-slider::-webkit-slider-runnable-track {
            width: 100%;
            height: 2px;
            background: var(--primary-color, #4a9eff);
            border: none;
            border-radius: 0;
        }

        .llm-slider-value,
        .slider-value.llm-slider-value {
            min-width: 35px;
            text-align: right;
            font-size: 10px !important;
            font-weight: 500;
            color: var(--primary-color, #4a9eff);
        }

        /* Number inputs */
        .llm-input {
            width: 100%;
            padding: 8px 12px;
            background: var(--bg-color, #1a1a1a);
            border: 1px solid var(--border-color, #444);
            border-radius: 4px;
            color: var(--fg-color, #ffffff);
            font-size: 14px;
            transition: border-color 0.2s, box-shadow 0.2s;
        }

        .llm-input:focus {
            outline: none;
            border-color: var(--primary-color, #4a9eff);
            box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.2);
        }

        /* Seed input container */
        .llm-seed-container {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .llm-seed-container .llm-input {
            flex: 1;
        }

        .llm-random-seed-btn {
            padding: 8px 12px;
            font-size: 16px;
        }

        /* Max tokens container */
        .llm-max-tokens-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .llm-token-presets {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
        }

        .llm-token-presets .llm-btn {
            padding: 4px 10px;
            font-size: 12px;
        }

        /* System prompt container */
        .llm-system-prompt-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .llm-system-prompt {
            min-height: 80px;
        }

        .llm-clear-system-btn {
            align-self: flex-end;
        }

        /* Response section */
        .llm-response-section {
            flex: 1;
            padding: 12px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .llm-response-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .llm-response-actions {
            display: flex;
            gap: 6px;
        }

        .llm-response-display {
            flex: 1;
            padding: 10px;
            background: var(--bg-color-tertiary, #1e1e1e);
            border: 1px solid var(--border-color, #444);
            border-radius: 4px;
            color: var(--fg-color, #ffffff);
            font-size: 12px;
            font-family: var(--font-family-mono, 'Consolas', monospace);
            line-height: 1.5;
            overflow-y: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .llm-response-display.generating {
            border-color: var(--primary-color, #4a9eff);
            box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.1);
        }

        .llm-placeholder {
            color: var(--text-secondary, #666);
            font-style: italic;
            text-align: center;
            margin-top: 12px;
            font-size: 11px;
            padding: 8px;
        }

        /* Buttons */
        .llm-btn {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s, transform 0.1s, opacity 0.2s, box-shadow 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        .llm-btn:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }

        .llm-btn:active:not(:disabled) {
            transform: translateY(0);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        .llm-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        .llm-btn:focus {
            outline: 2px solid var(--primary-color, #4a9eff);
            outline-offset: 2px;
        }

        .llm-btn-primary {
            background: linear-gradient(135deg, #4a9eff 0%, #357abd 100%);
            color: white;
        }

        .llm-btn-primary:hover:not(:disabled) {
            background: linear-gradient(135deg, #5ba9ff 0%, #4686c9 100%);
            box-shadow: 0 2px 6px rgba(74, 158, 255, 0.4);
        }

        .llm-btn-secondary {
            background: var(--bg-color-secondary, #2a2a2a);
            color: var(--fg-color, #ffffff);
            border: 1px solid var(--border-color, #444);
        }

        .llm-btn-secondary:hover:not(:disabled) {
            background: var(--bg-color-tertiary, #333);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }

        .llm-btn-danger {
            background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
            color: white;
        }

        .llm-btn-danger:hover:not(:disabled) {
            background: linear-gradient(135deg, #f55549 0%, #e13f38 100%);
            box-shadow: 0 2px 6px rgba(244, 67, 54, 0.4);
        }

        .llm-btn-small {
            padding: 4px 10px;
            font-size: 11px;
        }

        .llm-send-btn {
            width: 100%;
            padding: 10px;
            margin-top: 10px;
            font-size: 12px;
        }

        /* Status messages */
        .llm-status-message {
            margin-top: 10px;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
        }

        .llm-status-info {
            background: rgba(74, 158, 255, 0.15);
            border: 1px solid rgba(74, 158, 255, 0.3);
            color: #4a9eff;
        }

        .llm-status-success {
            background: rgba(107, 207, 127, 0.15);
            border: 1px solid rgba(107, 207, 127, 0.3);
            color: #6bcf7f;
        }

        .llm-status-warning {
            background: rgba(255, 167, 38, 0.15);
            border: 1px solid rgba(255, 167, 38, 0.3);
            color: #ffa726;
        }

        .llm-status-error {
            background: rgba(244, 67, 54, 0.15);
            border: 1px solid rgba(244, 67, 54, 0.3);
            color: #f44336;
        }

        /* Provider-specific colors */
        .llm-provider-select option[value="ollama"] {
            color: #6bcf7f;
        }

        .llm-provider-select option[value="lmstudio"] {
            color: #4a9eff;
        }

        /* History section */
        .llm-history-section {
            padding: 12px;
            border-top: 1px solid var(--border-color, #444);
            background: var(--bg-color-secondary, #2a2a2a);
        }
        
        /* Subsection headers */
        .llm-subsection-header {
            font-size: 11px;
            font-weight: 600;
            color: var(--text-secondary, #999);
            text-transform: uppercase;
            margin: 0 0 8px 0;
            padding: 0;
        }
        
        /* Apply compact styling to history section header */
        .llm-history-section > div:first-child {
            font-size: 12px !important;
            padding-bottom: 6px !important;
            margin-bottom: 8px !important;
        }
        
        /* Make history section arrow smaller */
        .llm-history-section > div:first-child > span:first-child {
            font-size: 10px !important;
            margin-right: 4px;
        }
        
        /* Reduce content padding in history section */
        .llm-history-section > div:last-child {
            padding: 8px !important;
        }

        .llm-history-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            user-select: none;
        }

        .llm-header-actions {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .llm-history-content {
            max-height: 500px;
            overflow-y: auto;
        }

        .llm-conversation-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .llm-conversation-item {
            padding: 12px;
            background: var(--bg-color-tertiary, #1e1e1e);
            border: 1px solid var(--border-color, #444);
            border-radius: 4px;
            cursor: pointer;
            transition: border-color 0.2s, background-color 0.2s;
        }

        .llm-conversation-item:hover {
            border-color: var(--primary-color, #4a9eff);
            background: var(--bg-color, #1a1a1a);
        }

        .llm-conversation-item.active {
            border-color: var(--primary-color, #4a9eff);
            background: rgba(74, 158, 255, 0.1);
        }

        .llm-conversation-item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }

        .llm-conversation-item-title {
            font-size: 12px;
            font-weight: 500;
            color: var(--fg-color, #ffffff);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            flex: 1;
            margin-right: 8px;
        }

        .llm-conversation-item-actions {
            display: flex;
            gap: 4px;
            opacity: 0;
            transition: opacity 0.2s;
        }

        .llm-conversation-item:hover .llm-conversation-item-actions {
            opacity: 1;
        }

        .llm-conversation-item-meta {
            font-size: 11px;
            color: var(--text-secondary, #999);
        }

        /* History list (message display) */
        .llm-history-list {
            max-height: 400px;
            overflow-y: auto;
            margin-bottom: 8px;
        }

        .llm-history-empty {
            color: var(--text-secondary, #666);
            font-style: italic;
            text-align: center;
            font-size: 11px;
            padding: 8px;
            margin: 0;
        }

        .llm-history-item {
            margin-bottom: 8px;
            background: var(--bg-color-tertiary, #1e1e1e);
            border: 1px solid var(--border-color, #444);
            border-radius: 4px;
        }

        .llm-history-item.collapsed {
            background: var(--bg-color-secondary, #2a2a2a);
        }

        .llm-history-user {
            border-left: 3px solid var(--primary-color, #4a9eff);
        }

        .llm-history-assistant {
            border-left: 3px solid #4caf50;
        }

        .llm-history-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            font-size: 11px;
            color: var(--text-secondary, #999);
            cursor: pointer;
            user-select: none;
            transition: background-color 0.2s;
        }

        .llm-history-header:hover {
            background: rgba(255, 255, 255, 0.03);
        }

        .llm-history-toggle {
            font-size: 8px;
            color: var(--text-secondary, #999);
            transition: transform 0.2s;
            flex-shrink: 0;
        }

        .llm-history-role {
            font-weight: 600;
            color: var(--fg-color, #ffffff);
            flex-shrink: 0;
        }

        .llm-history-timestamp {
            font-size: 10px;
            flex: 1;
        }

        .llm-history-delete {
            background: transparent;
            border: none;
            color: #f44336;
            cursor: pointer;
            font-size: 16px;
            padding: 0 4px;
            transition: color 0.2s;
            flex-shrink: 0;
        }

        .llm-history-delete:hover {
            color: #ff5252;
        }

        .llm-history-content-container {
            padding: 0 8px 8px 8px;
        }

        .llm-history-content {
            color: var(--fg-color, #ffffff);
            font-size: 12px;
            font-family: var(--font-family-mono, 'Consolas', monospace);
            line-height: 1.5;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        .llm-history-images {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 8px;
        }

        .llm-history-image {
            max-width: 150px;
            max-height: 150px;
            border-radius: 4px;
            border: 1px solid var(--border-color, #444);
        }

        .llm-history-actions {
            display: flex;
            gap: 6px;
            align-items: center;
            margin-top: 8px;
        }

        .llm-btn-icon {
            background: transparent;
            border: none;
            color: var(--fg-color, #ffffff);
            cursor: pointer;
            padding: 4px 6px;
            font-size: 12px;
            border-radius: 4px;
            transition: background-color 0.2s;
        }

        .llm-btn-icon:hover {
            background: var(--bg-color, #1a1a1a);
        }

        .llm-btn-danger-icon {
            color: #f44336;
        }

        .llm-btn-danger-icon:hover {
            background: rgba(244, 67, 54, 0.2);
        }

        .llm-export-menu {
            background: var(--bg-color-secondary, #2a2a2a);
            border: 1px solid var(--border-color, #444);
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            min-width: 150px;
        }

        .llm-export-menu-item {
            display: block;
            width: 100%;
            padding: 10px 14px;
            background: transparent;
            border: none;
            color: var(--fg-color, #ffffff);
            font-size: 13px;
            text-align: left;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        .llm-export-menu-item:hover {
            background: var(--bg-color-tertiary, #333);
        }

        .llm-export-menu-item:first-child {
            border-radius: 4px 4px 0 0;
        }

        .llm-export-menu-item:last-child {
            border-radius: 0 0 4px 4px;
        }

        /* Preset controls */
        .llm-preset-actions {
            display: flex;
            gap: 6px;
            align-items: flex-end;
            flex: 0 0 auto;
            margin-bottom: 1px;
        }

        /* Modal overlay */
        .llm-modal-overlay {
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
            backdrop-filter: blur(4px);
        }

        .llm-modal-content {
            background: var(--bg-color-secondary, #2a2a2a);
            border: 1px solid var(--border-color, #444);
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            padding: 24px;
            position: relative;
        }

        .llm-modal-large {
            max-width: 800px;
        }

        .llm-modal-title {
            margin: 0 0 20px 0;
            font-size: 18px;
            font-weight: 600;
            color: var(--fg-color, #ffffff);
        }

        .llm-modal-close {
            position: absolute;
            top: 16px;
            right: 16px;
            background: transparent;
            border: none;
            color: var(--text-secondary, #999);
            font-size: 28px;
            line-height: 1;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-center;
            border-radius: 4px;
            transition: background-color 0.2s, color 0.2s;
        }

        .llm-modal-close:hover {
            background: var(--bg-color-tertiary, #333);
            color: var(--fg-color, #ffffff);
        }

        .llm-modal-buttons {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 24px;
        }

        /* Preset forms */
        .llm-preset-form,
        .llm-system-prompt-form {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        /* Tabs within modal */
        .llm-tab-nav {
            display: flex;
            gap: 8px;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--border-color, #444);
            padding-bottom: 8px;
        }

        .llm-tab-btn {
            background: transparent;
            border: none;
            color: var(--text-secondary, #999);
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            padding: 8px 16px;
            border-radius: 4px 4px 0 0;
            transition: background-color 0.2s, color 0.2s;
        }

        .llm-tab-btn:hover {
            background: var(--bg-color-tertiary, #333);
            color: var(--fg-color, #ffffff);
        }

        .llm-tab-btn.active {
            background: var(--bg-color-tertiary, #333);
            color: var(--primary-color, #4a9eff);
            border-bottom: 2px solid var(--primary-color, #4a9eff);
        }

        .llm-tab-content {
            min-height: 300px;
        }

        /* Preset list */
        .llm-preset-list,
        .llm-system-prompt-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            max-height: 500px;
            overflow-y: auto;
        }

        .llm-preset-item,
        .llm-system-prompt-item {
            display: flex;
            gap: 12px;
            padding: 16px;
            background: var(--bg-color, #1a1a1a);
            border: 1px solid var(--border-color, #444);
            border-radius: 6px;
            transition: border-color 0.2s;
        }

        .llm-preset-item:hover,
        .llm-system-prompt-item:hover {
            border-color: var(--primary-color, #4a9eff);
        }

        .llm-preset-info,
        .llm-system-prompt-info {
            flex: 1;
        }

        .llm-preset-item-name,
        .llm-system-prompt-item-name {
            font-size: 15px;
            font-weight: 500;
            color: var(--fg-color, #ffffff);
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .llm-builtin-badge {
            display: inline-block;
            background: rgba(74, 158, 255, 0.2);
            color: var(--primary-color, #4a9eff);
            font-size: 11px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .llm-override-badge {
            background: rgba(255, 193, 7, 0.2);
            color: var(--warning-color, #ffc107);
        }

        .llm-info-message {
            background: rgba(74, 158, 255, 0.1);
            border-left: 3px solid var(--primary-color, #4a9eff);
            padding: 12px;
            margin: 12px 0;
            border-radius: 4px;
            font-size: 13px;
            line-height: 1.5;
        }

        .llm-info-message strong {
            color: var(--primary-color, #4a9eff);
        }

        .llm-preset-item-desc,
        .llm-system-prompt-item-desc {
            font-size: 13px;
            color: var(--text-secondary, #999);
            line-height: 1.4;
        }

        .llm-preset-item-actions,
        .llm-system-prompt-item-actions {
            display: flex;
            gap: 8px;
            align-items: flex-start;
            flex-shrink: 0;
        }

        /* Responsive adjustments */
        @media (max-width: 600px) {
            .llm-selection-row {
                flex-direction: column;
            }

            .llm-form-group {
                width: 100%;
            }
        }
    `;
    
    document.head.appendChild(style);
}

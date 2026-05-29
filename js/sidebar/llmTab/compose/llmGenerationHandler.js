/**
 * LLM Generation Handler
 * Handles text and vision generation with streaming support
 */

import * as llmApi from '../../../llm/llmApi.js';
import { loadModel } from '../../../llm/llmApi.js';
import { copyTextToSelectedNode } from '../../../utils/textCopyUtils.js';
import { copyTextFromSelectedNode } from '../../../utils/textCopyFromNode.js';
import { alertDialog } from '../../../components/dialogManager.js';
import { getModelCapabilityFlags } from '../../../llm/llmProviders.js';
import { clearResponseTranscript, appendResponseText, appendReasoningText, getTranscriptText, getResponseText, setResponseText } from './llmResponseSection.js';

let errorDialogOpen = false;
let lastErrorDialogMessage = '';
let lastErrorDialogTime = 0;

/**
 * Handle send button click - start generation
 * @param {Object} state - Tab state object
 * @param {HTMLTextAreaElement} textarea - Prompt textarea
 * @param {HTMLElement} responseSection - Response section
 * @param {HTMLButtonElement} sendBtn - Send button
 * @param {HTMLButtonElement} stopBtn - Stop button
 * @param {HTMLElement} historySection - History section (optional)
 * @param {Function} updateConversationList - Function to update conversation list UI
 */
export async function handleSend(state, textarea, responseSection, sendBtn, stopBtn, historySection, updateConversationList) {
    let prompt = textarea.value.trim();
    
    if (!prompt) {
        showStatus(responseSection, 'Please enter a prompt', 'error');
        return;
    }
    
    // Apply selected extras to the prompt
    if (state.prompts?.extra && state.selectedExtras) {
        let extrasText = '';
        Object.entries(state.selectedExtras).forEach(([key, enabled]) => {
            if (enabled && state.prompts.extra[key]) {
                const extra = state.prompts.extra[key];
                if (extra.prompt) {
                    extrasText += extra.prompt + '\n\n';
                }
            }
        });
        
        if (extrasText) {
            // Add extras to the prompt
            prompt = prompt + '\n\n' + extrasText.trim();
        }
    }

    // Compose mode is one-shot by design: each send starts a fresh thread.
    if (state.activeSubtab === 'compose') {
        startNewConversation(state);
        showStatus(responseSection, 'Compose mode: started a new thread', 'info');
    }
    
    // Include conversation history if enabled
    if (state.settings.includeHistory && state.currentConversationMessages.length > 0) {
        const maxMessages = state.settings.maxHistoryMessages || 10;
        const recentMessages = state.currentConversationMessages.slice(-maxMessages);
        
        let historyText = '\n\n--- Previous conversation ---\n';
        recentMessages.forEach(msg => {
            const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
            historyText += `\n${roleLabel}: ${msg.content}\n`;
        });
        historyText += '--- End of previous conversation ---\n\n';
        historyText += 'Current message:\n';
        
        prompt = historyText + prompt;
    }
    
    if (!state.model) {
        showStatus(responseSection, 'Please select a model', 'error');
        return;
    }
    
    if (state.generating) {
        return; // Already generating
    }
    
    // Check if we should skip saving to history
    const skipSaveCheckbox = document.querySelector('.llm-skip-save-checkbox');
    const skipSave = skipSaveCheckbox && skipSaveCheckbox.checked;
    
    // Store the original prompt in state for potential later saving
    if (skipSave) {
        const originalPrompt = textarea.value.trim();
        state._unsavedPrompt = originalPrompt;
        state._unsavedProvider = state.provider;
        state._unsavedModel = state.model;
    }
    
    // Update empty message to indicate skip save status
    if (skipSave) {
        const emptyMessage = historySection.querySelector('.llm-history-empty');
        if (emptyMessage) {
            emptyMessage.textContent = 'History saving disabled for this generation';
            emptyMessage.classList.remove('llm-hidden');
        }
    }
    
    // Save user message to conversation history (unless skip save is checked)
    if (!skipSave) {
        const originalPrompt = textarea.value.trim(); // Save original without extras
        addMessageToHistory(state, 'user', originalPrompt, {
            provider: state.provider,
            model: state.model
        });
    }
    
    // Clear any previous error/status when starting new generation
    showStatus(responseSection, '', '');
    updatePhaseBadge(responseSection, 'loading-model', 'Loading model');
    
    // Update UI for generation
    state.generating = true;
    sendBtn.disabled = true;
    stopBtn.classList.remove('llm-hidden');
    const copyBtn = responseSection.querySelector('.llm-copy-btn');
    const copyToNodeBtn = responseSection.querySelector('.llm-copy-to-node-btn');
    const sendToPromptBtn = responseSection.querySelector('.llm-send-to-prompt-btn');
    if (copyBtn) copyBtn.classList.add('llm-hidden');
    if (copyToNodeBtn) copyToNodeBtn.classList.add('llm-hidden');
    if (sendToPromptBtn) sendToPromptBtn.classList.add('llm-hidden');
    
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    if (responseDisplay) {
        responseDisplay.classList.add('generating');
    }

    // Phase 1: show loading spinner
    showLoadingOverlay(responseDisplay, state.model);
    showStatus(responseSection, 'Loading model...', 'info');
    updatePhaseBadge(responseSection, 'loading-model', 'Loading model');

    try {
        // Pre-load the model so the user sees the phase boundary
        const keepAlive = state.settings?.keepAlive ?? 60;
        await loadModel({
            provider: state.provider,
            model: state.model,
            keep_alive: keepAlive,
        });
    } catch (loadError) {
        // Preload is a readiness check; if it fails, stop here and surface the error.
        console.error('[LLM] Model preload failed:', loadError);
        const baseMessage = loadError?.message || 'Model preload failed';
        const preloadMessage = `Model preload failed before generation: ${baseMessage}`;
        const wrappedError = new Error(preloadMessage);
        if (loadError && typeof loadError === 'object') {
            Object.assign(wrappedError, loadError);
        }
        onGenerationError(state, wrappedError, responseSection, sendBtn, stopBtn);
        return;
    }

    // Phase 2: switch to generation view
    clearResponseTranscript(responseSection);
    showStatus(responseSection, 'Generating...', 'info');
    updatePhaseBadge(responseSection, 'generating', 'Generating');

    try {
        let fullResponse = '';
        let terminalStateHandled = false;

        // Helper: clear overlay on first real chunk
        let overlayCleared = false;
        const clearOverlayOnce = () => {
            if (!overlayCleared) {
                overlayCleared = true;
                const overlay = responseDisplay.querySelector('.llm-loading-overlay');
                if (overlay) {
                    overlay.remove();
                }
            }
        };

        // Build options from state settings
        const options = buildGenerationOptions(state);

        // Check if we have images (vision mode)
        const hasImages = state.images && state.images.length > 0;

        if (hasImages) {
            // Use vision API
            const images = state.images.map(img => img.base64);

            // Debug: Log first image info
            console.log('[LLM] Sending images to API:', {
                count: images.length,
                firstImageLength: images[0]?.length,
                firstImagePreview: images[0]?.substring(0, 100)
            });

            state.streamController = await llmApi.generateVisionStream(
                {
                    provider: state.provider,
                    model: state.model,
                    prompt: prompt,
                    images: images,
                    system_prompt: state.settings.systemPrompt || undefined,
                    options: options
                },
                // onChunk callback
                (chunk, done, full, payload) => {
                    handleStreamingEventStatus(payload, responseSection);

                    const isReasoningChunk = isReasoningPayload(payload);

                    if (chunk) {
                        clearOverlayOnce();
                        if (isReasoningChunk) {
                            if (state.settings?.showReasoning !== false) {
                                appendReasoningText(responseSection, chunk);
                            }
                        } else {
                            fullResponse += chunk;
                            appendResponseText(responseSection, chunk);
                        }
                    }

                    if (typeof full === 'string' && full) {
                        fullResponse = full;
                    }

                    if (done && !terminalStateHandled) {
                        terminalStateHandled = true;
                        onGenerationComplete(state, fullResponse, responseSection, sendBtn, stopBtn, historySection, updateConversationList);
                    }
                },
                // onError callback
                (error) => {
                    if (terminalStateHandled) {
                        return;
                    }
                    terminalStateHandled = true;
                    onGenerationError(state, error, responseSection, sendBtn, stopBtn);
                }
            );
        } else {
            // Use text-only API
            state.streamController = await llmApi.generateStream(
                {
                    provider: state.provider,
                    model: state.model,
                    prompt: prompt,
                    system_prompt: state.settings.systemPrompt || undefined,
                    options: options
                },
                // onChunk callback
                (chunk, done, full, payload) => {
                    handleStreamingEventStatus(payload, responseSection);

                    const isReasoningChunk = isReasoningPayload(payload);

                    if (chunk) {
                        clearOverlayOnce();
                        if (isReasoningChunk) {
                            if (state.settings?.showReasoning !== false) {
                                appendReasoningText(responseSection, chunk);
                            }
                        } else {
                            fullResponse += chunk;
                            appendResponseText(responseSection, chunk);
                        }
                    }

                    if (typeof full === 'string' && full) {
                        fullResponse = full;
                    }

                    if (done && !terminalStateHandled) {
                        terminalStateHandled = true;
                        onGenerationComplete(state, fullResponse, responseSection, sendBtn, stopBtn, historySection, updateConversationList);
                    }
                },
                // onError callback
                (error) => {
                    if (terminalStateHandled) {
                        return;
                    }
                    terminalStateHandled = true;
                    onGenerationError(state, error, responseSection, sendBtn, stopBtn);
                }
            );
        }

    } catch (error) {
        onGenerationError(state, error, responseSection, sendBtn, stopBtn);
    }
}

function handleStreamingEventStatus(payload, responseSection) {
    if (!payload || typeof payload !== 'object') {
        return;
    }

    const eventType = payload.event || payload.event_data?.type;
    if (!eventType) {
        return;
    }

    if (eventType === 'model_load.start') {
        showStatus(responseSection, 'Loading model...', 'info');
        updatePhaseBadge(responseSection, 'loading-model', 'Loading model');
        return;
    }

    if (eventType === 'model_load.progress') {
        const progress = Number(payload.progress);
        if (Number.isFinite(progress)) {
            const percent = Math.round(Math.max(0, Math.min(1, progress)) * 100);
            showStatus(responseSection, `Loading model... ${percent}%`, 'info', { autoHide: false, progress });
            updatePhaseBadge(responseSection, 'loading-model', `Loading model ${percent}%`);
        } else {
            showStatus(responseSection, 'Loading model...', 'info', { autoHide: false });
            updatePhaseBadge(responseSection, 'loading-model', 'Loading model');
        }
        return;
    }

    if (eventType === 'model_load.end') {
        showStatus(responseSection, 'Model loaded. Processing prompt...', 'info');
        updatePhaseBadge(responseSection, 'processing-prompt', 'Processing prompt');
        return;
    }

    if (eventType === 'prompt_processing.start') {
        showStatus(responseSection, 'Processing prompt...', 'info');
        updatePhaseBadge(responseSection, 'processing-prompt', 'Processing prompt');
        return;
    }

    if (eventType === 'prompt_processing.progress') {
        const progress = Number(payload.progress);
        if (Number.isFinite(progress)) {
            const percent = Math.round(Math.max(0, Math.min(1, progress)) * 100);
            showStatus(responseSection, `Processing prompt... ${percent}%`, 'info', { autoHide: false, progress });
            updatePhaseBadge(responseSection, 'processing-prompt', `Processing prompt ${percent}%`);
        } else {
            showStatus(responseSection, 'Processing prompt...', 'info', { autoHide: false });
            updatePhaseBadge(responseSection, 'processing-prompt', 'Processing prompt');
        }
        return;
    }

    if (eventType === 'prompt_processing.end') {
        showStatus(responseSection, 'Generating...', 'info');
        updatePhaseBadge(responseSection, 'generating', 'Generating');
        return;
    }

    if (eventType === 'reasoning.start') {
        showStatus(responseSection, 'Reasoning...', 'info', { autoHide: false });
        updatePhaseBadge(responseSection, 'reasoning', 'Reasoning');
        return;
    }

    if (eventType === 'reasoning.delta') {
        showStatus(responseSection, 'Reasoning...', 'info', { autoHide: false });
        updatePhaseBadge(responseSection, 'reasoning', 'Reasoning');
        return;
    }

    if (eventType === 'reasoning.end') {
        showStatus(responseSection, 'Reasoning complete', 'info');
        updatePhaseBadge(responseSection, 'generating', 'Generating');
        return;
    }

    // OpenAI generation events
    if (eventType === 'generation.start') {
        showStatus(responseSection, 'Generating response...', 'info');
        updatePhaseBadge(responseSection, 'generating', 'Generating');
        return;
    }

    if (eventType === 'generation.progress') {
        const progress = Number(payload.progress);
        if (Number.isFinite(progress)) {
            const percent = Math.round(Math.max(0, Math.min(1, progress)) * 100);
            showStatus(responseSection, `Generating... ${percent}%`, 'info', { autoHide: false, progress });
            updatePhaseBadge(responseSection, 'generating', `Generating ${percent}%`);
        } else {
            showStatus(responseSection, 'Generating response...', 'info', { autoHide: false });
            updatePhaseBadge(responseSection, 'generating', 'Generating');
        }
        return;
    }

    if (eventType === 'generation.end') {
        updatePhaseBadge(responseSection, 'complete', 'Complete');
        return;
    }

    if (eventType === 'error') {
        const errorMessage = payload.error || payload.event_data?.error?.message || 'Streaming error';
        showStatus(responseSection, `Error: ${errorMessage}`, 'error');
        updatePhaseBadge(responseSection, 'error', 'Error');
    }
}

function isReasoningPayload(payload) {
    if (!payload || typeof payload !== 'object') {
        return false;
    }

    const eventType = String(payload.event || payload.event_data?.type || '').toLowerCase();
    if (eventType.startsWith('reasoning')) {
        return true;
    }

    if (payload.reasoning || payload.thinking) {
        return true;
    }

    return false;
}

function updatePhaseBadge(responseSection, phase, label) {
    const badge = responseSection?.querySelector('.llm-phase-badge');
    if (!badge) {
        return;
    }

    const classNames = [
        'llm-phase-idle',
        'llm-phase-loading-model',
        'llm-phase-processing-prompt',
        'llm-phase-generating',
        'llm-phase-complete',
        'llm-phase-stopped',
        'llm-phase-error',
    ];
    for (const className of classNames) {
        badge.classList.remove(className);
    }

    const phaseKey = String(phase || 'idle').toLowerCase().replace(/[^a-z0-9-]/g, '-');
    badge.classList.add(`llm-phase-${phaseKey}`);
    badge.textContent = label || 'Idle';
    badge.classList.remove('llm-hidden');
}

/**
 * Handle stop button click
 * @param {Object} state - Tab state object
 * @param {HTMLElement} responseSection - Response section
 * @param {HTMLButtonElement} sendBtn - Send button
 * @param {HTMLButtonElement} stopBtn - Stop button
 */
export function handleStop(state, responseSection, sendBtn, stopBtn) {
    if (state.streamController) {
        state.streamController.stop();
        state.streamController = null;
    }
    
    state.generating = false;
    sendBtn.disabled = false;
    stopBtn.classList.add('llm-hidden');
    
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    if (responseDisplay) {
        responseDisplay.classList.remove('generating');
    }
    
    showStatus(responseSection, 'Generation stopped', 'warning');
    updatePhaseBadge(responseSection, 'stopped', 'Stopped');
}

/**
 * Handle copy button click
 * @param {HTMLElement} responseSection - Response section
 * @param {HTMLButtonElement} copyBtn - Copy button
 */
export async function handleCopy(responseSection, copyBtn) {
    const text = getTranscriptText(responseSection);
    
    try {
        await navigator.clipboard.writeText(text);
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '✓ Copied!';
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
        }, 2000);
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        showStatus(responseSection, 'Failed to copy to clipboard', 'error');
    }
}

/**
 * Handle copy to node button click
 * @param {HTMLElement} responseSection - Response section
 * @param {HTMLButtonElement} copyToNodeBtn - Copy to node button
 * @param {Object} app - ComfyUI app instance
 */
export function handleCopyToNode(responseSection, copyToNodeBtn, app) {
    const text = getTranscriptText(responseSection);
    
    const success = copyTextToSelectedNode(app, text);
    
    if (success) {
        const originalText = copyToNodeBtn.innerHTML;
        copyToNodeBtn.innerHTML = '✓ Copied!';
        showStatus(responseSection, 'Response copied to selected node', 'success');
        setTimeout(() => {
            copyToNodeBtn.innerHTML = originalText;
        }, 2000);
    } else {
        showStatus(responseSection, 'Please select a CLIPTextEncode or Sage text node first', 'error');
    }
}

/**
 * Handle copy from node button click
 * @param {HTMLTextAreaElement} textarea - The prompt textarea element
 * @param {Object} app - ComfyUI app instance
 * @param {Function} showNotification - Notification function
 */
export function handleCopyFromNode(textarea, app, showNotification) {
    const result = copyTextFromSelectedNode(app);
    
    if (result.success) {
        textarea.value = result.text;
        // Trigger input event to update character counter
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        showNotification(`Text copied from ${result.nodeType} node!`, 'success');
    } else {
        showNotification(result.error || 'Please select a CLIPTextEncode or Sage text node first', 'error');
    }
}

/**
 * Show a spinner overlay inside the response display while the model loads.
 * @param {HTMLElement} responseDisplay - The .llm-response-display element
 * @param {string} modelName - Model name shown in the label
 */
function showLoadingOverlay(responseDisplay, modelName) {
  const overlay = document.createElement('div');
  overlay.className = 'llm-loading-overlay';

  const spinner = document.createElement('div');
  spinner.className = 'llm-loading-spinner';

  const label = document.createElement('span');
  label.className = 'llm-loading-label';
  label.textContent = `Loading model${modelName ? ': ' + modelName : ''}…`;

  overlay.appendChild(spinner);
  overlay.appendChild(label);

  responseDisplay.appendChild(overlay);
}

function clearLoadingOverlay(responseSection) {
    const responseDisplay = responseSection?.querySelector('.llm-response-display');
    if (!responseDisplay) {
        return;
    }

    const overlay = responseDisplay.querySelector('.llm-loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

/**
 * Build generation options from state settings
 * @param {Object} state - Tab state object
 * @returns {Object} - Generation options
 */
function buildGenerationOptions(state) {
    const options = {};
    const settings = state.settings || {};
    const capabilityFlags = state.model ? getModelCapabilityFlags(
        state.provider,
        state.model,
        state.capabilities,
        state.visionModels,
        state.toolModels,
        state.reasoningModels
    ) : null;
    const supportsReasoning = Boolean(capabilityFlags?.reasoning) && (state.provider === 'lmstudio_rest' || state.provider === 'ollama_rest');

    const getSetting = (...keys) => {
        for (const key of keys) {
            if (settings[key] !== undefined && settings[key] !== null) {
                return settings[key];
            }
        }
        return undefined;
    };

    const addIfDefined = (key, value) => {
        if (value !== undefined && value !== null && value !== '') {
            options[key] = value;
        }
    };

    const getBoolean = (...keys) => {
        const value = getSetting(...keys);
        return value === undefined ? undefined : Boolean(value);
    };

    const resolveReasoningValue = () => {
        const reasoningEnabled = getBoolean('reasoningEnabled', 'reasoning_enabled');
        if (reasoningEnabled === false) {
            return undefined;
        }

        const reasoningLevel = getSetting('reasoningLevel', 'reasoning_level', 'reasoning');

        if (typeof reasoningLevel === 'string' && reasoningLevel) {
            const normalized = reasoningLevel.toLowerCase();
            if (normalized === 'on') return state.provider === 'lmstudio_rest' ? 'on' : true;
            if (normalized === 'off') return state.provider === 'lmstudio_rest' ? 'off' : false;
            if (normalized === 'low' || normalized === 'medium' || normalized === 'high') return normalized;
        }

        if (reasoningEnabled !== undefined) {
            if (state.provider === 'lmstudio_rest') {
                return reasoningEnabled ? 'on' : 'off';
            }
            return reasoningEnabled;
        }

        return undefined;
    };

    const applySharedAdvancedControls = () => {
        const contextLength = getSetting('contextLength', 'context_length');
        const contextLengthEnabled = getBoolean('contextLengthEnabled', 'context_length_enabled', 'send_context_length');
        const shouldSendContextLength = contextLengthEnabled !== false;
        if (state.provider === 'lmstudio_rest') {
            if (shouldSendContextLength) {
                addIfDefined('context_length', contextLength);
            }
            if (supportsReasoning) {
                addIfDefined('reasoning', resolveReasoningValue());
            }
        } else if (state.provider === 'ollama_rest') {
            if (shouldSendContextLength) {
                addIfDefined('num_ctx', contextLength);
            }
            if (supportsReasoning) {
                addIfDefined('think', resolveReasoningValue());
            }
        }

        const toolsEnabled = getBoolean('toolsEnabled', 'tools_enabled');
        addIfDefined('tools_enabled', toolsEnabled);
        addIfDefined('tool_profile', getSetting('toolProfile', 'tool_profile'));
        const tools = getSetting('tools');
        if (toolsEnabled === true && Array.isArray(tools) && tools.length > 0) {
            addIfDefined('tools', tools);
        }

        const mcpEnabled = getBoolean('mcpEnabled', 'mcp_enabled');
        addIfDefined('mcp_enabled', mcpEnabled);
        addIfDefined('mcp_profile', getSetting('mcpProfile', 'mcp_profile'));
        const integrations = getSetting('integrations');
        if (mcpEnabled === true && Array.isArray(integrations) && integrations.length > 0) {
            addIfDefined('integrations', integrations);
        }
    };

    const providerToggleKey = state.provider === 'ollama_rest'
        ? 'ollama'
        : state.provider === 'lmstudio_rest'
            ? 'lmstudio'
            : null;

    const providerOptionsState = providerToggleKey
        ? settings.providerOptions?.[providerToggleKey]
        : null;
    const isProviderSectionEnabled = providerOptionsState?.enabled !== false;
    const isOptionEnabled = (optionKey) => {
        if (!providerToggleKey) {
            return true;
        }
        if (!isProviderSectionEnabled) {
            return false;
        }
        const value = providerOptionsState?.options?.[optionKey];
        return value !== false;
    };

    // Add provider-specific options
    if (state.provider === 'lmstudio_rest') {
        if (isOptionEnabled('temperature')) addIfDefined('temperature', getSetting('temperature'));
        if (isOptionEnabled('seed')) addIfDefined('seed', getSetting('seed'));
        if (isOptionEnabled('max_tokens')) addIfDefined('max_tokens', getSetting('maxTokens', 'max_tokens'));
        if (isOptionEnabled('top_k')) addIfDefined('topKSampling', getSetting('lmsTopK', 'top_k'));
        if (isOptionEnabled('top_p')) addIfDefined('topPSampling', getSetting('lmsTopP', 'top_p'));
        if (isOptionEnabled('repeat_penalty')) addIfDefined('repeatPenalty', getSetting('lmsRepeatPenalty', 'repeat_penalty'));
        if (isOptionEnabled('presence_penalty')) addIfDefined('presence_penalty', getSetting('presencePenalty', 'presence_penalty'));
        if (isOptionEnabled('frequency_penalty')) addIfDefined('frequency_penalty', getSetting('frequencyPenalty', 'frequency_penalty'));
        applySharedAdvancedControls();
    } else if (state.provider === 'ollama_rest') {
        if (isOptionEnabled('temperature')) addIfDefined('temperature', getSetting('temperature'));
        if (isOptionEnabled('seed')) addIfDefined('seed', getSetting('seed'));
        if (isOptionEnabled('max_tokens')) addIfDefined('max_tokens', getSetting('maxTokens', 'max_tokens'));
        if (isOptionEnabled('top_k')) addIfDefined('top_k', getSetting('topK', 'top_k'));
        if (isOptionEnabled('top_p')) addIfDefined('top_p', getSetting('topP', 'top_p'));
        if (isOptionEnabled('repeat_penalty')) addIfDefined('repeat_penalty', getSetting('repeatPenalty', 'repeat_penalty'));
        if (isOptionEnabled('presence_penalty')) addIfDefined('presence_penalty', getSetting('presencePenalty', 'presence_penalty'));
        if (isOptionEnabled('frequency_penalty')) addIfDefined('frequency_penalty', getSetting('frequencyPenalty', 'frequency_penalty'));
        if (isOptionEnabled('num_ctx')) addIfDefined('num_ctx', getSetting('numCtx', 'num_ctx'));
        if (isOptionEnabled('keep_alive')) addIfDefined('keep_alive', getSetting('keepAlive', 'keep_alive'));
        applySharedAdvancedControls();
    } else if (state.provider === 'openai') {
        addIfDefined('temperature', getSetting('temperature'));
        addIfDefined('seed', getSetting('seed'));
        addIfDefined('max_tokens', getSetting('maxTokens', 'max_tokens'));
    } else if (state.provider === 'native') {
        addIfDefined('temperature', getSetting('temperature'));
        addIfDefined('seed', getSetting('seed'));
        options.do_sample = true;
        addIfDefined('max_length', getSetting('maxTokens', 'max_tokens'));
        addIfDefined('top_k', getSetting('topK', 'top_k'));
        addIfDefined('top_p', getSetting('topP', 'top_p'));
        addIfDefined('min_p', getSetting('lmsMinP', 'min_p'));
        addIfDefined('repetition_penalty', getSetting('repeatPenalty', 'repeat_penalty'));
        addIfDefined('presence_penalty', getSetting('presencePenalty', 'presence_penalty'));
    }

    return options;
}

/**
 * Called when generation completes successfully
 */
async function onGenerationComplete(state, fullResponse, responseSection, sendBtn, stopBtn, historySection, updateConversationList) {
    clearLoadingOverlay(responseSection);

    // Some providers may only provide a final aggregate response without chunk deltas.
    if (!getResponseText(responseSection)?.trim() && fullResponse) {
        setResponseText(responseSection, fullResponse);
    }

    // Check if we should skip saving to history
    const skipSaveCheckbox = document.querySelector('.llm-skip-save-checkbox');
    const skipSave = skipSaveCheckbox && skipSaveCheckbox.checked;
    
    // Save assistant response to conversation history (unless skip save is checked)
    if (!skipSave) {
        addMessageToHistory(state, 'assistant', fullResponse, {
            provider: state.provider,
            model: state.model
        });
    } else {
        // Store response for potential later saving
        state._unsavedResponse = fullResponse;
    }
    
    // Update history list UI
    if (historySection && updateConversationList) {
        updateConversationList(state, historySection, responseSection);
        
        // Also render the current conversation's messages (only if not skipping save)
        if (!skipSave) {
            const { renderHistory } = await import('../chat/llmHistorySection.js');
            const currentConversation = state.conversationHistory?.find(c => c.id === state.currentConversationId);
            if (currentConversation) {
                // Delete handler for individual messages
                const handleDeleteMessage = (index) => {
                    currentConversation.messages.splice(index, 1);
                    currentConversation.updated = Date.now();
                    saveConversationHistory(state.conversationHistory);
                    renderHistory(historySection, currentConversation.messages, handleDeleteMessage);
                    updateConversationList(state, historySection, responseSection);
                };
                
                renderHistory(historySection, currentConversation.messages, handleDeleteMessage);
            }
        }
    }
    
    // Reset the skip save checkbox after generation
    if (skipSaveCheckbox) {
        skipSaveCheckbox.checked = false;
    }
    
    // Show/hide Save to History button based on skipSave state
    const saveToHistoryBtn = responseSection?.querySelector('.llm-save-to-history-btn');
    if (saveToHistoryBtn) {
        saveToHistoryBtn.classList.toggle('llm-hidden', !skipSave);
    }
    
    // Reset empty message text back to default
    const emptyMessage = historySection.querySelector('.llm-history-empty');
    if (emptyMessage && !skipSave) {
        // If we saved history, the message will be hidden anyway
        emptyMessage.textContent = 'No conversation history yet';
    } else if (emptyMessage && skipSave) {
        // If we skipped saving, reset message for next time
        emptyMessage.textContent = 'No conversation history yet';
    }
    
    state.generating = false;
    state.streamController = null;
    sendBtn.disabled = false;
    stopBtn.classList.add('llm-hidden');
    
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    if (responseDisplay) {
        responseDisplay.classList.remove('generating');
    }
    
    const copyBtn = responseSection.querySelector('.llm-copy-btn');
    const copyToNodeBtn = responseSection.querySelector('.llm-copy-to-node-btn');
    const sendToPromptBtn = responseSection.querySelector('.llm-send-to-prompt-btn');
    if (copyBtn) copyBtn.classList.remove('llm-hidden');
    if (copyToNodeBtn) copyToNodeBtn.classList.remove('llm-hidden');
    if (sendToPromptBtn) sendToPromptBtn.classList.remove('llm-hidden');
    
    showStatus(responseSection, 'Generation complete', 'success');
    updatePhaseBadge(responseSection, 'complete', 'Complete');
}

/**
 * Called when generation encounters an error
 */
function onGenerationError(state, error, responseSection, sendBtn, stopBtn) {
    clearLoadingOverlay(responseSection);

    state.generating = false;
    state.streamController = null;
    sendBtn.disabled = false;
    stopBtn.classList.add('llm-hidden');
    
    const responseDisplay = responseSection.querySelector('.llm-response-display');
    if (responseDisplay) {
        responseDisplay.classList.remove('generating');
    }

    const errorMessage = error?.message || 'An unknown error occurred during generation';
    showStatus(responseSection, `Error: ${errorMessage}`, 'error');
    updatePhaseBadge(responseSection, 'error', 'Error');
    showGenerationErrorDialog(errorMessage);
}

function showGenerationErrorDialog(message) {
    if (!message) {
        return;
    }

    const now = Date.now();
    const isRapidDuplicate = message === lastErrorDialogMessage && (now - lastErrorDialogTime) < 1500;

    if (errorDialogOpen || isRapidDuplicate) {
        return;
    }

    errorDialogOpen = true;
    lastErrorDialogMessage = message;
    lastErrorDialogTime = now;

    alertDialog(message, 'LLM Generation Error')
        .catch((dialogError) => {
            console.error('Failed to show LLM error dialog:', dialogError);
        })
        .finally(() => {
            errorDialogOpen = false;
        });
}

/**
 * Show status message in response section
 * @param {HTMLElement} responseSection - Response section
 * @param {string} message - Status message
 * @param {string} type - Message type: 'info', 'success', 'warning', 'error'
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.autoHide] - Auto-hide after 5 seconds (default: true for non-errors)
 * @param {number} [options.progress] - Progress 0-1 to show progress bar
 */
function showStatus(responseSection, message, type, options = {}) {
    const statusMessage = responseSection.querySelector('.llm-status-message');
    if (!statusMessage) return;
    
    const { autoHide = (type !== 'error'), progress = null } = options;
    
    statusMessage.textContent = message;
    statusMessage.className = `llm-status-message llm-status-${type}`;
    statusMessage.classList.toggle('llm-hidden', !message);
    
    const progressBar = responseSection.querySelector('.llm-progress-bar-container');
    if (progressBar) {
        const fill = progressBar.querySelector('.llm-progress-bar-fill');
        if (progress !== null && progress >= 0 && progress <= 1) {
            progressBar.classList.remove('llm-hidden');
            if (fill) {
                fill.style.width = `${Math.round(progress * 100)}%`;
            }
        } else {
            progressBar.classList.add('llm-hidden');
            if (fill) {
                fill.style.width = '0%';
            }
        }
    }
    
    // Auto-hide after 5 seconds (only if enabled)
    if (message && autoHide && type !== 'error') {
        setTimeout(() => {
            if (statusMessage.textContent === message) {
                statusMessage.classList.add('llm-hidden');
            }
        }, 5000);
    }
}

// ========== Conversation Management ==========

/**
 * Add a message to conversation history
 * @param {Object} state - Tab state object
 * @param {string} role - Message role ('user' or 'assistant')
 * @param {string} content - Message content
 * @param {Object} metadata - Additional metadata
 */
export function addMessageToHistory(state, role, content, metadata = {}) {
    if (!state.currentConversationId) {
        // Start a new conversation
        state.currentConversationId = generateConversationId();
        state.conversationHistory = loadConversationHistory();
    }
    
    // Find or create current conversation
    let conversation = state.conversationHistory.find(c => c.id === state.currentConversationId);
    if (!conversation) {
        conversation = {
            id: state.currentConversationId,
            title: generateConversationTitle(content),
            created: Date.now(),
            updated: Date.now(),
            messages: [],
            metadata: {
                provider: state.provider,
                model: state.model,
                ...metadata
            }
        };
        state.conversationHistory.unshift(conversation);
    }
    
    // Add message
    conversation.messages.push({
        role,
        content,
        timestamp: Date.now()
    });
    
    conversation.updated = Date.now();
    
    // Save to localStorage
    saveConversationHistory(state.conversationHistory);
}

/**
 * Start a new conversation
 * @param {Object} state - Tab state object
 */
/**
 * Start a new conversation
 * @param {Object} state - Tab state object
 */
export function startNewConversation(state) {
    state.currentConversationId = null;
    state.currentConversationMessages = [];
}

/**
 * Load a specific conversation
 * @param {Object} state - Tab state object
 * @param {string} conversationId - Conversation ID to load
 * @returns {Object|null} - Conversation object or null if not found
 */
export function loadConversation(state, conversationId) {
    const history = loadConversationHistory();
    const conversation = history.find(c => c.id === conversationId);
    
    if (conversation) {
        state.currentConversationId = conversationId;
        state.currentConversationMessages = [...conversation.messages];
        return conversation;
    }
    
    return null;
}

/**
 * Delete a conversation from history
 * @param {Object} state - Tab state object
 * @param {string} conversationId - Conversation ID to delete
 */
export function deleteConversation(state, conversationId) {
    state.conversationHistory = state.conversationHistory.filter(c => c.id !== conversationId);
    saveConversationHistory(state.conversationHistory);
    
    // If deleting current conversation, start new one
    if (state.currentConversationId === conversationId) {
        startNewConversation(state);
    }
}

/**
 * Save conversation history to localStorage
 * @param {Array} conversations - Array of conversation objects
 */
export function saveConversationHistory(conversations) {
    try {
        localStorage.setItem('llm_conversation_history', JSON.stringify(conversations));
    } catch (error) {
        console.error('Error saving conversation history:', error);
    }
}

/**
 * Load conversation history from localStorage
 * @returns {Array} - Array of conversation objects
 */
export function loadConversationHistory() {
    try {
        const saved = localStorage.getItem('llm_conversation_history');
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Error loading conversation history:', error);
        return [];
    }
}

/**
 * Generate a unique conversation ID
 * @returns {string} - Unique ID
 */
function generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a conversation title from the first user message
 * @param {string} content - Message content
 * @returns {string} - Conversation title
 */
function generateConversationTitle(content) {
    const maxLength = 50;
    const title = content.trim().split('\n')[0]; // First line
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
}

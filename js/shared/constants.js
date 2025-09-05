/**
 * Common constants for SageUtils JavaScript modules
 * These constants help maintain consistency across the client-side code
 */

// Supported model file extensions (matching ComfyUI's supported_pt_extensions)
// Additional extensions (.gguf, .nf4) supported via custom extensions
export const MODEL_FILE_EXTENSIONS = ['.ckpt', '.pt', '.pt2', '.bin', '.pth', '.safetensors', '.pkl', '.sft', '.gguf', '.nf4'];

// Common model file extensions (most frequently used)
export const COMMON_MODEL_EXTENSIONS = ['.safetensors', '.ckpt'];

// Model types
export const MODEL_TYPES = {
    CHECKPOINT: 'Checkpoint',
    LORA: 'LORA',
    UNET: 'UNET',
    CLIP: 'CLIP',
    VAE: 'VAE',
    CONTROLNET: 'ControlNet',
    EMBEDDING: 'Embedding',
    HYPERNETWORK: 'Hypernetwork',
    UPSCALE: 'Upscale',
    STYLE: 'Style',
    GLIGEN: 'GLIGEN',
    PHOTOMAKER: 'Photomaker'
};

// Image size constants for reports
export const DEFAULT_THUMBNAIL_WIDTH = 150;
export const DEFAULT_THUMBNAIL_HEIGHT = 100;

// Progress reporting
export const DEFAULT_BATCH_SIZE = 50;
export const PROGRESS_UPDATE_INTERVAL = 10; // milliseconds

// File size constants
export const BYTES_PER_KB = 1024;
export const BYTES_PER_MB = BYTES_PER_KB * 1024;
export const BYTES_PER_GB = BYTES_PER_MB * 1024;

/**
 * Check if a file path has a model extension
 * @param {string} filePath - The file path to check
 * @returns {boolean} - True if the file has a model extension
 */
export function hasModelExtension(filePath) {
    if (!filePath || typeof filePath !== 'string') return false;
    const lowerPath = filePath.toLowerCase();
    return MODEL_FILE_EXTENSIONS.some(ext => lowerPath.endsWith(ext));
}

/**
 * Check if a file path has a common model extension (.safetensors or .ckpt)
 * @param {string} filePath - The file path to check
 * @returns {boolean} - True if the file has a common model extension
 */
export function hasCommonModelExtension(filePath) {
    if (!filePath || typeof filePath !== 'string') return false;
    const lowerPath = filePath.toLowerCase();
    return COMMON_MODEL_EXTENSIONS.some(ext => lowerPath.endsWith(ext));
}

/**
 * Get the file extension from a path
 * @param {string} filePath - The file path
 * @returns {string} - The file extension (including the dot) or empty string
 */
export function getFileExtension(filePath) {
    if (!filePath || typeof filePath !== 'string') return '';
    const lastDot = filePath.lastIndexOf('.');
    return lastDot > -1 ? filePath.substring(lastDot) : '';
}

/**
 * Determine if a file is likely a checkpoint based on its path and model info
 * @param {string} filePath - The file path
 * @param {Object} info - The model info object
 * @returns {boolean} - True if it's likely a checkpoint
 */
export function isLikelyCheckpoint(filePath, info = {}) {
    if (info && info.model_type === 'Checkpoint') {
        return true;
    }
    
    if (!hasModelExtension(filePath)) {
        return false;
    }
    
    const lowerPath = filePath.toLowerCase();
    
    // Check if it's in a lora directory (less likely to be checkpoint)
    if (lowerPath.includes('/lora') || lowerPath.includes('\\lora')) {
        return false;
    }
    
    // Check if it's in a checkpoint directory
    if (lowerPath.includes('/checkpoint') || lowerPath.includes('\\checkpoint')) {
        return true;
    }
    
    // Check common model extensions
    return hasCommonModelExtension(filePath);
}

/**
 * Determine if a file is likely a LoRA based on its path and model info
 * @param {string} filePath - The file path
 * @param {Object} info - The model info object
 * @returns {boolean} - True if it's likely a LoRA
 */
export function isLikelyLora(filePath, info = {}) {
    if (info && info.model_type === 'LORA') {
        return true;
    }
    
    if (!hasModelExtension(filePath)) {
        return false;
    }
    
    const lowerPath = filePath.toLowerCase();
    
    // Check if it's in a lora directory
    return lowerPath.includes('/lora') || lowerPath.includes('\\lora');
}

/**
 * Generate thumbnail style string with standard dimensions
 * @param {string} additionalStyle - Any additional CSS styles to apply
 * @returns {string} - Complete CSS style string for thumbnails
 */
export function getThumbnailStyle(additionalStyle = '') {
    const baseStyle = `width:${DEFAULT_THUMBNAIL_WIDTH}px;height:${DEFAULT_THUMBNAIL_HEIGHT}px;object-fit:cover;border-radius:4px;cursor:pointer;transition:all 0.3s ease;`;
    return additionalStyle ? `${baseStyle}${additionalStyle}` : baseStyle;
}

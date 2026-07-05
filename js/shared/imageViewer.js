import { selectors } from './stateManager.js';
import { loadFullImage, openImageInNewTab as openImageInNewTabUtil } from './imageLoader.js';
import { createDialog } from '../components/dialogManager.js';

/**
 * Show a full image modal viewer with navigation and zoom controls.
 * @param {Object|string} imageInput - Image object or image path string
 * @param {Array} [images] - Optional array of images for navigation
 */
export async function showFullImage(imageInput, imagesOrOptions = null) {
    let imagePath;
    let image;
    let images = null;
    let showMetadata = null;

    if (Array.isArray(imagesOrOptions)) {
        images = imagesOrOptions;
    } else if (imagesOrOptions && typeof imagesOrOptions === 'object') {
        if (Array.isArray(imagesOrOptions.images)) {
            images = imagesOrOptions.images;
        }
        if (typeof imagesOrOptions.showMetadata === 'function') {
            showMetadata = imagesOrOptions.showMetadata;
        }
    }

    if (typeof imageInput === 'string') {
        imagePath = imageInput;
        if (!images) {
            images = selectors.galleryImages() || [];
        }
        image = images.find(img =>
            img.path === imagePath ||
            img.relative_path === imagePath ||
            img.name === imagePath.split('/').pop()
        );
    } else {
        image = imageInput;
        imagePath = image.path || image.relative_path || image.name;
    }

    if (!images) {
        images = selectors.galleryImages() || [];
    }

    const currentIndex = images.findIndex(img =>
        img.path === imagePath ||
        img.relative_path === imagePath ||
        img.name === (imagePath.includes('/') ? imagePath.split('/').pop() : imagePath)
    );

    if (currentIndex === -1) {
        console.warn('Image not found in current set:', imagePath);
        return;
    }

    let activeIndex = currentIndex;
    let zoomLevel = 1;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let translateX = 0;
    let translateY = 0;

    const dialog = createDialog({
        title: image.filename || image.name || 'Image Viewer',
        width: '90vw',
        height: '90vh',
        showCloseButton: true,
        showFooter: false,
        closeOnOverlayClick: true,
        closable: true
    });

    const container = document.createElement('div');
    container.style.cssText = `
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 12px;
        overflow: hidden;
    `;

    const img = document.createElement('img');
    img.style.cssText = `
        max-width: 100%;
        max-height: calc(100vh - 180px);
        object-fit: contain;
        transition: transform 0.1s ease;
        cursor: grab;
    `;

    const controls = document.createElement('div');
    controls.style.cssText = `
        position: absolute;
        top: 12px;
        right: 12px;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
        z-index: 10;
        padding: 8px;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    `;

    const buttonFactory = (text, title) => {
        const button = document.createElement('button');
        button.textContent = text;
        button.title = title;
        button.style.cssText = `
            min-width: 44px;
            min-height: 36px;
            border-radius: 6px;
            border: none;
            background: rgba(0,0,0,0.6);
            color: white;
            cursor: pointer;
        `;
        return button;
    };

    const zoomInBtn = buttonFactory('+', 'Zoom In (+)');
    const zoomOutBtn = buttonFactory('−', 'Zoom Out (-)');
    const resetZoomBtn = buttonFactory('1:1', 'Reset Zoom (0)');
    const metadataBtn = buttonFactory('ℹ️', 'Show Image Metadata');
    const openNewTabBtn = buttonFactory('↗', 'Open in New Tab');
    const prevBtn = buttonFactory('◀', 'Previous Image');
    const nextBtn = buttonFactory('▶', 'Next Image');

    const infoOverlay = document.createElement('div');
    infoOverlay.style.cssText = `
        position: absolute;
        bottom: 12px;
        left: 12px;
        right: 12px;
        color: white;
        font-size: 12px;
        letter-spacing: 0.2px;
        opacity: 0.9;
        text-align: center;
        padding: 6px 10px;
        background: rgba(0,0,0,0.35);
        border-radius: 10px;
        pointer-events: none;
    `;

    const updateTransform = () => {
        img.style.transform = `scale(${zoomLevel}) translate(${translateX}px, ${translateY}px)`;
        img.style.cursor = zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default';
    };

    const zoom = (factor) => {
        const newZoom = Math.max(0.1, Math.min(5, zoomLevel * factor));
        if (newZoom !== zoomLevel) {
            zoomLevel = newZoom;
            if (zoomLevel <= 1) {
                translateX = 0;
                translateY = 0;
            }
            updateTransform();
        }
    };

    const resetZoom = () => {
        zoomLevel = 1;
        translateX = 0;
        translateY = 0;
        updateTransform();
    };

    const loadImage = async () => {
        const currentImage = images[activeIndex];
        if (!currentImage) return;

        const imageName = currentImage.name || currentImage.path?.split('/').pop() || 'Unknown';
        try {
            const imageUrl = await loadFullImage(currentImage);
            img.src = imageUrl;
        } catch (error) {
            console.error('Error loading full image:', error);
            img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="%23333"/><text x="200" y="150" text-anchor="middle" font-size="16" fill="%23999">Error loading image</text></svg>';
        }

        const sizeInfo = currentImage.width && currentImage.height ? ` (${currentImage.width}×${currentImage.height})` : '';
        const indexInfo = images.length > 1 ? ` [${activeIndex + 1}/${images.length}]` : '';
        dialog.setTitle(`${imageName}${sizeInfo}${indexInfo}`);
        infoOverlay.textContent = `${imageName}${sizeInfo}${indexInfo}`;
    };

    const navigate = async (delta) => {
        if (images.length <= 1) return;
        activeIndex = Math.min(images.length - 1, Math.max(0, activeIndex + delta));
        resetZoom();
        await loadImage();
    };

    const handleMouseDown = (event) => {
        if (zoomLevel <= 1) return;
        isDragging = true;
        startX = event.clientX - translateX;
        startY = event.clientY - translateY;
        img.style.cursor = 'grabbing';
        event.preventDefault();
    };

    const handleMouseMove = (event) => {
        if (!isDragging || zoomLevel <= 1) return;
        translateX = event.clientX - startX;
        translateY = event.clientY - startY;
        updateTransform();
    };

    const handleMouseUp = () => {
        if (!isDragging) return;
        isDragging = false;
        img.style.cursor = zoomLevel > 1 ? 'grab' : 'default';
    };

    const handleKeyDown = (event) => {
        switch (event.key) {
            case 'Escape':
                dialog.close();
                break;
            case 'ArrowLeft':
                navigate(-1);
                break;
            case 'ArrowRight':
                navigate(1);
                break;
            case '+':
            case '=':
                zoom(1.2);
                break;
            case '-':
                zoom(0.8);
                break;
            case '0':
                resetZoom();
                break;
        }
    };

    zoomInBtn.addEventListener('click', () => zoom(1.2));
    zoomOutBtn.addEventListener('click', () => zoom(0.8));
    resetZoomBtn.addEventListener('click', resetZoom);
    metadataBtn.addEventListener('click', () => {
        if (typeof showMetadata === 'function') {
            showMetadata(image);
        } else {
            import('../gallery/galleryEvents.js')
                .then(({ showImageMetadata }) => {
                    if (typeof showImageMetadata === 'function') {
                        showImageMetadata(image);
                    } else {
                        console.warn('Image viewer metadata fallback did not expose showImageMetadata');
                    }
                })
                .catch((error) => {
                    console.warn('Failed to load gallery metadata helper:', error);
                });
        }
    });
    openNewTabBtn.addEventListener('click', () => openImageInNewTabUtil(image));
    prevBtn.addEventListener('click', () => navigate(-1));
    nextBtn.addEventListener('click', () => navigate(1));

    controls.append(prevBtn, zoomInBtn, zoomOutBtn, resetZoomBtn, metadataBtn, openNewTabBtn, nextBtn);

    container.append(img, controls, infoOverlay);
    dialog.setContent(container);
    dialog.show();

    img.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    const originalClose = dialog.close.bind(dialog);
    dialog.close = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('keydown', handleKeyDown);
        img.removeEventListener('mousedown', handleMouseDown);
        originalClose();
    };

    await loadImage();
}

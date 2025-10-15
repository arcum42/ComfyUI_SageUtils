// Widget utilities for Sage Utils nodes
// This file contains common widget creation and manipulation functions

import { ComfyWidgets } from "../../../../scripts/widgets.js";
import { renderMarkdown, ensureMarkdownStyles } from "../shared/markdown.js";

/**
 * Creates a basic text output widget for a node.
 * @param {Object} node - The node instance.
 * @param {Object} app - The ComfyUI app instance.
 * @param {string} widgetName - The name of the widget (default: "output").
 * @returns {Object} - The created widget.
 */
export function createTextOutputWidget(node, app, widgetName = "output") {
  let w = node.widgets?.find((w) => w.name === widgetName);
  
  if (!w) {
    w = ComfyWidgets["STRING"](
      node,
      widgetName,
      ["STRING", { multiline: true }],
      app
    ).widget;
    w.inputEl.readOnly = true;
    w.inputEl.style.opacity = 0.6;
    w.inputEl.style.fontSize = "9pt";
  }
  
  return w;
}

/**
 * Updates a text widget with content, handling both arrays and strings.
 * @param {Object} widget - The widget to update.
 * @param {Object} message - The message object containing text.
 */
export function updateTextWidget(widget, message) {
  // Defensive: handle message["text"] as array or string
  if (Array.isArray(message["text"])) {
    widget.value = message["text"].join("");
  } else if (typeof message["text"] === "string") {
    widget.value = message["text"];
  } else {
    widget.value = String(message["text"] ?? "");
  }
}

/**
 * Sets up proper HTML markdown display for a text widget.
 * @param {Object} widget - The text widget.
 * @param {string} content - The markdown content to render.
 */
export function setupMarkdownDisplay(widget, content) {
  // Set the textarea value for fallback
  widget.value = content;
  
  console.log("Setting up markdown display, content length:", content.length);
  
  // Ensure widget is properly initialized
  if (!widget.inputEl) {
    console.warn("Widget inputEl not available, retrying in 100ms...");
    setTimeout(() => {
      if (widget.inputEl) {
        setupMarkdownDisplay(widget, content);
      } else {
        console.error("Widget still not initialized after delay, falling back to text display");
      }
    }, 100);
    return;
  }
  
  if (!widget.inputEl.parentElement) {
    console.warn("Widget parentElement not available, retrying in 100ms...");
    setTimeout(() => {
      if (widget.inputEl && widget.inputEl.parentElement) {
        setupMarkdownDisplay(widget, content);
      } else {
        console.error("Widget parent still not available after delay, falling back to text display");
      }
    }, 100);
    return;
  }
  
  console.log("Widget is properly initialized, proceeding with markdown setup");
  
  // Remove any existing markdown overlay
  if (widget.markdownOverlay) {
    widget.markdownOverlay.remove();
    widget.markdownOverlay = null;
  }
  
  // Create markdown display overlay
  const markdownDiv = document.createElement('div');
  markdownDiv.className = 'markdown-overlay';
  const renderedHTML = renderMarkdown(content);
  console.log("Rendered HTML length:", renderedHTML.length);
  markdownDiv.innerHTML = renderedHTML;
  
  console.log("Created markdown div with HTML:", markdownDiv.innerHTML.substring(0, 200) + "...");
  
  // Style the overlay to match the textarea exactly
  markdownDiv.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #1e1e1e;
    color: #d4d4d4;
    padding: 8px 12px;
    border: 1px solid #3e3e3e;
    border-radius: 6px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    line-height: 1.5;
    overflow-y: auto;
    overflow-x: hidden;
    word-wrap: break-word;
    box-sizing: border-box;
    z-index: 1;
    pointer-events: auto;
  `;
  
  // Hide the textarea
  widget.inputEl.style.opacity = '0';
  console.log("Hiding textarea, opacity set to 0");
  
  // Make sure the parent has position relative for absolute positioning
  const parent = widget.inputEl.parentElement;
  if (getComputedStyle(parent).position === 'static') {
    parent.style.position = 'relative';
  }
  
  // Insert the overlay
  parent.appendChild(markdownDiv);
  console.log("Appended markdown overlay to parent, parent children count:", parent.children.length);
  
  // Store reference for cleanup
  widget.markdownOverlay = markdownDiv;
  
  // Add styles for markdown elements
  ensureMarkdownStyles();
  
  // Add a small delay to ensure the overlay is properly rendered
  setTimeout(() => {
    console.log("Final check - overlay visibility:", getComputedStyle(markdownDiv).visibility);
    console.log("Final check - overlay display:", getComputedStyle(markdownDiv).display);
    console.log("Final check - overlay z-index:", getComputedStyle(markdownDiv).zIndex);
  }, 100);
}

/**
 * Sets up image display for a text widget.
 * @param {Object} widget - The text widget.
 * @param {string} filename - The image filename to display.
 */
export function setupImageDisplay(widget, filename) {
  // Set the textarea value to show filename
  widget.value = `Displaying image: ${filename}`;
  
  if (widget.inputEl && widget.inputEl.parentElement) {
    // Remove any existing overlays
    const existingOverlay = widget.inputEl.parentElement.querySelector('.markdown-overlay, .image-overlay, .video-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // Create image display overlay
    const imageDiv = document.createElement('div');
    imageDiv.className = 'image-overlay';
    
    // Create image element
    const img = document.createElement('img');
    // Construct the URL for the image in the notes directory
    img.src = `/sage_utils/read_note?filename=${encodeURIComponent(filename)}`;
    img.alt = filename;
    
    // Style the image to fit nicely
    img.style.cssText = `
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
      margin: auto;
    `;
    
    imageDiv.appendChild(img);
    
    // Style the overlay container
    imageDiv.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #1e1e1e;
      border: 1px solid #3e3e3e;
      border-radius: 6px;
      padding: 8px;
      box-sizing: border-box;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
    `;
    
    // Hide the textarea
    widget.inputEl.style.opacity = '0';
    
    // Make sure the parent has position relative for absolute positioning
    const parent = widget.inputEl.parentElement;
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }
    
    // Insert the overlay
    parent.appendChild(imageDiv);
    
    // Store reference for cleanup
    widget.imageOverlay = imageDiv;
    
    // Handle image load errors
    img.onerror = function() {
      imageDiv.innerHTML = `
        <div style="color: #ff6b6b; text-align: center; padding: 20px;">
          <p>Failed to load image: ${filename}</p>
          <p style="font-size: 12px; opacity: 0.7;">Image may not exist or format may not be supported</p>
        </div>
      `;
    };
    
    // Handle successful image load
    img.onload = function() {
      console.log(`Successfully loaded image: ${filename}`);
    };
  }
}

/**
 * Sets up video display for a text widget.
 * @param {Object} widget - The text widget.
 * @param {string} filename - The video filename to display.
 * @param {boolean} isSupported - Whether the video format is browser-supported.
 */
export function setupVideoDisplay(widget, filename, isSupported = true) {
  // Set the textarea value to show filename
  widget.value = `Displaying video: ${filename}`;
  
  if (widget.inputEl && widget.inputEl.parentElement) {
    // Remove any existing overlays
    const existingOverlay = widget.inputEl.parentElement.querySelector('.markdown-overlay, .image-overlay, .video-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // Create video display overlay
    const videoDiv = document.createElement('div');
    videoDiv.className = 'video-overlay';
    
    if (!isSupported) {
      // Show format not supported message
      const extension = filename.split('.').pop().toUpperCase();
      videoDiv.innerHTML = `
        <div style="color: #ff6b6b; text-align: center; padding: 20px;">
          <h3 style="color: #ff6b6b; margin-bottom: 16px;">Video Format Not Supported</h3>
          <p><strong>${filename}</strong></p>
          <p style="font-size: 14px; margin: 16px 0;">
            ${extension} format is not supported by browsers.
          </p>
          <div style="background: #2d2d2d; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: left;">
            <p style="color: #4fc3f7; margin-bottom: 8px; font-weight: bold;">✅ Supported formats:</p>
            <p style="margin: 4px 0; color: #90ee90;">• MP4 (H.264/H.265) - Best compatibility</p>
            <p style="margin: 4px 0; color: #90ee90;">• WebM (VP8/VP9) - Good for web</p>
            <p style="margin: 4px 0; color: #90ee90;">• OGG (Theora) - Open source</p>
            <p style="margin: 4px 0; color: #90ee90;">• M4V - Apple format</p>
            <br>
            <p style="color: #ff6b6b; margin-bottom: 8px; font-weight: bold;">❌ Unsupported formats:</p>
            <p style="margin: 4px 0; color: #ffb6b6;">• MKV, AVI, MOV, WMV, FLV</p>
          </div>
          <p style="font-size: 12px; opacity: 0.7; margin-top: 16px;">
            Convert your video to MP4 or WebM for browser playback.
          </p>
        </div>
      `;
    } else {
      // Create video element for supported formats
      const video = document.createElement('video');
      video.controls = true;
      video.preload = 'metadata';
      video.src = `/sage_utils/read_note?filename=${encodeURIComponent(filename)}`;
      
      // Style the video to fit nicely
      video.style.cssText = `
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        object-fit: contain;
        display: block;
        margin: auto;
      `;
      
      videoDiv.appendChild(video);
      
      // Handle video load errors
      video.onerror = function() {
        videoDiv.innerHTML = `
          <div style="color: #ff6b6b; text-align: center; padding: 20px;">
            <p>Failed to load video: ${filename}</p>
            <p style="font-size: 12px; opacity: 0.7;">The file may be corrupted or the codec may not be supported</p>
            <p style="font-size: 11px; opacity: 0.5;">Try converting to H.264 MP4 for best compatibility</p>
          </div>
        `;
      };
      
      // Handle successful video load
      video.onloadedmetadata = function() {
        console.log(`Successfully loaded video: ${filename} (${video.videoWidth}x${video.videoHeight})`);
      };
      
      // Handle when video data is loaded
      video.onloadeddata = function() {
        console.log(`Video data loaded for: ${filename}`);
      };
    }
    
    // Style the overlay container (applies to both supported and unsupported)
    videoDiv.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #1e1e1e;
      border: 1px solid #3e3e3e;
      border-radius: 6px;
      padding: 8px;
      box-sizing: border-box;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
    `;
    
    // Hide the textarea
    widget.inputEl.style.opacity = '0';
    
    // Make sure the parent has position relative for absolute positioning
    const parent = widget.inputEl.parentElement;
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }
    
    // Insert the overlay
    parent.appendChild(videoDiv);
    
    // Store reference for cleanup
    widget.videoOverlay = videoDiv;
  }
}

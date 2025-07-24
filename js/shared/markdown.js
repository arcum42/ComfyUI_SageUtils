// Markdown rendering utilities for Sage Utils nodes
// This file contains markdown processing and display functionality

/**
 * Enhanced markdown renderer with better formatting support.
 * @param {string} text - The markdown text to render.
 * @returns {string} - The rendered HTML.
 */
export function renderMarkdown(text) {
  if (!text) return '';
  
  console.log("renderMarkdown: Processing text length:", text.length);
  
  let result = text;
  
  // Escape HTML first to prevent injection, but preserve newlines
  result = result
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Then apply markdown transformations in correct order
  // Code blocks first (must be before inline code and other formatting)
  result = result.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // Headers (process from h6 to h1 to avoid conflicts)
  result = result.replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>');
  result = result.replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>');
  result = result.replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>');
  result = result.replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>');
  result = result.replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>');
  result = result.replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>');
  
  // Bold text (must be before italic)
  result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__(.*?)__/g, '<strong>$1</strong>');
  
  // Italic text
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  result = result.replace(/_([^_]+)_/g, '<em>$1</em>');
  
  // Inline code (after bold/italic to avoid conflicts)
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Images (must be before links to avoid conflicts)
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, 
    '<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0; display: block;" onerror="this.style.display=\'none\';">');
  
  // Links (after images)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, 
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Blockquotes
  result = result.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
  
  // Lists - handle them more carefully to avoid extra breaks
  result = result.replace(/^[\*\-\+]\s+(.+)$/gm, '<li>$1</li>');
  result = result.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  
  // Wrap consecutive list items in ul tags
  result = result.replace(/(<li>.*?<\/li>(?:\s*<li>.*?<\/li>)*)/gs, '<ul>$1</ul>');
  
  // Horizontal rules
  result = result.replace(/^---+$/gm, '<hr>');
  
  // Split into lines for better processing
  const lines = result.split('\n');
  const processedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      continue;
    }
    
    // Check if this line is already a block element
    const isBlockElement = line.match(/^<(h[1-6]|ul|li|ol|p|div|blockquote|pre|hr)/);
    const isClosingTag = line.match(/^<\/(h[1-6]|ul|li|ol|p|div|blockquote|pre)>/);
    
    if (isBlockElement || isClosingTag) {
      // It's already a block element, add it as-is
      processedLines.push(line);
    } else {
      // It's regular text, wrap it in a paragraph
      if (line.length > 0) {
        processedLines.push(`<p>${line}</p>`);
      }
    }
  }
  
  result = processedLines.join('');
    
  console.log("renderMarkdown: Generated HTML length:", result.length);
  console.log("renderMarkdown: First 200 chars of HTML:", result.substring(0, 200));
  return result;
}

/**
 * Ensures markdown styles are added to the document.
 */
export function ensureMarkdownStyles() {
  if (!document.querySelector('#sage-markdown-styles')) {
    const style = document.createElement('style');
    style.id = 'sage-markdown-styles';
    style.textContent = `
      .markdown-overlay h1, .markdown-overlay h2, .markdown-overlay h3,
      .markdown-overlay h4, .markdown-overlay h5, .markdown-overlay h6 {
        color: #569cd6;
        margin: 12px 0 6px 0;
        font-weight: 600;
      }
      .markdown-overlay h1 { font-size: 1.5em; border-bottom: 1px solid #3e3e3e; padding-bottom: 4px; }
      .markdown-overlay h2 { font-size: 1.3em; border-bottom: 1px solid #3e3e3e; padding-bottom: 2px; }
      .markdown-overlay h3 { font-size: 1.1em; }
      .markdown-overlay h4 { font-size: 1em; }
      .markdown-overlay p { margin: 8px 0; }
      .markdown-overlay pre {
        background: #2d2d2d;
        border: 1px solid #404040;
        border-radius: 4px;
        padding: 8px;
        margin: 8px 0;
        overflow-x: auto;
      }
      .markdown-overlay code {
        background: #2d2d2d;
        padding: 2px 4px;
        border-radius: 3px;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      }
      .markdown-overlay pre code {
        background: transparent;
        padding: 0;
      }
      .markdown-overlay a {
        color: #4fc3f7;
        text-decoration: none;
      }
      .markdown-overlay a:hover {
        text-decoration: underline;
      }
      .markdown-overlay ul, .markdown-overlay ol {
        margin: 8px 0;
        padding-left: 20px;
      }
      .markdown-overlay li {
        margin: 4px 0;
      }
      .markdown-overlay blockquote {
        border-left: 4px solid #569cd6;
        margin: 8px 0;
        padding-left: 12px;
        font-style: italic;
        color: #b0b0b0;
      }
      .markdown-overlay strong {
        font-weight: 600;
        color: #f0f0f0;
      }
      .markdown-overlay em {
        font-style: italic;
        color: #e0e0e0;
      }
    `;
    document.head.appendChild(style);
    console.log("Added markdown styles to document head");
  } else {
    console.log("Markdown styles already exist in document");
  }
}

/**
 * Collapsible Panel Component
 * Provides a header with caret toggle and a content container.
 *
 * API:
 *   createCollapsiblePanel({ titleText, defaultExpanded = true, useUnicodeCarets = false })
 *     -> { container, header, titleEl, caretEl, contentEl, setExpanded, isExpanded }
 *
 * Notes:
 * - If useUnicodeCarets is true, we intentionally use Unicode glyphs ("\u25BE"/"\u25B8") for the caret
 *   despite the repository's ASCII-only guideline. This is an explicit user override for better UI
 *   affordance. Be careful when editing or searching near this code, as some search tools may not
 *   handle these characters properly.
 */

export function createCollapsiblePanel({ titleText, defaultExpanded = true, useUnicodeCarets = false } = {}) {
  const container = document.createElement('div');
  container.style.cssText = `
    display: block;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
  `;

  const caretEl = document.createElement('span');
  // Unicode caret override: using \u25BE (▾) expanded and \u25B8 (▸) collapsed per user request.
  // WARNING: This intentionally violates the ASCII-only rule. Some search tools may not work
  // properly around these characters. Handle edits with care.
  const caretChars = useUnicodeCarets ? { open: '\u25BE', closed: '\u25B8' } : { open: 'v', closed: '>' };
  caretEl.textContent = defaultExpanded ? caretChars.open : caretChars.closed;
  caretEl.style.cssText = `
    display: inline-block;
    width: 14px;
    color: #fff;
  `;

  const titleEl = document.createElement('h4');
  titleEl.textContent = titleText || '';
  titleEl.style.cssText = `
    color: #fff;
    margin: 0;
    font-size: 14px;
    flex: 1;
  `;

  const contentEl = document.createElement('div');
  contentEl.style.cssText = `
    display: ${defaultExpanded ? 'block' : 'none'};
    margin-top: 10px;
  `;

  header.appendChild(caretEl);
  header.appendChild(titleEl);
  container.appendChild(header);
  container.appendChild(contentEl);

  let expanded = !!defaultExpanded;
  const setExpanded = (val) => {
    expanded = !!val;
    contentEl.style.display = expanded ? 'block' : 'none';
    caretEl.textContent = expanded ? caretChars.open : caretChars.closed;
  };

  header.addEventListener('click', () => setExpanded(!expanded));

  return { container, header, titleEl, caretEl, contentEl, setExpanded, get isExpanded() { return expanded; } };
}

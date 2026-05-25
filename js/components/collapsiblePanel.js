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
  container.className = 'sage-collapsible-panel';

  const header = document.createElement('div');
  header.className = 'sage-collapsible-header';

  const caretEl = document.createElement('span');
  // Unicode caret override: using \u25BE (▾) expanded and \u25B8 (▸) collapsed per user request.
  // WARNING: This intentionally violates the ASCII-only rule. Some search tools may not work
  // properly around these characters. Handle edits with care.
  const caretChars = useUnicodeCarets ? { open: '\u25BE', closed: '\u25B8' } : { open: 'v', closed: '>' };
  caretEl.textContent = defaultExpanded ? caretChars.open : caretChars.closed;
  caretEl.className = 'sage-collapsible-caret';

  const titleEl = document.createElement('h4');
  titleEl.textContent = titleText || '';
  titleEl.className = 'sage-collapsible-title';

  const contentEl = document.createElement('div');
  contentEl.className = `sage-collapsible-content${defaultExpanded ? '' : ' sage-collapsible-content--collapsed'}`;

  header.appendChild(caretEl);
  header.appendChild(titleEl);
  container.appendChild(header);
  container.appendChild(contentEl);

  let expanded = !!defaultExpanded;
  const setExpanded = (val) => {
    expanded = !!val;
    contentEl.classList.toggle('sage-collapsible-content--collapsed', !expanded);
    caretEl.textContent = expanded ? caretChars.open : caretChars.closed;
  };

  header.addEventListener('click', () => setExpanded(!expanded));

  return { container, header, titleEl, caretEl, contentEl, setExpanded, get isExpanded() { return expanded; } };
}

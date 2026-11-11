/**
 * Safe HTML Sanitizer for Rich Text Content
 * Allows formatting tags (b, strong, i, em, u, s, h1-h4, ul, ol, li, p, br, a, blockquote)
 * Strips dangerous tags (script, iframe, object, embed, etc.) and inline event handlers
 */

const ALLOWED_TAGS = new Set([
  'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'P', 'BR', 'HR',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'UL', 'OL', 'LI', 'BLOCKQUOTE', 'A', 'SPAN', 'DIV', 'CODE', 'PRE'
]);

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  A: new Set(['HREF', 'TITLE', 'TARGET', 'REL', 'CLASS']),
  SPAN: new Set(['STYLE', 'CLASS']),
  DIV: new Set(['CLASS']),
  P: new Set(['CLASS']),
  BLOCKQUOTE: new Set(['CLASS']),
  H1: new Set(['CLASS']),
  H2: new Set(['CLASS']),
  H3: new Set(['CLASS']),
  H4: new Set(['CLASS']),
  UL: new Set(['CLASS']),
  OL: new Set(['CLASS']),
  LI: new Set(['CLASS']),
};

export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    // Basic regex fallback if executed outside browser environment
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/javascript:/gi, '');
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    function cleanNode(node: Node) {
      const childNodes = Array.from(node.childNodes);
      for (const child of childNodes) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const el = child as HTMLElement;
          const tagName = el.tagName.toUpperCase();

          if (!ALLOWED_TAGS.has(tagName)) {
            // Remove dangerous tags completely
            if (['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'STYLE', 'FORM', 'INPUT'].includes(tagName)) {
              el.remove();
            } else {
              // For other unknown tags, unwrap their children
              while (el.firstChild) {
                el.parentNode?.insertBefore(el.firstChild, el);
              }
              el.remove();
            }
            continue;
          }

          // Clean attributes
          const allowedAttrs = ALLOWED_ATTRIBUTES[tagName] || new Set();
          const attrs = Array.from(el.attributes);
          for (const attr of attrs) {
            const attrName = attr.name.toUpperCase();
            if (attrName.startsWith('ON') || !allowedAttrs.has(attrName)) {
              el.removeAttribute(attr.name);
            }
          }

          // Special safety for anchors
          if (tagName === 'A') {
            const href = el.getAttribute('href') || '';
            const isSafeHref = /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(href.trim());
            if (!isSafeHref) {
              el.removeAttribute('href');
            } else {
              el.setAttribute('target', '_blank');
              el.setAttribute('rel', 'noopener noreferrer');
              el.classList.add('underline', 'font-medium', 'hover:opacity-80');
            }
          }

          cleanNode(child);
        } else if (child.nodeType === Node.COMMENT_NODE) {
          child.remove();
        }
      }
    }

    cleanNode(doc.body);
    return doc.body.innerHTML;
  } catch (err) {
    console.warn('HTML Sanitization error:', err);
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
}

export function stripHtml(html?: string | null): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}


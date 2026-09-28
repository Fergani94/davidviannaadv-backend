import sanitizeHtml from 'sanitize-html';

const CONFIG_ARTIGO: sanitizeHtml.IOptions = {
  allowedTags: ['h2', 'h3', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote', 'a'],
  allowedAttributes: { a: ['href', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href'],
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
};

const CONFIG_SO_TEXTO: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
};

export function sanitizarHtml(html: string): string {
  return sanitizeHtml(html, CONFIG_ARTIGO).trim();
}

export function textoDoHtml(html: string): string {
  return sanitizeHtml(html, CONFIG_SO_TEXTO).replace(/\u00a0|&nbsp;/g, ' ').trim();
}

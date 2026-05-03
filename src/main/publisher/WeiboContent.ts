const blockBreakPattern = /<\/(?:p|div|section|article|h[1-6]|li|blockquote)>/gi;
const openingBlockPattern = /<(?:p|div|section|article|h[1-6]|li|blockquote)(?:\s[^>]*)?>/gi;

export function normalizeWeiboPostText(input: string) {
  let text = input ?? '';

  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(openingBlockPattern, '');
  text = text.replace(blockBreakPattern, '\n');
  text = text.replace(/<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi, (_match, _quote, href, body) => {
    const label = stripHtml(body).trim();
    const decodedHref = decodeHtmlEntities(href).trim();
    if (!decodedHref) {
      return label;
    }
    if (!label || label === decodedHref) {
      return decodedHref;
    }
    return `${label} ${decodedHref}`;
  });
  text = text.replace(/<img\b[^>]*>/gi, '');
  text = stripHtml(text);
  text = decodeHtmlEntities(text);
  text = text.replace(/\u00a0/g, ' ');
  text = text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n');
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}

function stripHtml(input: string) {
  return input.replace(/<[^>]+>/g, '');
}

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

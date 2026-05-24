import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({
  gfm: true,
  breaks: false,
})

export function markdownToHtml(markdown: string): string {
  const raw = marked.parse(markdown, { async: false }) as string
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li',
      'strong', 'em', 'a', 'br', 'hr', 'code', 'pre', 'blockquote',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  })
}

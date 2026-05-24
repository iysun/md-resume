import type { AiCheckScope } from './ai-check'

export interface ScopePreview {
  charCount: number
  lineRange?: { from: number; to: number }
  excerpt: string
}

export function buildScopePreview(
  text: string,
  scope: AiCheckScope,
  lineRange?: { from: number; to: number } | null,
): ScopePreview {
  const charCount = text.length
  const excerpt = text.length > 80 ? `${text.slice(0, 80)}…` : text

  if (scope === 'selection' && lineRange) {
    return { charCount, lineRange, excerpt }
  }

  const totalLines = text.split('\n').length
  return {
    charCount,
    lineRange: totalLines > 0 ? { from: 1, to: totalLines } : undefined,
    excerpt,
  }
}

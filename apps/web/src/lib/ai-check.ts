export type AiCheckScope = 'selection' | 'document'

export interface AiCheckItem {
  category: 'error' | 'warning' | 'suggestion' | 'good'
  title: string
  detail: string
  original?: string
  suggestion?: string
}

export interface AiCheckResult {
  summary: string
  items: AiCheckItem[]
}

export async function checkMarkdown(
  text: string,
  scope: AiCheckScope,
): Promise<AiCheckResult> {
  const apiUrl = import.meta.env.VITE_AI_API_URL || '/api/ai-check'

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, scope }),
  })

  if (!response.ok) {
    let message = `检查失败 (${response.status})`
    try {
      const data = await response.json() as { error?: string }
      if (data.error) message = data.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  return response.json() as Promise<AiCheckResult>
}

import { consumeSseStream } from './sse'

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

type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; result: AiCheckResult }
  | { type: 'error'; message: string }

export async function checkMarkdownStream(
  text: string,
  scope: AiCheckScope,
  handlers: {
    onDelta: (chunk: string) => void
    onDone: (result: AiCheckResult) => void
    onError: (message: string) => void
  },
  options?: { documentId?: string; signal?: AbortSignal },
): Promise<void> {
  const apiUrl = import.meta.env.VITE_AI_API_URL
    ? `${import.meta.env.VITE_AI_API_URL}/stream`
    : '/api/ai-check/stream'

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, scope, documentId: options?.documentId }),
    signal: options?.signal,
  })

  if (!response.ok) {
    let message = `检查失败 (${response.status})`
    try {
      const data = await response.json() as { error?: string }
      if (data.error) message = data.error
    } catch {
      // ignore
    }
    handlers.onError(message)
    return
  }

  try {
    await consumeSseStream<StreamEvent>(response, (event) => {
      if (event.type === 'delta') {
        handlers.onDelta(event.text)
      } else if (event.type === 'done') {
        handlers.onDone(event.result)
      } else if (event.type === 'error') {
        handlers.onError(event.message)
      }
    }, options)
  } catch (err) {
    if (options?.signal?.aborted) return
    handlers.onError(err instanceof Error ? err.message : '检查失败')
  }
}

export async function checkMarkdown(
  text: string,
  scope: AiCheckScope,
  documentId?: string,
): Promise<AiCheckResult> {
  const apiUrl = import.meta.env.VITE_AI_API_URL || '/api/ai-check'

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, scope, documentId }),
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

import { consumeSseStream } from './sse'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

type ChatStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; message: string }
  | { type: 'error'; message: string }

export async function chatWithSelectionStream(
  selection: string,
  messages: ChatMessage[],
  handlers: {
    onDelta: (chunk: string) => void
    onDone: (message: string) => void
    onError: (message: string) => void
  },
  options?: { signal?: AbortSignal },
): Promise<void> {
  const apiUrl = import.meta.env.VITE_AI_CHAT_API_URL || '/api/ai-chat/stream'

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selection, messages }),
    signal: options?.signal,
  })

  if (!response.ok) {
    let message = `对话失败 (${response.status})`
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
    await consumeSseStream<ChatStreamEvent>(response, (event) => {
      if (event.type === 'delta') {
        handlers.onDelta(event.text)
      } else if (event.type === 'done') {
        handlers.onDone(event.message)
      } else if (event.type === 'error') {
        handlers.onError(event.message)
      }
    }, options)
  } catch (err) {
    if (options?.signal?.aborted) return
    handlers.onError(err instanceof Error ? err.message : '对话失败')
  }
}

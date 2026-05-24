export function parseSseBuffer<T>(buffer: string): { events: T[]; rest: string } {
  const events: T[] = []
  const parts = buffer.split('\n\n')
  const rest = parts.pop() ?? ''

  for (const part of parts) {
    const line = part.trim()
    if (!line.startsWith('data: ')) continue
    try {
      events.push(JSON.parse(line.slice(6)) as T)
    } catch {
      // ignore malformed events
    }
  }

  return { events, rest }
}

export async function consumeSseStream<T>(
  response: Response,
  onEvent: (event: T) => void,
  options?: { signal?: AbortSignal },
): Promise<void> {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('无法读取响应流')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const { events, rest } = parseSseBuffer<T>(buffer)
    buffer = rest

    for (const event of events) {
      onEvent(event)
    }
  }

  if (buffer.trim()) {
    const { events } = parseSseBuffer<T>(`${buffer}\n\n`)
    for (const event of events) {
      onEvent(event)
    }
  }

  if (options?.signal?.aborted) {
    return
  }
}

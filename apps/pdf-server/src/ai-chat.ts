import OpenAI from 'openai'
import { getAiApiKey, getAiBaseUrl, getAiModel } from './ai-config.js'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const BASE_SYSTEM_PROMPT = `你是一位专业的中文简历顾问，擅长 Markdown 格式简历的撰写与优化。

用户选中了一段简历内容作为上下文，请围绕这段内容回答用户的问题。你可以帮助润色、扩写、改写、精简、翻译或提供建议。

规则：
- 回答简洁专业，使用 Markdown 格式
- 若用户要求改写，直接给出改写后的文本
- 不要编造用户未提供的经历或事实
- 若问题与选区无关，仍可结合选区内容作答`

function buildSystemPrompt(selection: string): string {
  return `${BASE_SYSTEM_PROMPT}\n\n用户当前选中的简历片段：\n\n${selection}`
}

let client: OpenAI | null = null

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: getAiApiKey(),
      baseURL: getAiBaseUrl(),
    })
  }
  return client
}

export async function runAiChatStream(
  selection: string,
  messages: ChatMessage[],
  onDelta: (chunk: string) => void,
): Promise<string> {
  const openai = getClient()
  const model = getAiModel()

  const stream = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: buildSystemPrompt(selection) },
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ],
    stream: true,
  })

  let raw = ''
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? ''
    if (delta) {
      raw += delta
      onDelta(delta)
    }
  }

  return raw
}

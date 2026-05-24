import OpenAI from 'openai'

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

const SYSTEM_PROMPT = `你是一位专业的中文简历顾问，擅长 Markdown 格式简历的审阅与优化。

用户会提交一段 Markdown 简历内容（可能是全文或选区）。请仔细检查并给出结构化反馈。

你必须只输出合法 JSON，格式如下：
{
  "summary": "一段简短总评（1-3 句）",
  "items": [
    {
      "category": "error" | "warning" | "suggestion" | "good",
      "title": "问题或亮点标题",
      "detail": "详细说明",
      "original": "原文片段（可选，有具体改法时必填）",
      "suggestion": "建议修改后的文本（可选，有具体改法时必填）"
    }
  ]
}

分类说明：
- error：明确错误（错别字、事实矛盾、严重格式问题）
- warning：格式/标点/层级问题
- suggestion：措辞、表达、结构优化建议
- good：值得保留的亮点

规则：
- 若某条建议包含具体改法，必须同时填写 original 和 suggestion
- original 必须是用户文本中的真实子串，便于定位替换
- 不要输出 JSON 以外的任何内容
- 若内容质量很好，items 可以较少，但仍需给出 summary`

function buildUserPrompt(text: string, scope: 'selection' | 'document'): string {
  const scopeLabel = scope === 'selection' ? '选区片段' : '完整文档'
  return `请检查以下 Markdown 简历${scopeLabel}：\n\n${text}`
}

function parseAiResponse(raw: string): AiCheckResult {
  try {
    const parsed = JSON.parse(raw) as Partial<AiCheckResult>
    const summary = typeof parsed.summary === 'string' ? parsed.summary : raw
    const items = Array.isArray(parsed.items)
      ? parsed.items.filter(
          (item): item is AiCheckItem =>
            typeof item === 'object'
            && item !== null
            && typeof item.title === 'string'
            && typeof item.detail === 'string'
            && ['error', 'warning', 'suggestion', 'good'].includes(item.category),
        )
      : []
    return { summary, items }
  } catch {
    return { summary: raw, items: [] }
  }
}

let client: OpenAI | null = null

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
    })
  }
  return client
}

export async function runAiCheck(
  text: string,
  scope: 'selection' | 'document',
): Promise<AiCheckResult> {
  const openai = getClient()
  const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat'

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(text, scope) },
    ],
    response_format: { type: 'json_object' },
  })

  const content = completion.choices[0]?.message?.content ?? ''
  return parseAiResponse(content)
}

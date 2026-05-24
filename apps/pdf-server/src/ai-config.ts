export function getAiApiKey(): string | undefined {
  return process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY
}

export function getAiBaseUrl(): string {
  return (
    process.env.DEEPSEEK_BASE_URL
    || process.env.OPENAI_BASE_URL
    || 'https://api.deepseek.com'
  )
}

export function getAiModel(): string {
  return process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || 'deepseek-chat'
}

export const AI_API_KEY_ENV_NAMES = 'DEEPSEEK_API_KEY 或 OPENAI_API_KEY'

export function getAiApiKey(): string | undefined {
  return process.env.API_KEY || process.env.OPENAI_API_KEY
}

export function getAiBaseUrl(): string {
  return (
    process.env.BASE_URL
    || process.env.OPENAI_BASE_URL
    || 'https://api.deepseek.com'
  )
}

export function getAiModel(): string {
  return process.env.MODEL || process.env.OPENAI_MODEL || 'deepseek-chat'
}

export const AI_API_KEY_ENV_NAMES = 'API_KEY 或 OPENAI_API_KEY'

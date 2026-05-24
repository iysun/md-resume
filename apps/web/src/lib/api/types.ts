export type ThemeSetting = 'system' | 'light' | 'dark'

export type AiCheckScope = 'selection' | 'document'

export interface DocumentSummary {
  id: string
  title: string
  updatedAt: number
}

export interface DocumentRecord extends DocumentSummary {
  content: string
}

export interface AppSettings {
  activeDocumentId: string | null
  theme: ThemeSetting
}

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

export interface AiCheckSummary {
  id: string
  documentId: string
  scope: AiCheckScope
  inputPreview: string
  createdAt: number
}

export interface AiCheckDetail extends AiCheckSummary {
  result: AiCheckResult
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

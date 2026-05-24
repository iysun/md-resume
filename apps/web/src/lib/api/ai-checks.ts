import { apiFetch } from './client'
import type { AiCheckDetail, AiCheckSummary } from './types'

export function listAiChecks(documentId: string, limit = 20) {
  return apiFetch<AiCheckSummary[]>(
    `/api/documents/${documentId}/ai-checks?limit=${limit}`,
  )
}

export function getAiCheck(id: string) {
  return apiFetch<AiCheckDetail>(`/api/ai-checks/${id}`)
}

export function deleteAiCheck(id: string) {
  return apiFetch<void>(`/api/ai-checks/${id}`, { method: 'DELETE' })
}

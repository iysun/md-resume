import { apiFetch } from './client'
import type { DocumentRecord, DocumentSummary } from './types'

export function listDocuments() {
  return apiFetch<DocumentSummary[]>('/api/documents')
}

export function getDocument(id: string) {
  return apiFetch<DocumentRecord>(`/api/documents/${id}`)
}

export function createDocument(body: { title?: string; content?: string } = {}) {
  return apiFetch<DocumentRecord>('/api/documents', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateDocument(
  id: string,
  body: { title?: string; content?: string },
) {
  return apiFetch<DocumentRecord>(`/api/documents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteDocument(id: string) {
  return apiFetch<void>(`/api/documents/${id}`, { method: 'DELETE' })
}

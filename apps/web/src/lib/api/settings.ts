import { apiFetch } from './client'
import type { AppSettings, ThemeSetting } from './types'

export function getSettings() {
  return apiFetch<AppSettings>('/api/settings')
}

export function patchSettings(body: {
  activeDocumentId?: string
  theme?: ThemeSetting
}) {
  return apiFetch<AppSettings>('/api/settings', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

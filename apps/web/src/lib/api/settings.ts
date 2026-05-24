import { apiFetch } from './client'
import type { AppSettings, AccentColor, ThemeSetting } from './types'

export function getSettings() {
  return apiFetch<AppSettings>('/api/settings')
}

export function patchSettings(body: {
  activeDocumentId?: string
  theme?: ThemeSetting
  accentColor?: AccentColor
}) {
  return apiFetch<AppSettings>('/api/settings', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

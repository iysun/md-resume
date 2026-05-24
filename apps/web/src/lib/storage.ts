import type { ThemeSetting } from './api/types'

const STORAGE_KEY = 'md-resume:content'
const THEME_KEY = 'md-resume:theme'
const PANE_RATIO_KEY = 'md-resume:editorPaneRatio'
const HELP_DISMISSED_KEY = 'md-resume:helpDismissed'

export function loadContent(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function saveContent(content: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, content)
  } catch {
    // ignore
  }
}

export function clearContent(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function loadTheme(): ThemeSetting | null {
  try {
    const value = localStorage.getItem(THEME_KEY)
    if (value === 'system' || value === 'light' || value === 'dark') return value
    return null
  } catch {
    return null
  }
}

export function saveTheme(theme: ThemeSetting): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // ignore
  }
}

export function loadEditorPaneRatio(): number {
  try {
    const value = localStorage.getItem(PANE_RATIO_KEY)
    if (!value) return 0.5
    const ratio = Number.parseFloat(value)
    if (Number.isFinite(ratio) && ratio >= 0.3 && ratio <= 0.7) return ratio
    return 0.5
  } catch {
    return 0.5
  }
}

export function saveEditorPaneRatio(ratio: number): void {
  try {
    localStorage.setItem(PANE_RATIO_KEY, String(ratio))
  } catch {
    // ignore
  }
}

export function isHelpDismissed(): boolean {
  try {
    return localStorage.getItem(HELP_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissHelp(): void {
  try {
    localStorage.setItem(HELP_DISMISSED_KEY, '1')
  } catch {
    // ignore
  }
}

export function deriveTitleFromContent(content: string, fallback = '未命名简历'): string {
  const match = content.match(/^#\s+(.+)$/m)
  if (!match?.[1]) return fallback
  const title = match[1].trim()
  return title || fallback
}

export async function loadDefaultTemplate(): Promise<string> {
  const response = await fetch('/templates/resume.zh-CN.md')
  if (!response.ok) {
    throw new Error('无法加载默认模板')
  }
  return response.text()
}

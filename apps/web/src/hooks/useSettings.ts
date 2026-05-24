import { useCallback, useEffect, useState } from 'react'
import { getSettings, patchSettings } from '../lib/api/settings'
import type { AccentColor, ThemeSetting } from '../lib/api/types'
import {
  applyAccentColor,
  DEFAULT_ACCENT,
} from '../lib/accent-colors'
import {
  loadAccentColor,
  loadEditorPaneRatio,
  loadTheme,
  saveAccentColor,
  saveEditorPaneRatio,
  saveTheme,
} from '../lib/storage'

function resolveTheme(theme: ThemeSetting): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return theme
}

function applyTheme(theme: ThemeSetting) {
  document.documentElement.dataset.theme = resolveTheme(theme)
}

const THEME_CYCLE: ThemeSetting[] = ['system', 'light', 'dark']

export function useSettings(backendAvailable: boolean) {
  const [theme, setTheme] = useState<ThemeSetting>(() => loadTheme() ?? 'system')
  const [accentColor, setAccentColor] = useState<AccentColor>(
    () => loadAccentColor() ?? DEFAULT_ACCENT,
  )
  const [editorPaneRatio, setEditorPaneRatio] = useState(loadEditorPaneRatio)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  const ready = !backendAvailable || settingsLoaded

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    applyAccentColor(accentColor)
  }, [accentColor])

  useEffect(() => {
    if (!backendAvailable) return

    let cancelled = false

    getSettings()
      .then((settings) => {
        if (cancelled) return
        setTheme(settings.theme)
        setAccentColor(settings.accentColor ?? DEFAULT_ACCENT)
        setSettingsLoaded(true)
      })
      .catch(() => {
        if (!cancelled) {
          setTheme(loadTheme() ?? 'system')
          setAccentColor(loadAccentColor() ?? DEFAULT_ACCENT)
          setSettingsLoaded(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [backendAvailable])

  useEffect(() => {
    if (theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    function handleChange() {
      applyTheme('system')
    }

    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [theme])

  const changeTheme = useCallback(
    async (nextTheme: ThemeSetting) => {
      setTheme(nextTheme)
      saveTheme(nextTheme)
      if (!backendAvailable) return
      try {
        await patchSettings({ theme: nextTheme })
      } catch {
        // keep local theme even if save fails
      }
    },
    [backendAvailable],
  )

  const changeAccentColor = useCallback(
    async (nextAccent: AccentColor) => {
      setAccentColor(nextAccent)
      saveAccentColor(nextAccent)
      if (!backendAvailable) return
      try {
        await patchSettings({ accentColor: nextAccent })
      } catch {
        // keep local accent even if save fails
      }
    },
    [backendAvailable],
  )

  const cycleTheme = useCallback(() => {
    const index = THEME_CYCLE.indexOf(theme)
    const next = THEME_CYCLE[(index + 1) % THEME_CYCLE.length]
    void changeTheme(next)
  }, [changeTheme, theme])

  const changeEditorPaneRatio = useCallback((ratio: number) => {
    const clamped = Math.min(0.7, Math.max(0.3, ratio))
    setEditorPaneRatio(clamped)
    saveEditorPaneRatio(clamped)
  }, [])

  return {
    theme,
    accentColor,
    ready,
    changeTheme,
    changeAccentColor,
    cycleTheme,
    resolvedTheme: resolveTheme(theme),
    editorPaneRatio,
    changeEditorPaneRatio,
  }
}

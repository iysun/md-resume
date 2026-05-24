import { useCallback, useEffect, useState } from 'react'
import { getSettings, patchSettings } from '../lib/api/settings'
import type { ThemeSetting } from '../lib/api/types'
import {
  loadEditorPaneRatio,
  loadTheme,
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
  const [editorPaneRatio, setEditorPaneRatio] = useState(loadEditorPaneRatio)
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  const ready = !backendAvailable || settingsLoaded

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (!backendAvailable) return

    let cancelled = false

    getSettings()
      .then((settings) => {
        if (cancelled) return
        setTheme(settings.theme)
        setSettingsLoaded(true)
      })
      .catch(() => {
        if (!cancelled) {
          const localTheme = loadTheme() ?? 'system'
          setTheme(localTheme)
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
    ready,
    changeTheme,
    cycleTheme,
    resolvedTheme: resolveTheme(theme),
    editorPaneRatio,
    changeEditorPaneRatio,
  }
}

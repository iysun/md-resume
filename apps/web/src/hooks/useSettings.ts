import { useCallback, useEffect, useState } from 'react'
import { getSettings, patchSettings } from '../lib/api/settings'
import type { ThemeSetting } from '../lib/api/types'

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

export function useSettings(backendAvailable: boolean) {
  const [theme, setTheme] = useState<ThemeSetting>('system')
  const [ready, setReady] = useState(!backendAvailable)

  useEffect(() => {
    if (backendAvailable) return
    applyTheme('system')
  }, [backendAvailable])

  useEffect(() => {
    if (!backendAvailable) return

    let cancelled = false

    getSettings()
      .then((settings) => {
        if (cancelled) return
        setTheme(settings.theme)
        applyTheme(settings.theme)
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) {
          applyTheme('system')
          setReady(true)
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
      applyTheme(nextTheme)
      if (!backendAvailable) return
      try {
        await patchSettings({ theme: nextTheme })
      } catch {
        // keep local theme even if save fails
      }
    },
    [backendAvailable],
  )

  return {
    theme,
    ready,
    changeTheme,
    resolvedTheme: resolveTheme(theme),
  }
}

import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => (document.documentElement.dataset.theme as Theme) || 'light',
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('theme', theme)
    } catch {
      /* storage can be blocked; the theme still applies for this visit */
    }
  }, [theme])

  // Briefly enable color transitions so the whole page cross-fades between themes.
  const toggle = useCallback(() => {
    const root = document.documentElement
    root.classList.add('theme-anim')
    window.setTimeout(() => root.classList.remove('theme-anim'), 400)
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])
  return { theme, toggle }
}

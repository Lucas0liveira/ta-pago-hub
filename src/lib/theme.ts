export type ThemeMode   = 'dark' | 'light'
export type ThemeAccent = 'dark' | 'ocean' | 'girly' | 'royal'

export interface ThemePrefs { mode: ThemeMode; accent: ThemeAccent }

// Fixed hex values — independent of CSS variable overrides so dots always show correctly
export const ACCENT_OPTIONS: { key: ThemeAccent; label: string; color: string }[] = [
  { key: 'dark',  label: 'Verde',  color: '#10b981' },
  { key: 'ocean', label: 'Oceano', color: '#0ea5e9' },
  { key: 'girly', label: 'Rosa',   color: '#ec4899' },
  { key: 'royal', label: 'Royal',  color: '#8b5cf6' },
]

export function applyTheme(prefs: ThemePrefs) {
  const html = document.documentElement
  html.setAttribute('data-mode',   prefs.mode)
  html.setAttribute('data-accent', prefs.accent)
  localStorage.setItem('theme-mode',   prefs.mode)
  localStorage.setItem('theme-accent', prefs.accent)
}

export function getStoredTheme(): ThemePrefs {
  return {
    mode:   (localStorage.getItem('theme-mode')   as ThemeMode)   ?? 'dark',
    accent: (localStorage.getItem('theme-accent') as ThemeAccent) ?? 'dark',
  }
}

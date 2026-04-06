export type ThemeMode   = 'dark' | 'light'
export type ThemeAccent = 'dark' | 'ocean' | 'girly' | 'royal'

export interface ThemePrefs { mode: ThemeMode; accent: ThemeAccent }

export const ACCENT_OPTIONS: { key: ThemeAccent; label: string; dot: string }[] = [
  { key: 'dark',  label: 'Verde',  dot: 'bg-emerald-500' },
  { key: 'ocean', label: 'Oceano', dot: 'bg-sky-500'     },
  { key: 'girly', label: 'Rosa',   dot: 'bg-pink-500'    },
  { key: 'royal', label: 'Royal',  dot: 'bg-violet-500'  },
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

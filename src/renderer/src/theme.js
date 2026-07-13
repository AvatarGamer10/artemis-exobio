import { useEffect } from 'react'

export const PRESETS = [
  { id: 'orange', labelKey: 'presetOrange', accent: '#ff8a2a' },
  { id: 'ice', labelKey: 'presetIce', accent: '#4db8ff' },
  { id: 'bio', labelKey: 'presetBio', accent: '#52e06b' },
  { id: 'violet', labelKey: 'presetViolet', accent: '#b98aff' }
]

export const DEFAULT_THEME = { accent: '#ff8a2a', opacity: 0.9 }

// Aplica el tema como variables CSS en :root; el resto de colores
// se derivan con color-mix() en la hoja de estilos.
export function useTheme(theme) {
  useEffect(() => {
    const th = { ...DEFAULT_THEME, ...(theme || {}) }
    const root = document.documentElement
    root.style.setProperty('--accent', th.accent)
    root.style.setProperty('--bg-o', String(th.opacity))
  }, [theme?.accent, theme?.opacity])
}

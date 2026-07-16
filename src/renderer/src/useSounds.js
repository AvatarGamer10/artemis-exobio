import { useEffect, useRef } from 'react'
import { play } from './sounds.js'

// Observa las transiciones del estado y dispara las alertas sonoras:
// - 'clear': acabas de salir del radio de colonia (la siguiente muestra vale)
// - 'chime'/'jackpot': muestra completada (jackpot si ≥15M)
// - 'jackpot': detectado un cuerpo con predicción ≥15M
// - 'warn': combustible bajo
export function useSounds(state) {
  const prev = useRef(null)
  const announced = useRef(new Set())

  useEffect(() => {
    const p = prev.current
    prev.current = state
    if (!p || !state) return
    const cfg = state.settings?.sounds || { enabled: true, volume: 0.5 }
    if (!cfg.enabled) return
    const v = cfg.volume ?? 0.5

    if (
      state.sampling?.clear &&
      p.sampling &&
      !p.sampling.clear &&
      p.sampling.species === state.sampling.species
    ) {
      play('clear', v)
    }

    // Primera muestra de una variante que no está en tu colección
    if (
      state.sampling?.isNewVariant &&
      state.sampling.species !== p.sampling?.species
    ) {
      play('sparkle', v)
    }

    if (state.session.samplesCompleted > p.session.samplesCompleted) {
      const last = state.vault[state.vault.length - 1]
      play(last && last.value >= 15000000 ? 'jackpot' : 'chime', v)
    }

    if (state.status.lowFuel && !p.status.lowFuel) play('warn', v)

    // Cuerpo nuevo con predicción de premio gordo
    for (const [id, b] of Object.entries(state.bioBodies || {})) {
      const hasBio = b.bioCount > 0 || b.genuses.length > 0
      const best = b.predictions?.[0]
      if (!hasBio || !best || best.value < 15000000) continue
      const key = `${state.system.name}|${id}`
      if (announced.current.has(key)) continue
      announced.current.add(key)
      const pb = p.bioBodies?.[id]
      const alreadyThere =
        pb && (pb.bioCount > 0 || pb.genuses.length > 0) && pb.predictions?.[0]?.value >= 15000000
      // Solo sonar si acaba de aparecer en vivo (no al recargar el estado inicial)
      if (!alreadyThere) play('jackpot', v)
    }
  }, [state])
}

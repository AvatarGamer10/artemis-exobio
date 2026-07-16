import React, { useMemo, useState } from 'react'
import { cr } from '../useArtemis.js'
import { SPECIES_VALUES } from '../../../main/exobio.js'
import { IconLeaf } from '../Icons.jsx'

// Colores de las variantes (nombres localizados ES + EN del juego)
const VARIANT_COLORS = {
  verde: '#58c46a', green: '#58c46a',
  esmeralda: '#2ecc71', emerald: '#2ecc71',
  lima: '#a8e05f', lime: '#a8e05f',
  turquesa: '#40c9b8', turquoise: '#40c9b8',
  teal: '#2a9d8f',
  cian: '#5bc8e8', cyan: '#5bc8e8',
  zafiro: '#3b6fd4', sapphire: '#3b6fd4',
  añil: '#6a5cd6', indigo: '#6a5cd6',
  azul: '#4a90d9', blue: '#4a90d9',
  aguamarina: '#7fd4c1', aquamarine: '#7fd4c1',
  ámbar: '#e8a53a', amber: '#e8a53a',
  amarillo: '#e8d44d', yellow: '#e8d44d',
  dorado: '#d4af37', gold: '#d4af37',
  naranja: '#e87a2e', orange: '#e87a2e',
  ocre: '#b8863b', ocher: '#b8863b', ochre: '#b8863b',
  rojo: '#d64545', red: '#d64545',
  granate: '#8e3030', maroon: '#8e3030',
  malva: '#b06bd4', mauve: '#b06bd4',
  magenta: '#d545b8', fucsia: '#e055a0', fuchsia: '#e055a0',
  coral: '#e8756a', melocotón: '#f0b08a', peach: '#f0b08a',
  gris: '#9aa0a6', grey: '#9aa0a6', gray: '#9aa0a6',
  blanco: '#e8e8e8', white: '#e8e8e8'
}

function rarityOf(value) {
  if (value >= 15000000) return 'legendary'
  if (value >= 8000000) return 'rare'
  if (value >= 2000000) return 'uncommon'
  return 'common'
}

function colorOf(variantName, species) {
  if (!variantName) return null
  const tail = variantName.replace(species, '').replace(/^[\s-–—]+/, '').trim()
  return { name: tail || variantName, hex: VARIANT_COLORS[tail.toLowerCase()] || '#8a8a8a' }
}

export default function Collection({ state, t, lang }) {
  const [query, setQuery] = useState('')
  const [onlyGot, setOnlyGot] = useState(false)
  const locale = lang === 'en' ? 'en-GB' : 'es-ES'
  const library = state.library || []

  // especie → variantes coleccionadas (primera captura de cada variante)
  const collected = useMemo(() => {
    const map = new Map()
    const sorted = [...library].sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''))
    for (const e of sorted) {
      if (!map.has(e.species)) map.set(e.species, new Map())
      const variants = map.get(e.species)
      const key = e.variant || '—'
      if (!variants.has(key)) variants.set(key, e)
    }
    return map
  }, [library])

  const allSpecies = useMemo(
    () =>
      Object.entries(SPECIES_VALUES)
        .map(([species, value]) => ({ species, value, genus: species.split(' ')[0] }))
        .sort((a, b) => a.species.localeCompare(b.species)),
    []
  )

  const q = query.trim().toLowerCase()
  const shown = allSpecies.filter((s) => {
    if (onlyGot && !collected.has(s.species)) return false
    if (!q) return true
    if (s.species.toLowerCase().includes(q)) return true
    const variants = collected.get(s.species)
    return variants ? [...variants.values()].some((e) => (e.variant || '').toLowerCase().includes(q)) : false
  })

  const gotSpecies = allSpecies.filter((s) => collected.has(s.species)).length
  const gotVariants = [...collected.values()].reduce((n, v) => n + v.size, 0)
  const legendaries = allSpecies.filter((s) => rarityOf(s.value) === 'legendary')
  const gotLegendaries = legendaries.filter((s) => collected.has(s.species)).length

  // agrupar por género
  const byGenus = new Map()
  for (const s of shown) {
    if (!byGenus.has(s.genus)) byGenus.set(s.genus, [])
    byGenus.get(s.genus).push(s)
  }

  return (
    <>
      <div className="panel">
        <h2>
          <IconLeaf size={16} /> {t('dexTitle')}
        </h2>
        <div className="grid3">
          <div className="stat">
            <div className="n">{gotSpecies}/{allSpecies.length}</div>
            <div className="l">{t('dexSpecies')}</div>
          </div>
          <div className="stat">
            <div className="n">{gotVariants}</div>
            <div className="l">{t('dexVariants')}</div>
          </div>
          <div className="stat">
            <div className="n rar-legendary-text">{gotLegendaries}/{legendaries.length}</div>
            <div className="l">{t('dexLegendaries')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="hud"
            style={{ flex: 1, minWidth: 220 }}
            value={query}
            placeholder={t('dexSearchPh')}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className={`hud ${onlyGot ? '' : 'ghost'}`} onClick={() => setOnlyGot(!onlyGot)}>
            {t('dexOnlyGot')}
          </button>
        </div>
      </div>

      {[...byGenus.entries()].map(([genus, list]) => (
        <div className="panel" key={genus}>
          <h2>
            <IconLeaf size={15} /> {genus.toUpperCase()} —{' '}
            {list.filter((s) => collected.has(s.species)).length}/{list.length}
          </h2>
          <div className="dex-grid">
            {list.map((s) => {
              const variants = collected.get(s.species)
              const got = !!variants
              const rar = rarityOf(s.value)
              return (
                <div key={s.species} className={`dex-card ${rar} ${got ? 'got' : 'miss'}`}>
                  <div className="dex-head">
                    <span className="species dex-name">{s.species}</span>
                    <span className={`dex-rar rar-${rar}`}>{t(`rar_${rar}`)}</span>
                  </div>
                  <div className="dex-value">{cr(s.value)}</div>
                  {got ? (
                    <div className="dex-chips">
                      {[...variants.values()].map((e) => {
                        const c = colorOf(e.variant, e.species)
                        const date = e.timestamp
                          ? new Date(e.timestamp).toLocaleDateString(locale)
                          : '—'
                        return (
                          <span
                            key={e.variant || '—'}
                            className="dex-chip"
                            title={`${c?.name || '—'} · ${date} · ${e.system || '?'} — ${e.body || '?'}`}
                          >
                            {c && <i style={{ background: c.hex }} />}
                            {c?.name || '—'}
                            <small>
                              {date} · {e.system || '?'}
                            </small>
                          </span>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="dex-unknown">{t('dexMissing')}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}

import React, { useMemo } from 'react'
import { cr } from '../useArtemis.js'
import { SPECIES_VALUES } from '../../../main/exobio.js'
import { IconGraph, IconLeaf, IconCheck } from '../Icons.jsx'

const DAY_MS = 86400000
const dayKey = (d) => new Date(d).toISOString().slice(0, 10)

// Barras de créditos por día (SVG, una sola serie en el color de acento;
// etiqueta directa solo en el pico, tooltip nativo por barra)
function DailyBars({ days, locale }) {
  const W = 720
  const H = 190
  const padL = 10
  const padB = 26
  const padT = 26
  const max = Math.max(...days.map((d) => d.value), 1)
  const bw = (W - padL * 2) / days.length
  const peak = days.reduce((a, b) => (b.value > a.value ? b : a), days[0])
  const fmtDay = (k) =>
    new Date(k + 'T12:00:00Z').toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <line className="grid" x1={padL} y1={H - padB} x2={W - padL} y2={H - padB} />
      <line className="grid faint" x1={padL} y1={padT} x2={W - padL} y2={padT} />
      <text className="axis-label" x={padL} y={padT - 6}>
        {Math.round(max / 1e6)}M
      </text>
      {days.map((d, i) => {
        const h = d.value > 0 ? Math.max(3, ((H - padB - padT) * d.value) / max) : 0
        const x = padL + i * bw + 1
        return (
          <g key={d.key}>
            {d.value > 0 && (
              <rect
                className="dbar"
                x={x}
                y={H - padB - h}
                width={Math.max(2, bw - 2)}
                height={h}
                rx="2"
              >
                <title>{`${fmtDay(d.key)} — ${cr(d.value)}`}</title>
              </rect>
            )}
            {i % 7 === 0 && (
              <text className="axis-label" x={x} y={H - padB + 15}>
                {fmtDay(d.key)}
              </text>
            )}
          </g>
        )
      })}
      {peak?.value > 0 && (
        <text
          className="peak-label"
          x={padL + days.indexOf(peak) * bw + bw / 2}
          y={H - padB - Math.max(3, ((H - padB - padT) * peak.value) / max) - 6}
          textAnchor="middle"
        >
          {Math.round(peak.value / 1e6)}M
        </text>
      )}
    </svg>
  )
}

export default function Stats({ state, t, lang }) {
  const locale = lang === 'en' ? 'en-GB' : 'es-ES'
  const library = state.library || []

  const { days, genusRows, records } = useMemo(() => {
    // Créditos por día, últimos 30
    const byDay = new Map()
    for (const l of library) {
      if (!l.timestamp) continue
      const k = dayKey(l.timestamp)
      byDay.set(k, (byDay.get(k) || 0) + (l.value || 0))
    }
    const today = Date.now()
    const days = Array.from({ length: 30 }, (_, i) => {
      const k = dayKey(today - (29 - i) * DAY_MS)
      return { key: k, value: byDay.get(k) || 0 }
    })

    // Colección por género: especies distintas capturadas vs catálogo
    const catalog = new Map()
    for (const sp of Object.keys(SPECIES_VALUES)) {
      const g = sp.split(' ')[0]
      catalog.set(g, (catalog.get(g) || 0) + 1)
    }
    const collected = new Map()
    for (const sp of new Set(library.map((l) => l.species))) {
      const g = (sp || '').split(' ')[0]
      if (catalog.has(g)) collected.set(g, (collected.get(g) || 0) + 1)
    }
    const genusRows = [...catalog.entries()]
      .map(([g, total]) => ({ genus: g, total, got: collected.get(g) || 0 }))
      .sort((a, b) => b.got / b.total - a.got / a.total || b.got - a.got)

    // Récords
    let bestDay = null
    for (const [k, v] of byDay) if (!bestDay || v > bestDay.value) bestDay = { key: k, value: v }
    let top = null
    for (const l of library) if (!top || (l.value || 0) > (top.value || 0)) top = l
    const records = {
      bestDay,
      top,
      confirmed: library.filter((l) => l.firstLoggedConfirmed === true).length,
      total: library.reduce((s, l) => s + (l.value || 0), 0)
    }
    return { days, genusRows, records }
  }, [library])

  if (library.length === 0) {
    return (
      <div className="panel">
        <div className="empty">
          <IconGraph size={40} />
          <div>{t('stEmpty')}</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="panel">
        <h2>
          <IconGraph size={16} /> {t('stRecords')}
        </h2>
        <div className="grid2" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <div className="stat">
            <div className="n">{records.bestDay ? Math.round(records.bestDay.value / 1e6) + 'M' : '—'}</div>
            <div className="l">
              {t('stBestDay')}
              {records.bestDay
                ? ` · ${new Date(records.bestDay.key + 'T12:00:00Z').toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`
                : ''}
            </div>
          </div>
          <div className="stat">
            <div className="n">{records.top ? Math.round((records.top.value || 0) / 1e6) + 'M' : '—'}</div>
            <div className="l">
              {t('stTopSpecies')}
              {records.top ? ` · ${records.top.species}` : ''}
            </div>
          </div>
          <div className="stat">
            <div className="n">{records.confirmed}</div>
            <div className="l">{t('stConfirmedFF')}</div>
          </div>
          <div className="stat">
            <div className="n">{cr(records.total)}</div>
            <div className="l">{t('stTotal')}</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>
          <IconGraph size={16} /> {t('stDaily')}
        </h2>
        <DailyBars days={days} locale={locale} />
      </div>

      <div className="panel">
        <h2>
          <IconLeaf size={16} /> {t('stGenus')}
        </h2>
        {genusRows.map((r) => (
          <div key={r.genus} className="grow">
            <span className="grow-name">
              {r.genus} {r.got === r.total && <IconCheck size={12} />}
            </span>
            <div className="bar-wrap grow-bar">
              <div
                className={`bar ${r.got === r.total ? 'ok' : ''}`}
                style={{ width: (r.got / r.total) * 100 + '%' }}
              />
            </div>
            <span className="grow-count">
              {r.got}/{r.total}
            </span>
          </div>
        ))}
      </div>
    </>
  )
}

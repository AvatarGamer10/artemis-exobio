import React from 'react'
import { IconRadar } from '../Icons.jsx'

// Mapa lineal del sistema estilo FSS: cuerpos ordenados por distancia de
// llegada, estrellas grandes, planetas pequeños, bio en verde con contador.
export default function SystemMap({ state, t }) {
  const bodies = Object.values(state.systemBodies || {}).sort(
    (a, b) => (a.distLs ?? 0) - (b.distLs ?? 0)
  )
  if (bodies.length === 0) return null

  const H = 150
  const pad = 46
  const W = Math.max(560, bodies.length * 64 + pad * 2)
  const y = 62
  const step = bodies.length > 1 ? (W - pad * 2) / (bodies.length - 1) : 0

  const radius = (b) => {
    if (b.star) return 15
    if ((b.planetClass || '').toLowerCase().includes('giant')) return 11
    return b.landable ? 8 : 6.5
  }
  const shortName = (b) =>
    state.system.name && b.name.startsWith(state.system.name)
      ? b.name.slice(state.system.name.length).trim() || '★'
      : b.name

  return (
    <div className="panel">
      <h2>
        <IconRadar size={16} /> {t('mapTitle')}
      </h2>
      <div style={{ overflowX: 'auto' }}>
        <svg
          className="sysmap"
          viewBox={`0 0 ${W} ${H}`}
          style={{ minWidth: Math.min(W, 900), height: 'auto' }}
        >
          <line className="orbit-line" x1={pad} y1={y} x2={W - pad} y2={y} />
          {bodies.map((b, i) => {
            const x = pad + step * i
            const r = radius(b)
            const bioInfo = state.bioBodies[b.id]
            const bio =
              bioInfo && (bioInfo.bioCount > 0 || bioInfo.genuses.length > 0) ? bioInfo : null
            const best = bio?.predictions?.[0]
            const isCurrent =
              b.name === state.currentBodyName || b.name === state.status.bodyName
            const labelUp = i % 2 === 1
            return (
              <g key={b.id}>
                {b.star && <circle className="star-glow" cx={x} cy={y} r={r + 9} />}
                <circle
                  className={b.star ? 'star' : `planet ${b.landable ? 'landable' : ''} ${bio ? 'bio' : ''}`}
                  cx={x}
                  cy={y}
                  r={r}
                >
                  <title>
                    {b.name}
                    {b.star ? ` — ${b.star}` : b.planetClass ? ` — ${b.planetClass}` : ''}
                    {bio ? ` — ${bio.bioCount} ${t('mapBio')}` : ''}
                    {best ? ` — ${t('predUpTo')} ${Math.round(best.value / 1e6)}M cr` : ''}
                    {` — ${Math.round(b.distLs)} ls`}
                  </title>
                </circle>
                {bio && (
                  <text className="bio-count" x={x} y={y + 3.5} textAnchor="middle">
                    {bio.bioCount}
                  </text>
                )}
                {isCurrent && <circle className="current-ring" cx={x} cy={y} r={r + 6} />}
                <text
                  className={`body-label ${bio ? 'bio' : ''}`}
                  x={x}
                  y={labelUp ? y - r - 14 : y + r + 20}
                  textAnchor="middle"
                >
                  {shortName(b)}
                </text>
                <text
                  className="body-label"
                  x={x}
                  y={labelUp ? y - r - 27 : y + r + 33}
                  textAnchor="middle"
                  opacity="0.55"
                >
                  {Math.round(b.distLs)} ls
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <div className="muted map-legend">{t('mapLegend')}</div>
    </div>
  )
}

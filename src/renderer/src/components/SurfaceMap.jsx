import React from 'react'

// Mini-mapa de superficie ("migas de pan"): proyección plana local en metros,
// centrada en el jugador, norte arriba. Pinta tu rastro, las muestras tomadas
// (①②), el círculo del radio de colonia alrededor de la última muestra y tu
// rumbo. Solo aparece con muestreo activo y posición de superficie.
export default function SurfaceMap({ state, size = 150 }) {
  const { lat, lon, planetRadius, heading } = state.status
  const s = state.sampling
  if (lat == null || lon == null || !planetRadius || !s?.lastSamplePos) return null

  const rad = (d) => (d * Math.PI) / 180
  const project = (p) => ({
    x: planetRadius * Math.cos(rad(lat)) * rad(p.lon - lon),
    y: planetRadius * rad(p.lat - lat)
  })

  const range = s.colonyRange || 100
  const samples = (s.samplePositions || []).map(project)
  const trail = (state.trail || []).slice(-120).map(project)
  const colony = project(s.lastSamplePos)

  // Escala: deben caber el círculo de colonia entero y todo el rastro
  let maxR = Math.hypot(colony.x, colony.y) + range
  for (const p of trail) maxR = Math.max(maxR, Math.hypot(p.x, p.y))
  maxR = Math.max(maxR * 1.12, 60)
  const k = (size / 2 - 9) / maxR
  const c = size / 2
  const X = (p) => c + p.x * k
  const Y = (p) => c - p.y * k

  return (
    <svg className="smap" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle className="compass" cx={c} cy={c} r={c - 3} />
      <text className="north" x={c} y={11} textAnchor="middle">N</text>

      {trail.length > 1 && (
        <polyline className="trail" points={trail.map((p) => `${X(p)},${Y(p)}`).join(' ')} />
      )}

      <circle
        className={`colony ${s.clear ? 'ok' : ''}`}
        cx={X(colony)}
        cy={Y(colony)}
        r={range * k}
      />

      {samples.map((p, i) => (
        <g key={i}>
          <circle className="sample" cx={X(p)} cy={Y(p)} r="6" />
          <text className="sample-n" x={X(p)} y={Y(p) + 2.7} textAnchor="middle">
            {i + 1}
          </text>
        </g>
      ))}

      <polygon
        className="player"
        points="0,-6.5 4.5,5.5 0,3 -4.5,5.5"
        transform={`translate(${c},${c}) rotate(${heading ?? 0})`}
      />

      <text className="scale-label" x={size - 5} y={size - 5} textAnchor="end">
        ⌀ {Math.round(maxR * 2)} m
      </text>
    </svg>
  )
}

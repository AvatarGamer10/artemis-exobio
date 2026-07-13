import React from 'react'

// Dial radial inspirado en el Genetic Sampler: el arco marca la distancia
// recorrida desde la última muestra respecto al radio de colonia; las tres
// muescas inferiores son los pasos Log/Sample/Analyse.
export default function SamplerDial({ step = 0, dist = 0, range = null, clear = false, size = 168 }) {
  const R = 66
  const C = 2 * Math.PI * R
  const pct = range ? Math.min(1, (dist || 0) / range) : 0
  const ticks = []
  for (let i = 0; i < 48; i++) {
    const major = i % 4 === 0
    ticks.push(
      <line
        key={i}
        className={`tick ${major ? 'major' : ''}`}
        x1="0"
        y1={-82}
        x2="0"
        y2={major ? -75 : -78}
        transform={`rotate(${i * 7.5})`}
      />
    )
  }
  return (
    <svg className="dial" width={size} height={size} viewBox="0 0 180 180" aria-hidden="true">
      <g transform="translate(90,90)">
        {ticks}
        <circle className="track" r={R} />
        <circle
          className={`arc ${clear ? 'ok' : ''}`}
          r={R}
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct)}
          transform="rotate(-90)"
        />
        <text className={`dist ${clear ? 'ok' : ''}`} y="6" textAnchor="middle">
          {range ? Math.round(dist || 0) : '—'}
        </text>
        <text className="unit" y="24" textAnchor="middle">
          {range ? `/ ${range} m` : ''}
        </text>
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            className={`pip ${step > i ? 'done' : ''}`}
            x={-21 + i * 15}
            y="36"
            width="12"
            height="5"
          />
        ))}
      </g>
    </svg>
  )
}

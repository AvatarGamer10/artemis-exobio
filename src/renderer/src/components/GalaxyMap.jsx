import React, { useEffect, useMemo, useRef, useState } from 'react'
import regionData from '../data/RegionMapData.json'
import { IconRadar, IconRoute } from '../Icons.jsx'

// Carta Galáctica: las 42 regiones del juego (datos de klightspeed, MIT)
// como raster RLE 2048×2048. Clic en cualquier punto → Spansh devuelve los
// sistemas conocidos más cercanos → destino ploteable aunque tu objetivo
// real no esté en ninguna base de datos.

// Constantes del grid (RegionMap de klightspeed)
const X0 = -49985
const Z0 = -24105
const CELL = 4096 / 83 // ≈ 49.35 al por celda
const GRID = 2048

const toCell = (x, z) => ({ gx: (x - X0) / CELL, gz: (z - Z0) / CELL })
const toGalactic = (gx, gz) => ({ x: gx * CELL + X0, z: gz * CELL + Z0 })

const LANDMARKS = [
  { name: 'Sol', x: 0, z: 0 },
  { name: 'Sagittarius A*', x: 25.2, z: 25899.9 },
  { name: 'Colonia', x: -9530.5, z: 19808.1 },
  { name: 'Beagle Point', x: -1111.6, z: 65269.8 }
]

function regionColor(id) {
  // Tintas cartográficas apagadas, distinguibles entre vecinas
  const h = (id * 71) % 360
  return `hsl(${h} 26% ${20 + (id % 4) * 3}% / 0.85)`
}

// Región bajo un punto galáctico (recorrido RLE de la fila)
function regionAt(x, z) {
  const px = Math.floor(((x - X0) * 83) / 4096)
  const pz = Math.floor(((z - Z0) * 83) / 4096)
  if (px < 0 || pz < 0 || pz >= GRID || px >= GRID) return null
  let rx = 0
  for (const [len, id] of regionData.regionmap[pz]) {
    if (px < rx + len) return id ? regionData.regions[id] : null
    rx += len
  }
  return null
}

// Raster de regiones + centroides de etiquetas, calculados una sola vez
function buildRaster() {
  const canvas = document.createElement('canvas')
  canvas.width = GRID
  canvas.height = GRID
  const ctx = canvas.getContext('2d')
  const acc = {} // id → { sx, sz, n } para centroides
  for (let pz = 0; pz < GRID; pz++) {
    const row = regionData.regionmap[pz]
    const y = GRID - 1 - pz // +z galáctico = arriba en pantalla
    let rx = 0
    for (const [len, id] of row) {
      if (id) {
        ctx.fillStyle = regionColor(id)
        ctx.fillRect(rx, y, len, 1)
        const a = (acc[id] ??= { sx: 0, sz: 0, n: 0 })
        a.sx += (rx + len / 2) * len
        a.sz += pz * len
        a.n += len
      }
      rx += len
    }
  }
  const labels = Object.entries(acc).map(([id, a]) => ({
    name: regionData.regions[id],
    gx: a.sx / a.n,
    gz: a.sz / a.n
  }))
  return { url: canvas.toDataURL('image/png'), labels }
}

export default function GalaxyMap({ state, t, onPlotTo }) {
  const W = 720
  const H = 640
  const svgRef = useRef(null)
  const raster = useMemo(buildRaster, [])
  // vista en unidades de celda: centro (wx arriba-abajo invertido) y zoom k (px/celda)
  const [view, setView] = useState({ wx: GRID / 2, wy: GRID / 2 - 100, k: 0.31 })
  const [hover, setHover] = useState(null) // { x, z, region }
  const [pick, setPick] = useState(null) // { x, z }
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState(null)
  const [copied, setCopied] = useState(null)
  const drag = useRef(null)

  const project = (x, z) => {
    const { gx, gz } = toCell(x, z)
    return {
      sx: (gx - view.wx) * view.k + W / 2,
      sy: (GRID - 1 - gz - view.wy) * view.k + H / 2
    }
  }
  const unproject = (sx, sy) => {
    const gx = (sx - W / 2) / view.k + view.wx
    const gz = GRID - 1 - ((sy - H / 2) / view.k + view.wy)
    return toGalactic(gx, gz)
  }

  const svgPoint = (e) => {
    const r = svgRef.current.getBoundingClientRect()
    return { sx: ((e.clientX - r.left) / r.width) * W, sy: ((e.clientY - r.top) / r.height) * H }
  }

  const onWheel = (e) => {
    e.preventDefault()
    const { sx, sy } = svgPoint(e)
    const factor = e.deltaY < 0 ? 1.25 : 0.8
    setView((v) => {
      const k = Math.min(20, Math.max(0.15, v.k * factor))
      // zoom hacia el cursor
      const wx = v.wx + (sx - W / 2) * (1 / v.k - 1 / k)
      const wy = v.wy + (sy - H / 2) * (1 / v.k - 1 / k)
      return { wx, wy, k }
    })
  }

  const onMouseDown = (e) => {
    if (e.button !== 0) return // solo botón izquierdo
    drag.current = { ...svgPoint(e), wx: view.wx, wy: view.wy, moved: false }
  }
  const onMouseMove = (e) => {
    const p = svgPoint(e)
    if (drag.current) {
      const dx = p.sx - drag.current.sx
      const dy = p.sy - drag.current.sy
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true
      setView((v) => ({ ...v, wx: drag.current.wx - dx / v.k, wy: drag.current.wy - dy / v.k }))
    } else {
      const { x, z } = unproject(p.sx, p.sy)
      setHover({ x, z, region: regionAt(x, z) })
    }
  }
  const onMouseUp = async (e) => {
    if (e.button !== 0) return
    const wasDrag = drag.current?.moved
    drag.current = null
    if (wasDrag) return
    const p = svgPoint(e)
    const { x, z } = unproject(p.sx, p.sy)
    setPick({ x, z })
    setBusy(true)
    setRes(null)
    const r = await window.artemis.nearestSystems({ x: Math.round(x), y: 0, z: Math.round(z) })
    setRes(r || { ok: false, error: 'demo' })
    setBusy(false)
  }

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  })

  const copy = async (name) => {
    await navigator.clipboard.writeText(name)
    setCopied(name)
    setTimeout(() => setCopied(null), 1500)
  }

  const imgX = (0 - view.wx) * view.k + W / 2
  const imgY = (0 - view.wy) * view.k + H / 2
  const you = state.system?.pos

  return (
    <>
      <div className="panel">
        <h2>
          <IconRadar size={16} /> {t('chTitle')}
          <span className="gmap-hoverinfo">
            {hover?.region ? `${hover.region} · ` : ''}
            {hover ? `${Math.round(hover.x)}, ${Math.round(hover.z)} al` : ''}
          </span>
        </h2>
        <div className="muted" style={{ marginBottom: 8 }}>{t('chHint')}</div>
        <svg
          ref={svgRef}
          className="gmap-svg"
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onContextMenu={(e) => e.preventDefault()}
          onMouseLeave={() => {
            drag.current = null
            setHover(null)
          }}
        >
          <rect x="0" y="0" width={W} height={H} fill="rgba(0,0,0,0.45)" />
          <image
            href={raster.url}
            x={imgX}
            y={imgY}
            width={GRID * view.k}
            height={GRID * view.k}
            preserveAspectRatio="none"
            style={{ imageRendering: view.k > 2 ? 'pixelated' : 'auto' }}
          />
          {/* etiquetas de región, visibles a partir de cierto zoom */}
          {view.k > 0.55 &&
            raster.labels.map((l) => {
              const p = project(l.gx * CELL + X0, l.gz * CELL + Z0)
              if (p.sx < -60 || p.sx > W + 60 || p.sy < 0 || p.sy > H) return null
              return (
                <text key={l.name} className="gmap-region-label" x={p.sx} y={p.sy} textAnchor="middle">
                  {l.name.toUpperCase()}
                </text>
              )
            })}
          {LANDMARKS.map((m) => {
            const p = project(m.x, m.z)
            if (p.sx < 0 || p.sx > W || p.sy < 0 || p.sy > H) return null
            return (
              <g key={m.name}>
                <circle className="gmap-landmark" cx={p.sx} cy={p.sy} r="3" />
                <text className="gmap-landmark-label" x={p.sx + 6} y={p.sy + 3}>
                  {m.name}
                </text>
              </g>
            )
          })}
          {you && (() => {
            const p = project(you[0], you[2])
            return (
              <g>
                <circle className="gmap-you" cx={p.sx} cy={p.sy} r="5" />
                <circle className="gmap-you-pulse" cx={p.sx} cy={p.sy} r="9" />
                <text className="gmap-landmark-label you" x={p.sx + 8} y={p.sy - 6}>
                  {t('chYou')}
                </text>
              </g>
            )
          })()}
          {pick && (() => {
            const p = project(pick.x, pick.z)
            return (
              <g className="gmap-pick">
                <line x1={p.sx - 9} y1={p.sy} x2={p.sx + 9} y2={p.sy} />
                <line x1={p.sx} y1={p.sy - 9} x2={p.sx} y2={p.sy + 9} />
              </g>
            )
          })()}
        </svg>
        <div className="muted map-legend">{t('chLegend')}</div>
      </div>

      {(busy || res) && (
        <div className="panel">
          <h2>
            <IconRoute size={16} /> {t('chNearest')}
            {pick ? ` — ${Math.round(pick.x)}, ${Math.round(pick.z)}` : ''}
          </h2>
          {busy && <div className="muted">{t('chSearching')}</div>}
          {res && !res.ok && <div className="warn">⚠ {res.error}</div>}
          {res?.ok &&
            res.results.map((s) => (
              <div key={s.name} className="genus-row">
                <span className="pending" style={{ fontFamily: 'var(--mono)', fontStyle: 'normal', fontSize: 12.5 }}>
                  {s.name}
                </span>
                <span className="leader" />
                <span className="range">
                  {s.distance != null ? `${s.distance} al` : ''} {s.region ? `· ${s.region}` : ''}
                </span>
                <button className="mini" onClick={() => copy(s.name)}>
                  {copied === s.name ? '✓' : t('tgCopy')}
                </button>
                <button className="mini" onClick={() => onPlotTo?.(s.name)}>
                  {t('chPlot')}
                </button>
              </div>
            ))}
          {res?.ok && res.results.length === 0 && <div className="muted">{t('tgEmpty')}</div>}
        </div>
      )}
    </>
  )
}

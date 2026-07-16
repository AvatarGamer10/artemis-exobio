import React, { useState } from 'react'
import { IconRadar, IconSync, IconFolder, IconX, IconExternal, IconCheck } from '../Icons.jsx'

function ShipPanel({ state, t }) {
  const [copied, setCopied] = useState(false)
  const ship = state.ship

  const copySlef = async () => {
    const slef = await window.artemis.getSlef()
    if (!slef) return
    await navigator.clipboard.writeText(slef)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="panel">
      <h2>
        <IconRadar size={16} /> {t('rtShip')}
      </h2>
      {!ship ? (
        <div className="muted">{t('rtNoShip')}</div>
      ) : (
        <>
          <div className="kv" style={{ marginBottom: 12 }}>
            <span className="k">{t('rtShipType')}</span>
            <span className="v hi">{ship.type}</span>
            <span className="k">{t('rtShipName')}</span>
            <span className="v">
              {ship.name || '—'} {ship.ident ? `[${ship.ident}]` : ''}
            </span>
            <span className="k">{t('rtJumpRange')}</span>
            <span className="v hi">{ship.maxJumpRange != null ? `${ship.maxJumpRange} al` : '—'}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="hud" onClick={copySlef}>
              {copied ? t('tgCopied') : t('rtCopySlef')}
            </button>
            <a href="https://www.spansh.co.uk/plotter" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <button className="hud ghost">
                <IconExternal size={15} /> {t('rtOpenPlotter')}
              </button>
            </a>
          </div>
          <div className="muted" style={{ marginTop: 10 }}>{t('rtSlefHint')}</div>
        </>
      )}
    </div>
  )
}

function Plotter({ state, t }) {
  const [to, setTo] = useState('')
  const [range, setRange] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const shipRange = state.ship?.maxJumpRange

  const plot = async () => {
    if (!to.trim()) return
    setBusy(true)
    setError(null)
    const res = await window.artemis.plotRoute({
      to: to.trim(),
      range: range ? Number(range) : undefined
    })
    if (!res?.ok) {
      setError(
        res?.error === 'no-range'
          ? t('rtNeedRange')
          : res?.error === 'no-system'
            ? t('rtNeedSystem')
            : res?.error || 'error'
      )
    }
    setBusy(false)
  }

  return (
    <div className="panel">
      <h2>
        <IconSync size={16} /> {t('rtPlot')}
      </h2>
      <div className="muted" style={{ marginBottom: 10 }}>
        {t('rtFrom', state.system.name || '—')}
      </div>
      <label className="hud">{t('rtDest')}</label>
      <input
        className="hud"
        value={to}
        placeholder={t('rtDestPh')}
        onChange={(e) => setTo(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !busy && plot()}
      />
      <label className="hud">{t('rtRange')}</label>
      <input
        className="hud"
        style={{ width: 180 }}
        value={range}
        placeholder={shipRange != null ? `${shipRange} (${t('rtShipAuto')})` : '—'}
        onChange={(e) => setRange(e.target.value.replace(',', '.'))}
      />
      <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="hud" onClick={plot} disabled={busy || !to.trim()}>
          <IconSync size={16} /> {busy ? t('rtPlotting') : t('rtPlotBtn')}
        </button>
        <button className="hud ghost" onClick={() => window.artemis.importRoute()}>
          <IconFolder size={16} /> {t('rtImport')}
        </button>
      </div>
      {error && <div className="warn" style={{ marginTop: 10 }}>⚠ {error}</div>}
      <div className="muted" style={{ marginTop: 10 }}>{t('rtImportHint')}</div>
    </div>
  )
}

function ActiveRoute({ state, t }) {
  const [copied, setCopied] = useState(null)
  const route = state.route
  if (!route?.systems?.length) return null
  const next = route.systems[route.index + 1]
  const remaining = route.systems.length - 1 - route.index

  const copy = async (name) => {
    await navigator.clipboard.writeText(name)
    setCopied(name)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="panel">
      <h2>
        <IconRadar size={16} /> {t('rtActive')} — {route.dest?.toUpperCase()}
      </h2>
      <div className="grid3" style={{ marginBottom: 12 }}>
        <div className="stat">
          <div className="n">{route.index + 1}/{route.systems.length}</div>
          <div className="l">{t('rtProgress')}</div>
        </div>
        <div className="stat">
          <div className="n">{remaining}</div>
          <div className="l">{t('rtRemaining')}</div>
        </div>
        <div className="stat">
          <div className="n">{route.systems.filter((s) => s.neutron).length}</div>
          <div className="l">{t('rtNeutrons')}</div>
        </div>
      </div>
      {next && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <button className="hud" onClick={() => copy(next.system)}>
            {copied === next.system ? t('tgCopied') : t('rtCopyNext', next.system)}
          </button>
          <button className="hud danger ghost" onClick={() => window.artemis.clearRoute()}>
            <IconX size={15} /> {t('rtClear')}
          </button>
        </div>
      )}
      {!next && <div className="v good" style={{ marginBottom: 10 }}>{t('rtArrived')}</div>}
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>{t('tgSystem')}</th>
              <th className="num">{t('rtDistCol')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {route.systems.map((s, i) => (
              <tr key={i} style={i === route.index + 1 ? { color: 'var(--hi)' } : undefined}>
                <td style={{ width: 26 }}>
                  {i <= route.index ? (
                    <span style={{ color: 'var(--good)' }}><IconCheck size={13} /></span>
                  ) : i === route.index + 1 ? (
                    '►'
                  ) : (
                    ''
                  )}
                </td>
                <td>
                  {s.system} {s.neutron ? '⚡' : ''}
                </td>
                <td className="num">{s.dist != null ? s.dist : '—'}</td>
                <td className="num" style={{ width: 90 }}>
                  {i > route.index && (
                    <button className="mini" onClick={() => copy(s.system)}>
                      {copied === s.system ? '✓' : t('tgCopy')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function RoutePanel({ state, t }) {
  return (
    <>
      <ActiveRoute state={state} t={t} />
      <Plotter state={state} t={t} />
      <ShipPanel state={state} t={t} />
    </>
  )
}

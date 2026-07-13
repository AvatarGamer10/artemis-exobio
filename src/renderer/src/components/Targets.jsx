import React, { useState } from 'react'
import { cr } from '../useArtemis.js'
import { IconRadar, IconSync } from '../Icons.jsx'

// Especies "premio gordo" para el desplegable (valor base en Vista Genomics)
const JACKPOTS = [
  ['Fonticulua Fluctus', 20000000],
  ['Stratum Tectonicas', 19010800],
  ['Concha Biconcavis', 19010800],
  ['Fonticulua Segmentatus', 19010800],
  ['Tussock Stigmasis', 19010800],
  ['Clypeus Speculumi', 16202800],
  ['Cactoida Vermis', 16202800],
  ['Fumerola Extremus', 16202800],
  ['Recepta Deltahedronix', 16202800],
  ['Stratum Cucumisis', 16202800],
  ['Recepta Conditivus', 14313700],
  ['Tussock Virgam', 14313700],
  ['Aleoida Gravis', 12934900],
  ['Osseus Discus', 12934900],
  ['Recepta Umbrux', 12934900],
  ['Clypeus Margaritus', 11873200],
  ['Tubus Cavas', 11873200],
  ['Frutexa Flammasis', 10326000],
  ['Osseus Pellebantus', 9739000]
]

export default function Targets({ state, t }) {
  const [species, setSpecies] = useState(JACKPOTS[1][0]) // Tectonicas por defecto
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState(null)
  const [copied, setCopied] = useState(null)

  const search = async () => {
    setBusy(true)
    setRes(null)
    const r = await window.artemis.searchTargets(species)
    setRes(r || { ok: false, error: 'demo' })
    setBusy(false)
  }

  const copy = async (system) => {
    try {
      await navigator.clipboard.writeText(system)
      setCopied(system)
      setTimeout(() => setCopied(null), 1600)
    } catch {
      /* portapapeles no disponible */
    }
  }

  return (
    <>
      <div className="panel">
        <h2>
          <IconRadar size={16} /> {t('tgTitle')}
        </h2>
        <div className="muted" style={{ marginBottom: 12 }}>{t('tgIntro')}</div>
        <label className="hud">{t('tgSpecies')}</label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="hud" value={species} onChange={(e) => setSpecies(e.target.value)}>
            {JACKPOTS.map(([name, value]) => (
              <option key={name} value={name}>
                {name} — {new Intl.NumberFormat('es-ES').format(value)} cr
              </option>
            ))}
          </select>
          <button className="hud" onClick={search} disabled={busy}>
            <IconSync size={17} /> {busy ? t('tgSearching') : t('tgSearch')}
          </button>
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          {t('tgFrom', state.system.name || 'Sol')}
        </div>
      </div>

      {res && (
        <div className="panel">
          <h2>
            <IconRadar size={16} /> {species.toUpperCase()}
            {res.ok && res.total != null ? ` — ${t('tgTotal', res.total)}` : ''}
          </h2>
          {!res.ok && <div className="warn">⚠ {res.error}</div>}
          {res.ok && res.results.length === 0 && <div className="empty">{t('tgEmpty')}</div>}
          {res.ok && res.results.length > 0 && (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>{t('tgSystem')}</th>
                      <th>{t('tgBody')}</th>
                      <th className="num">{t('tgDist')}</th>
                      <th className="num">{t('tgArrival')}</th>
                      <th className="num">{t('tgGrav')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {res.results.map((r, i) => (
                      <tr key={i}>
                        <td>{r.system}</td>
                        <td>{r.body}</td>
                        <td className="num">{r.distanceLy}</td>
                        <td className="num">{r.distLs?.toLocaleString?.() ?? r.distLs}</td>
                        <td className="num">{r.gravity != null ? r.gravity + ' g' : '—'}</td>
                        <td className="num">
                          <button className="mini" onClick={() => copy(r.system)}>
                            {copied === r.system ? t('tgCopied') : t('tgCopy')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="muted" style={{ marginTop: 8 }}>
                {t('tgHint')} · {cr(JACKPOTS.find(([n]) => n === species)?.[1])}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

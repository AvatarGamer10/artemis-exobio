import React, { useState } from 'react'
import { cr } from '../useArtemis.js'
import { IconUser, IconSync, IconExternal } from '../Icons.jsx'

const RANK_MAX = 8

export default function CmdrPanel({ state, t, lang }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const p = state.inara
  const locale = lang === 'en' ? 'en-GB' : 'es-ES'

  const refresh = async () => {
    setBusy(true)
    setError(null)
    const res = await window.artemis.inaraRefresh()
    if (!res.ok) setError(res.error)
    setBusy(false)
  }

  return (
    <>
      <div className="panel">
        <h2>
          <IconUser size={16} /> {t('cmdrTitle')}
        </h2>
        <div className="kv">
          <span className="k">{t('cmdrName')}</span>
          <span className="v hi">{state.commander.name || '—'}</span>
          <span className="k">{t('cmdrCredits')}</span>
          <span className="v">{cr(state.commander.credits)}</span>
        </div>
      </div>
      <div className="panel">
        <h2>
          <IconSync size={16} /> {t('inaraTitle')}
        </h2>
        {!state.settings.hasInaraKey && <div className="muted">{t('inaraNeedKey')}</div>}
        {state.settings.hasInaraKey && !p && <div className="muted">{t('inaraPressSync')}</div>}
        {p && (
          <>
            <div className="kv" style={{ marginBottom: 14 }}>
              <span className="k">CMDR</span>
              <span className="v hi">{p.name}</span>
              <span className="k">{t('inaraAllegiance')}</span>
              <span className="v">{p.allegiance || '—'}</span>
              <span className="k">{t('inaraSquadron')}</span>
              <span className="v">{p.squadron || '—'}</span>
              <span className="k">{t('inaraUpdated')}</span>
              <span className="v">{new Date(p.fetchedAt).toLocaleTimeString(locale)}</span>
            </div>
            {p.ranks.map((r) => (
              <div key={r.name} className="rank-row">
                <div className="rn">
                  <span style={{ textTransform: 'capitalize' }}>{r.name}</span>
                  <b>
                    {r.value}/{RANK_MAX} · {Math.round((r.progress || 0) * 100)}%
                  </b>
                </div>
                <div className="bar-wrap">
                  <div
                    className={r.name === 'exobiologist' ? 'bar ok' : 'bar'}
                    style={{ width: Math.round((r.progress || 0) * 100) + '%' }}
                  />
                </div>
              </div>
            ))}
            {p.inaraUrl && (
              <a
                href={p.inaraUrl}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--cyan)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <IconExternal size={14} /> {t('inaraView')}
              </a>
            )}
          </>
        )}
        {error && <div className="warn" style={{ marginTop: 10 }}>⚠ {error}</div>}
        <div style={{ marginTop: 14 }}>
          <button className="hud" onClick={refresh} disabled={busy}>
            <IconSync size={17} /> {busy ? t('inaraSyncing') : t('inaraSync')}
          </button>
        </div>
      </div>
    </>
  )
}

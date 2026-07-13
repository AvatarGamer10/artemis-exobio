import React from 'react'
import { useArtemis, cr } from './useArtemis.js'
import { useT } from './i18n.js'
import { useTheme } from './theme.js'

export default function Overlay() {
  const state = useArtemis()
  const t = useT(state?.settings?.lang || 'es')
  useTheme(state?.settings?.theme)
  if (!state) return null

  const bodies = Object.values(state.bioBodies).filter(
    (b) => b.bioCount > 0 || b.genuses.length > 0
  )
  const current =
    bodies.find((b) => b.name === state.currentBodyName) ||
    bodies.find((b) => b.name === state.status.bodyName)
  const s = state.sampling
  const pct = s?.colonyRange ? Math.min(100, (s.currentDist / s.colonyRange) * 100) : 0

  return (
    <div className="ov">
      <div className="ov-header">
        <span className={`dot ${state.commander.name ? '' : 'off'}`} />
        ARTEMIS
        <span style={{ marginLeft: 'auto', color: 'var(--text-dim)', letterSpacing: 0 }}>
          {state.system.name || ''}
        </span>
      </div>
      <div className="ov-body">
        {s && (
          <div className="ov-section">
            <h3>
              {t('ovSampling')} — {s.genusLocalised?.toUpperCase()}
            </h3>
            <div className="ov-big">{s.species}</div>
            <div className="steps">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`step ${s.step >= i ? 'done' : ''}`} />
              ))}
            </div>
            {s.colonyRange != null && (
              <>
                <div className={`ov-dist ${s.clear ? 'ok' : 'no'}`}>
                  {s.currentDist ?? 0} / {s.colonyRange} m
                </div>
                <div className="bar-wrap">
                  <div className={`bar ${s.clear ? 'ok' : ''}`} style={{ width: pct + '%' }} />
                </div>
              </>
            )}
          </div>
        )}

        <div className="ov-section">
          <h3>{current ? current.name?.toUpperCase() : t('ovNoBioBody')}</h3>
          {current ? (
            current.genuses.length ? (
              current.genuses.map((g) => (
                <div key={g.genus} className={`genus-row ${g.completed ? 'done' : ''}`}>
                  <span className="check">{g.completed ? '✓' : ''}</span>
                  <span className={g.completed ? '' : 'pending'}>{g.localised}</span>
                  {g.colonyRange && <span className="range">{g.colonyRange} m</span>}
                </div>
              ))
            ) : (
              <div className="muted">{t('ovMapDss', current.bioCount)}</div>
            )
          ) : (
            <div className="muted">
              {bodies.length ? t('ovBodiesWithBio', bodies.length) : t('ovNoBio')}
            </div>
          )}
        </div>

        {bodies.length > 0 && !current && (
          <div className="ov-section">
            <h3>{t('ovBioBodies')}</h3>
            {bodies.map((b) => (
              <div key={b.id} className="genus-row">
                <span className="pending">{b.name}</span>
                <span className="range">
                  {b.bioCount} {t('ovSignals')}
                  {b.predictions?.[0]
                    ? ` · ≤${Math.round(b.predictions[0].value / 1e6)}M`
                    : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {state.status.lowFuel && <div className="warn">{t('sysLowFuel')}</div>}
      </div>
      <div className="ov-footer">
        <span className="muted">{t('ovSamples', state.vault.length)}</span>
        <span className="total">{cr(state.vaultTotal)}</span>
      </div>
    </div>
  )
}

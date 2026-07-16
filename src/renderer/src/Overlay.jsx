import React from 'react'
import { useArtemis, cr } from './useArtemis.js'
import { useT } from './i18n.js'
import { useTheme } from './theme.js'
import SamplerDial from './components/SamplerDial.jsx'

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
            <div className="ov-big" style={{ textAlign: 'center' }}>{s.species}</div>
            <div className="ov-dial">
              <SamplerDial
                step={s.step}
                dist={s.currentDist}
                range={s.colonyRange}
                clear={s.clear}
                size={150}
              />
            </div>
          </div>
        )}

        <div className="ov-section">
          <h3>{current ? current.name?.toUpperCase() : t('ovNoBioBody')}</h3>
          {current ? (
            current.genuses.length ? (
              current.genuses.map((g) => (
                <div key={g.genus} className={`genus-row ${g.completed ? 'done' : ''}`}>
                  <span className="check">{g.completed ? '✓' : ''}</span>
                  <span className="pending">{g.localised}</span>
                  <span className="leader" />
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
                <span className="pending" style={{ fontFamily: 'var(--mono)', fontStyle: 'normal', fontSize: 12 }}>
                  {b.name}
                </span>
                <span className="leader" />
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

        {state.route?.systems?.length > 0 && state.route.index + 1 < state.route.systems.length && (
          <div className="ov-section">
            <h3>
              {t('ovRoute')} · {state.route.systems.length - 1 - state.route.index} ↷
            </h3>
            <div className="genus-row">
              <span className="pending" style={{ fontFamily: 'var(--mono)', fontStyle: 'normal', fontSize: 12 }}>
                {t('ovNext')}
              </span>
              <span className="leader" />
              <span className="range">
                {state.route.systems[state.route.index + 1].system}
                {state.route.systems[state.route.index + 1].neutron ? ' ⚡' : ''}
              </span>
            </div>
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

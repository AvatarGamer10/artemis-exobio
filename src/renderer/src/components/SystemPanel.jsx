import React from 'react'
import { cr } from '../useArtemis.js'
import SystemMap from './SystemMap.jsx'
import { IconPlanet, IconLeaf, IconWalk, IconRadar, IconCheck, IconSync } from '../Icons.jsx'

function ExternalContext({ ext, t }) {
  if (!ext || !ext.system) return null
  const canonnBodies = ext.canonn?.ok
    ? [...new Set((ext.canonn.bioSignals || []).map((s) => s.body))]
    : []
  return (
    <div className="panel">
      <h2>
        <IconSync size={16} /> {t('extTitle')} — {ext.system.toUpperCase()}
      </h2>
      {ext.loading ? (
        <div className="muted">{t('extLoading')}</div>
      ) : (
        <>
          <div style={{ marginBottom: 8 }}>
            {!ext.edsm?.ok ? (
              <span className="muted">{t('extError')}</span>
            ) : ext.edsm.known ? (
              <span className="muted">{t('extKnown', ext.edsm.bodyCount)}</span>
            ) : (
              <span className="v good">{t('extVirgin')}</span>
            )}
          </div>
          {!ext.canonn?.ok ? (
            <div className="muted">{t('extCanonnError')}</div>
          ) : (ext.canonn.bioSignals || []).length === 0 ? (
            <div className="muted">{t('extCanonnNone')}</div>
          ) : (
            <>
              <div className="pred-head" style={{ marginTop: 4 }}>{t('extCanonnBio')}</div>
              {canonnBodies.map((body) => {
                const sigs = ext.canonn.bioSignals.filter((s) => s.body === body)
                const species = ext.canonn.bioCodex
                  .filter((c) => c.body === body)
                  .map((c) => c.name)
                return (
                  <div key={body} className="genus-row">
                    <span className="pending">{body}</span>
                    <span className="range">
                      {sigs.reduce((n, s) => n + (s.count || 0), 0) || sigs.length} bio
                      {species.length ? ` · ${[...new Set(species)].join(', ')}` : ''}
                    </span>
                  </div>
                )
              })}
            </>
          )}
        </>
      )}
    </div>
  )
}

function Sampling({ s, t }) {
  if (!s) return null
  const pct = s.colonyRange ? Math.min(100, (s.currentDist / s.colonyRange) * 100) : 0
  return (
    <div className="panel">
      <h2>
        <IconWalk size={16} /> {t('samplingTitle')} — {s.species?.toUpperCase()}
      </h2>
      <div className="kv">
        <span className="k">{t('variant')}</span>
        <span className="v">{s.variant || '—'}</span>
        <span className="k">{t('valueOnDone')}</span>
        <span className="v hi">{cr(s.value)}</span>
      </div>
      <div className="steps">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`step ${s.step >= i ? 'done' : ''}`} />
        ))}
      </div>
      {s.colonyRange != null && (
        <>
          <div className="muted">
            {t('colonyDist')}: {s.currentDist ?? 0} m / {s.colonyRange} m
          </div>
          <div className="bar-wrap">
            <div className={`bar ${s.clear ? 'ok' : ''}`} style={{ width: pct + '%' }} />
          </div>
          <div className={s.clear ? 'v good' : 'muted'}>
            {s.clear ? t('colonyClear') : t('colonyMove')}
          </div>
        </>
      )}
    </div>
  )
}

function Predictions({ b, t }) {
  let preds = b.predictions || []
  const filtered = b.genuses.length > 0
  if (filtered) {
    preds = preds.filter((p) =>
      b.genuses.some(
        (g) => g.predGenus === p.genus || (g.localised || '').startsWith(p.genus)
      )
    )
  }
  if (preds.length === 0) return null
  return (
    <div className="pred-block">
      <div className="pred-head">
        {t('predTitle')}
        {filtered ? ` · ${t('predFiltered')}` : ''}
      </div>
      {preds.slice(0, 12).map((p) => (
        <div key={p.species} className={`pred-row ${p.value >= 15000000 ? 'jackpot' : ''}`}>
          <span className="pred-name">
            {p.value >= 15000000 ? '★ ' : ''}
            {p.species}
          </span>
          <span className="pred-val">{cr(p.value)}</span>
        </div>
      ))}
      <div className="muted" style={{ marginTop: 6 }}>
        {t('predNote')}
      </div>
    </div>
  )
}

function BioBody({ b, isCurrent, t }) {
  return (
    <div className="panel">
      <h2>
        <IconLeaf size={16} />
        {b.name?.toUpperCase()} {isCurrent ? t('here') : ''} — {t('bioSignals', b.bioCount)}
      </h2>
      {b.scanInfo && (
        <div className="muted" style={{ marginBottom: 8 }}>
          {b.scanInfo.planetClass} · {b.scanInfo.atmosphere || '—'} · {b.scanInfo.gravity} g ·{' '}
          {b.scanInfo.tempK} K · {b.scanInfo.volcanism || t('noVolcanism')}
        </div>
      )}
      {b.genuses.length === 0 && <div className="muted">{t('noGenuses')}</div>}
      {b.genuses.map((g) => (
        <div key={g.genus} className={`genus-row ${g.completed ? 'done' : ''}`}>
          <span className="check">{g.completed ? <IconCheck size={15} /> : null}</span>
          <span className={g.completed ? '' : 'pending'}>{g.localised}</span>
          {g.colonyRange && <span className="range">⌀ {g.colonyRange} m</span>}
        </div>
      ))}
      <Predictions b={b} t={t} />
    </div>
  )
}

export default function SystemPanel({ state, t }) {
  const bodies = Object.values(state.bioBodies).filter(
    (b) => b.bioCount > 0 || b.genuses.length > 0
  )
  return (
    <>
      <div className="panel">
        <h2>
          <IconPlanet size={16} /> {t('sysTitle')}
        </h2>
        <div className="kv">
          <span className="k">{t('sysName')}</span>
          <span className="v hi">{state.system.name || '—'}</span>
          <span className="k">{t('sysBodies')}</span>
          <span className="v">
            {state.system.bodyCount != null
              ? t('sysScanned', state.system.scanned, state.system.bodyCount) +
                (state.system.allBodiesFound ? t('sysComplete') : '')
              : t('sysNoScan')}
          </span>
          <span className="k">{t('sysBioBodies')}</span>
          <span className={`v ${bodies.length ? 'good' : ''}`}>{bodies.length}</span>
          {state.status.lowFuel && (
            <>
              <span className="k">{t('sysFuel')}</span>
              <span className="v bad">{t('sysLowFuel')}</span>
            </>
          )}
        </div>
      </div>
      <ExternalContext ext={state.external} t={t} />
      <SystemMap state={state} t={t} />
      <Sampling s={state.sampling} t={t} />
      {bodies.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <IconRadar size={40} />
            <div>
              {t('sysEmpty1')}
              <br />
              {t('sysEmpty2')}
            </div>
          </div>
        </div>
      ) : (
        bodies.map((b) => (
          <BioBody key={b.id} b={b} isCurrent={b.name === state.currentBodyName} t={t} />
        ))
      )}
    </>
  )
}

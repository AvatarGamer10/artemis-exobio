import React from 'react'
import { cr } from '../useArtemis.js'
import SamplerDial from './SamplerDial.jsx'
import SurfaceMap from './SurfaceMap.jsx'
import {
  IconPlanet,
  IconWalk,
  IconRoute,
  IconWallet,
  IconLeaf,
  IconChart,
  IconRadar
} from '../Icons.jsx'

// Pantalla de inicio: lo que importa ahora mismo, sin navegar.
// Cada tarjeta lleva a su sección completa con un clic.
function Card({ icon: Icon, title, onOpen, wide, children }) {
  return (
    <button
      className={`dash-card ${wide ? 'dash-wide' : ''}`}
      onClick={onOpen}
      type="button"
    >
      <div className="dash-head">
        <Icon size={15} />
        <span>{title}</span>
        <span className="dash-go">→</span>
      </div>
      <div className="dash-body">{children}</div>
    </button>
  )
}

export default function Dashboard({ state, t, go }) {
  const s = state.sampling
  const bodies = Object.values(state.bioBodies).filter(
    (b) => b.bioCount > 0 || b.genuses.length > 0
  )
  const route = state.route
  const next = route?.systems?.[route.index + 1]
  const session = state.session
  const hours = Math.max(0.05, (Date.now() - new Date(session.startedAt).getTime()) / 3600000)
  const perHour = session.valueSampled ? session.valueSampled / hours : 0
  const uniqueSpecies = new Set((state.library || []).map((l) => l.species)).size

  return (
    <div className="dash-grid">
      {s && (
        <Card icon={IconWalk} title={t('dashSampling')} onOpen={() => go('sistema')} wide>
          <div className="dash-sampling">
            <SamplerDial
              step={s.step}
              dist={s.currentDist}
              range={s.colonyRange}
              clear={s.clear}
              size={104}
            />
            <div className="dash-sampling-info">
              <div className="dash-species">{s.species}</div>
              {s.isNewVariant && <span className="new-badge">✦ {t('ovNewVariant')}</span>}
              <div className={s.clear ? 'text-green-400 text-xs mt-2' : 'muted text-xs mt-2'}>
                {s.colonyRange != null && (s.clear ? t('colonyClear') : t('colonyMove'))}
              </div>
              <div className="dash-value">{cr(s.value)}</div>
            </div>
            <SurfaceMap state={state} size={104} />
          </div>
        </Card>
      )}

      <Card icon={IconPlanet} title={t('dashSystem')} onOpen={() => go('sistema')}>
        <div className="dash-big">{state.system.name || '—'}</div>
        <div className="dash-sub">
          {bodies.length > 0
            ? t('dashBioBodies', bodies.length)
            : state.system.bodyCount != null
              ? t('dashNoBio')
              : t('sysNoScan')}
        </div>
        {state.external?.edsm?.ok && !state.external.edsm.known && (
          <div className="dash-flag">{t('extVirgin')}</div>
        )}
      </Card>

      <Card icon={IconWallet} title={t('dashVault')} onOpen={() => go('cartera')}>
        <div className="dash-big">{cr(state.vaultTotal)}</div>
        <div className="dash-sub">{t('dashUnsold', state.vault.length)}</div>
      </Card>

      {route?.systems?.length > 0 && (
        <Card icon={IconRoute} title={t('dashRoute')} onOpen={() => go('ruta')}>
          <div className="dash-big dash-mono">{next ? next.system : route.dest}</div>
          <div className="dash-sub">
            {next
              ? t('dashJumpsLeft', route.systems.length - 1 - route.index)
              : t('rtArrived')}
          </div>
        </Card>
      )}

      <Card icon={IconChart} title={t('dashSession')} onOpen={() => go('sesion')}>
        <div className="dash-row">
          <div>
            <div className="dash-big">{session.samplesCompleted}</div>
            <div className="dash-sub">{t('sessSpecies')}</div>
          </div>
          <div>
            <div className="dash-big">{perHour ? Math.round(perHour / 1e5) / 10 + 'M' : '—'}</div>
            <div className="dash-sub">{t('sessPerHour')}</div>
          </div>
        </div>
      </Card>

      <Card icon={IconLeaf} title={t('dashCollection')} onOpen={() => go('coleccion')}>
        <div className="dash-big">{uniqueSpecies}</div>
        <div className="dash-sub">{t('libUnique')}</div>
      </Card>

      {bodies.length > 0 && (
        <Card icon={IconRadar} title={t('dashTargets')} onOpen={() => go('sistema')} wide>
          <div className="dash-bodies">
            {bodies.slice(0, 4).map((b) => (
              <div key={b.id} className="dash-body-row">
                <span className="dash-mono">{b.name}</span>
                <span className="dash-body-meta">
                  {b.bioCount} bio
                  {b.predictions?.[0] ? ` · ≤${Math.round(b.predictions[0].value / 1e6)}M` : ''}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

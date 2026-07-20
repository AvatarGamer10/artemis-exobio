import React, { useEffect, useState } from 'react'
import { useArtemis } from './useArtemis.js'
import { useT } from './i18n.js'
import { useTheme } from './theme.js'
import { useSounds } from './useSounds.js'
import Dashboard from './components/Dashboard.jsx'
import SystemPanel from './components/SystemPanel.jsx'
import Targets from './components/Targets.jsx'
import GalaxyMap from './components/GalaxyMap.jsx'
import RoutePanel from './components/RoutePanel.jsx'
import VaultPanel from './components/VaultPanel.jsx'
import Collection from './components/Collection.jsx'
import Library from './components/Library.jsx'
import Stats from './components/Stats.jsx'
import SessionPanel from './components/SessionPanel.jsx'
import CmdrPanel from './components/CmdrPanel.jsx'
import SettingsPanel from './components/SettingsPanel.jsx'
import Onboarding from './components/Onboarding.jsx'
import UpdateModal from './components/UpdateModal.jsx'
import Splash from './components/Splash.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import LiveFeed from './components/LiveFeed.jsx'
import {
  IconPlanet,
  IconRadar,
  IconRoute,
  IconGalaxy,
  IconWallet,
  IconChart,
  IconGraph,
  IconUser,
  IconSettings,
  IconLeaf,
  IconMinus,
  IconX,
  IconEye
} from './Icons.jsx'

// El rail agrupa las secciones por momento de uso en vez de listarlas
// todas planas: en vuelo / planificar / registro / progreso.
const GROUPS = [
  [['inicio', 'navHome', IconEye]],
  [
    ['sistema', 'navSystem', IconPlanet],
    ['carta', 'navChart', IconGalaxy],
    ['ruta', 'navRoute', IconRoute]
  ],
  [['objetivos', 'navTargets', IconRadar]],
  [
    ['cartera', 'navVault', IconWallet],
    ['coleccion', 'navDex', IconLeaf],
    ['biblioteca', 'navLibrary', IconChart]
  ],
  [
    ['estadisticas', 'navStats', IconGraph],
    ['sesion', 'navSession', IconChart],
    ['cmdr', 'navCmdr', IconUser]
  ]
]
const ALL = GROUPS.flat()
// La bitácora acompaña a las vistas de vuelo, no a las de gestión
const FEED_TABS = new Set(['inicio', 'sistema', 'ruta'])

export default function App() {
  const state = useArtemis()
  const [tab, setTab] = useState('inicio')
  const [routeDest, setRouteDest] = useState(null)
  const [cmdk, setCmdk] = useState(false)
  const [booting, setBooting] = useState(!window.location.search.includes('nosplash'))
  const lang = state?.settings?.lang || 'es'
  const t = useT(lang)
  useTheme(state?.settings?.theme)
  useSounds(state)

  // Ctrl+K abre la paleta desde cualquier sección
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCmdk((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!state) return null

  const connected = !!state.commander.name && !state.watcherError
  const go = (id) => setTab(id)
  const current = ALL.find(([id]) => id === tab)

  const sections = [...ALL, ['ajustes', 'navSettings', IconSettings]].map(([id, key, icon]) => ({
    id,
    label: t(key),
    icon,
    run: () => go(id)
  }))
  const actions = [
    { id: 'overlay', label: t('setToggleOverlay'), icon: IconEye, run: () => window.artemis.toggleOverlay() },
    { id: 'ghost', label: t('setGhostBtn', state.overlay.clickThrough), icon: IconEye, run: () => window.artemis.toggleClickThrough() },
    { id: 'tour', label: t('setReplayTour'), icon: IconLeaf, run: () => window.artemis.setSettings({ onboarded: false }) }
  ]

  return (
    <div className="app">
      {booting && <Splash lang={lang} onDone={() => setBooting(false)} />}
      {!state.settings.onboarded && <Onboarding lang={lang} />}
      {state.settings.onboarded && <UpdateModal update={state.update} t={t} />}
      <CommandPalette
        open={cmdk}
        onClose={() => setCmdk(false)}
        sections={sections}
        actions={actions}
        t={t}
      />

      <div className="topbar">
        <div className="topbar-brand">
          <div className="logo">
            <IconLeaf size={17} />
          </div>
          <h1>ARTEMIS</h1>
        </div>

        <div className="topbar-crumb">
          <span className="crumb-sep">/</span>
          {t(current ? current[1] : 'navSettings')}
        </div>

        <span className="spacer" />

        <button className="cmdk-trigger" onClick={() => setCmdk(true)} type="button">
          <span>{t('cmdkOpenHint')}</span>
          <kbd>Ctrl K</kbd>
        </button>

        {state.watcherError && <span className="chip warn">⚠ {state.watcherError}</span>}
        <span className="chip">
          <span className={`dot ${connected ? '' : 'off'}`} />
          {state.commander.name ? `CMDR ${state.commander.name}` : t('waitingJournal')}
        </span>
        {state.system.name && <span className="chip">{state.system.name}</span>}

        <div className="winbtns">
          <button title={t('minimize')} onClick={() => window.artemis.minimize()}>
            <IconMinus size={15} />
          </button>
          <button className="close" title={t('close')} onClick={() => window.artemis.close()}>
            <IconX size={15} />
          </button>
        </div>
      </div>

      <div className="main">
        <nav className="rail">
          {GROUPS.map((group, gi) => (
            <div className="rail-group" key={gi}>
              {group.map(([id, key, Icon]) => (
                <button
                  key={id}
                  className={tab === id ? 'active' : ''}
                  onClick={() => go(id)}
                  title={t(key)}
                >
                  <Icon size={19} />
                  <span className="rail-tip">{t(key)}</span>
                </button>
              ))}
            </div>
          ))}
          <div className="push" />
          <div className="rail-group">
            <button
              className={tab === 'ajustes' ? 'active' : ''}
              onClick={() => go('ajustes')}
              title={t('navSettings')}
            >
              <IconSettings size={19} />
              <span className="rail-tip">{t('navSettings')}</span>
            </button>
          </div>
        </nav>

        <div className="content" key={tab}>
          {tab === 'inicio' && <Dashboard state={state} t={t} go={go} />}
          {tab === 'sistema' && <SystemPanel state={state} t={t} />}
          {tab === 'objetivos' && <Targets state={state} t={t} />}
          {tab === 'carta' && (
            <GalaxyMap
              state={state}
              t={t}
              onPlotTo={(dest) => {
                setRouteDest(dest)
                setTab('ruta')
              }}
            />
          )}
          {tab === 'ruta' && <RoutePanel state={state} t={t} prefillDest={routeDest} />}
          {tab === 'cartera' && <VaultPanel state={state} t={t} />}
          {tab === 'coleccion' && <Collection state={state} t={t} lang={lang} />}
          {tab === 'biblioteca' && <Library state={state} t={t} lang={lang} />}
          {tab === 'estadisticas' && <Stats state={state} t={t} lang={lang} />}
          {tab === 'sesion' && <SessionPanel state={state} t={t} lang={lang} />}
          {tab === 'cmdr' && <CmdrPanel state={state} t={t} lang={lang} />}
          {tab === 'ajustes' && <SettingsPanel state={state} t={t} />}
        </div>

        {FEED_TABS.has(tab) && <LiveFeed state={state} t={t} lang={lang} />}
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { useArtemis } from './useArtemis.js'
import { useT } from './i18n.js'
import { useTheme } from './theme.js'
import { useSounds } from './useSounds.js'
import SystemPanel from './components/SystemPanel.jsx'
import Targets from './components/Targets.jsx'
import RoutePanel from './components/RoutePanel.jsx'
import Stats from './components/Stats.jsx'
import GalaxyMap from './components/GalaxyMap.jsx'
import Splash from './components/Splash.jsx'
import VaultPanel from './components/VaultPanel.jsx'
import Library from './components/Library.jsx'
import Collection from './components/Collection.jsx'
import SessionPanel from './components/SessionPanel.jsx'
import CmdrPanel from './components/CmdrPanel.jsx'
import SettingsPanel from './components/SettingsPanel.jsx'
import Onboarding from './components/Onboarding.jsx'
import UpdateModal from './components/UpdateModal.jsx'
import {
  IconPlanet,
  IconRadar,
  IconRoute,
  IconWallet,
  IconChart,
  IconGalaxy,
  IconGraph,
  IconUser,
  IconSettings,
  IconLeaf,
  IconMinus,
  IconX
} from './Icons.jsx'

const TABS = [
  ['sistema', 'navSystem', IconPlanet],
  ['objetivos', 'navTargets', IconRadar],
  ['carta', 'navChart', IconGalaxy],
  ['ruta', 'navRoute', IconRoute],
  ['cartera', 'navVault', IconWallet],
  ['coleccion', 'navDex', IconLeaf],
  ['biblioteca', 'navLibrary', IconChart],
  ['estadisticas', 'navStats', IconGraph],
  ['sesion', 'navSession', IconChart],
  ['cmdr', 'navCmdr', IconUser],
  ['ajustes', 'navSettings', IconSettings]
]

export default function App() {
  const state = useArtemis()
  const [tab, setTab] = useState('sistema')
  const [routeDest, setRouteDest] = useState(null)
  // La pantalla de inicio solo en el arranque real (no al recargar en el navegador demo)
  const [booting, setBooting] = useState(!window.location.search.includes('nosplash'))
  const lang = state?.settings?.lang || 'es'
  const t = useT(lang)
  useTheme(state?.settings?.theme)
  useSounds(state)

  if (!state) return null

  const connected = !!state.commander.name && !state.watcherError

  return (
    <div className="app">
      {booting && <Splash lang={lang} onDone={() => setBooting(false)} />}
      {!state.settings.onboarded && <Onboarding lang={lang} />}
      {state.settings.onboarded && <UpdateModal update={state.update} t={t} />}

      <div className="titlebar">
        <div className="logo">
          <IconLeaf size={18} />
        </div>
        <div>
          <h1>ARTEMIS</h1>
          <div className="sub">{t('subtitle')}</div>
        </div>
        <span className="spacer" />
        {state.watcherError && <span className="chip warn">⚠ {state.watcherError}</span>}
        <span className="chip">
          <span className={`dot ${connected ? '' : 'off'}`} />
          {state.commander.name ? `CMDR ${state.commander.name}` : t('waitingJournal')}
        </span>
        <div className="winbtns">
          <button title={t('minimize')} onClick={() => window.artemis.minimize()}>
            <IconMinus size={16} />
          </button>
          <button className="close" title={t('close')} onClick={() => window.artemis.close()}>
            <IconX size={16} />
          </button>
        </div>
      </div>
      <div className="ruler" aria-hidden="true" />

      <div className="main">
        <nav className="sidebar">
          {TABS.map(([id, labelKey, Icon]) => (
            <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
              <Icon size={19} />
              {t(labelKey)}
            </button>
          ))}
          <div className="push" />
          <div className="hint">
            {t('overlayHint')}: <b>Ctrl+Alt+O</b>
            <br />
            {t('ghostHint')}: <b>Ctrl+Alt+M</b>
            <br />
            <span style={{ opacity: 0.7 }}>v{state.appVersion}</span>
          </div>
        </nav>

        <div className="content">
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
      </div>
    </div>
  )
}

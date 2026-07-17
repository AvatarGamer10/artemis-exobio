import React, { useState } from 'react'
import { PRESETS, DEFAULT_THEME } from '../theme.js'
import { play } from '../sounds.js'
import {
  IconSettings,
  IconEye,
  IconGhost,
  IconSave,
  IconFolder,
  IconKey,
  IconUser,
  IconLeaf,
  IconSync
} from '../Icons.jsx'

export default function SettingsPanel({ state, t }) {
  const [journalDir, setJournalDir] = useState(state.settings.journalDir)
  const [inaraKey, setInaraKey] = useState(state.settings.inaraKey)
  const [cmdrName, setCmdrName] = useState(state.settings.cmdrName)
  const [webhook, setWebhook] = useState(state.settings.discord?.webhook || '')
  const [saved, setSaved] = useState(false)
  const [dcTest, setDcTest] = useState(null)

  const theme = { ...DEFAULT_THEME, ...(state.settings.theme || {}) }
  const sounds = { enabled: true, volume: 0.5, ...(state.settings.sounds || {}) }
  const lang = state.settings.lang

  const save = async () => {
    await window.artemis.setSettings({ journalDir, inaraKey, cmdrName, discord: { webhook } })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }
  // Los cambios de apariencia e idioma se aplican y guardan al instante
  const setTheme = (patch) => window.artemis.setSettings({ theme: patch })
  const setLang = (l) => window.artemis.setSettings({ lang: l })
  const setSounds = (patch) => window.artemis.setSettings({ sounds: patch })
  const discord = { enabled: true, ...(state.settings.discord || {}) }

  const testDiscord = async () => {
    setDcTest('...')
    const r = await window.artemis.discordTest()
    setDcTest(r?.ok ? 'ok' : r?.error || 'error')
    setTimeout(() => setDcTest(null), 3500)
  }

  return (
    <>
      <div className="panel">
        <h2>
          <IconLeaf size={16} /> {t('setAppearance')}
        </h2>
        <label className="hud">{t('setLanguage')}</label>
        <div className="langbtns">
          <button className={`langbtn ${lang === 'es' ? 'active' : ''}`} onClick={() => setLang('es')}>
            🇪🇸 Español
          </button>
          <button className={`langbtn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>
            🇬🇧 English
          </button>
        </div>

        <label className="hud">{t('setAccent')}</label>
        <div className="swatches">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className={`swatch ${theme.accent === p.accent ? 'active' : ''}`}
              onClick={() => setTheme({ accent: p.accent })}
            >
              <span className="sample" style={{ background: p.accent }} />
              {t(p.labelKey)}
            </button>
          ))}
          <input
            type="color"
            className="colorpick"
            value={theme.accent}
            title={t('setAccent')}
            onChange={(e) => setTheme({ accent: e.target.value })}
          />
        </div>

        <label className="hud">{t('setOpacity')}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <input
            type="range"
            className="slider"
            min="60"
            max="100"
            value={Math.round(theme.opacity * 100)}
            onChange={(e) => setTheme({ opacity: Number(e.target.value) / 100 })}
          />
          <span className="v hi" style={{ fontFamily: 'var(--mono)', width: 46, textAlign: 'right' }}>
            {Math.round(theme.opacity * 100)}%
          </span>
        </div>

        <label className="hud">{t('setNotify')}</label>
        <div className="muted" style={{ marginBottom: 10 }}>{t('setNotifyDesc')}</div>
        <button
          className={`hud ${state.settings.notify?.enabled !== false ? '' : 'ghost'}`}
          onClick={() =>
            window.artemis.setSettings({
              notify: { enabled: !(state.settings.notify?.enabled !== false) }
            })
          }
        >
          {t('setNotifyToggle', state.settings.notify?.enabled !== false)}
        </button>

        <label className="hud">{t('setSounds')}</label>
        <div className="muted" style={{ marginBottom: 10 }}>{t('setSoundsDesc')}</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className={`hud ${sounds.enabled ? '' : 'ghost'}`}
            onClick={() => setSounds({ enabled: !sounds.enabled })}
          >
            {t('setSoundsToggle', sounds.enabled)}
          </button>
          <button className="hud ghost" onClick={() => play('jackpot', sounds.volume)}>
            {t('setSoundsTest')}
          </button>
        </div>
        <label className="hud">{t('setVolume')}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <input
            type="range"
            className="slider"
            min="10"
            max="100"
            value={Math.round(sounds.volume * 100)}
            onChange={(e) => setSounds({ volume: Number(e.target.value) / 100 })}
          />
          <span className="v hi" style={{ fontFamily: 'var(--mono)', width: 46, textAlign: 'right' }}>
            {Math.round(sounds.volume * 100)}%
          </span>
        </div>

        <div style={{ marginTop: 18 }}>
          <button
            className="hud ghost"
            onClick={() => window.artemis.setSettings({ onboarded: false })}
          >
            <IconSync size={16} /> {t('setReplayTour')}
          </button>
        </div>
      </div>

      <div className="panel">
        <h2>
          <IconSettings size={16} /> {t('setTitle')}
        </h2>
        <label className="hud">
          <IconFolder size={15} /> {t('setJournal')}
        </label>
        <input className="hud" value={journalDir} onChange={(e) => setJournalDir(e.target.value)} />
        <label className="hud">
          <IconUser size={15} /> {t('setCmdr')}
        </label>
        <input className="hud" value={cmdrName} onChange={(e) => setCmdrName(e.target.value)} />
        <label className="hud">
          <IconKey size={15} /> {t('setKey')}
        </label>
        <input
          className="hud"
          value={inaraKey}
          placeholder={t('setKeyPh')}
          onChange={(e) => setInaraKey(e.target.value)}
        />
        <div style={{ marginTop: 18, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="hud" onClick={save}>
            <IconSave size={17} /> {t('setSave')}
          </button>
          {saved && <span className="v good">{t('setSaved')}</span>}
        </div>
      </div>

      <div className="panel">
        <h2>
          <IconSync size={16} /> {t('setDiscord')}
        </h2>
        <div className="muted" style={{ marginBottom: 6 }}>{t('setDiscordDesc')}</div>
        <label className="hud">
          <IconKey size={15} /> {t('setDiscordUrl')}
        </label>
        <input
          className="hud"
          value={webhook}
          placeholder={t('setDiscordPh')}
          onChange={(e) => setWebhook(e.target.value)}
        />
        <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="hud" onClick={save}>
            <IconSave size={17} /> {t('setSave')}
          </button>
          <button
            className={`hud ${discord.enabled ? '' : 'ghost'}`}
            onClick={() => window.artemis.setSettings({ discord: { enabled: !discord.enabled } })}
          >
            {t('setDiscordToggle', discord.enabled)}
          </button>
          <button className="hud ghost" onClick={testDiscord} disabled={!discord.hasWebhook || dcTest === '...'}>
            {t('setDiscordTest')}
          </button>
          {dcTest === 'ok' && <span className="v good">{t('setDiscordOk')}</span>}
          {dcTest && dcTest !== 'ok' && dcTest !== '...' && <span className="warn">⚠ {dcTest}</span>}
        </div>
        <div className="muted" style={{ marginTop: 10 }}>{t('setDiscordHint')}</div>
      </div>

      <div className="panel">
        <h2>
          <IconEye size={16} /> {t('setOverlay')}
        </h2>
        <div className="kv" style={{ marginBottom: 14 }}>
          <span className="k">{t('setShowHide')}</span>
          <span className="v">Ctrl + Alt + O</span>
          <span className="k">{t('setGhost')}</span>
          <span className="v">Ctrl + Alt + M</span>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="hud" onClick={() => window.artemis.toggleOverlay()}>
            <IconEye size={17} /> {t('setToggleOverlay')}
          </button>
          <button className="hud ghost" onClick={() => window.artemis.toggleClickThrough()}>
            <IconGhost size={17} /> {t('setGhostBtn', state.overlay.clickThrough)}
          </button>
        </div>
        <div className="muted" style={{ marginTop: 12 }}>
          {t('setBorderless')}
        </div>
      </div>
    </>
  )
}

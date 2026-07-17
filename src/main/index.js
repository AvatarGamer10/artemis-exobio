import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  globalShortcut,
  screen,
  shell,
  nativeImage,
  Notification
} from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { JournalWatcher, defaultJournalDir } from './journal.js'
import { createGameState, applyJournalEvent, applyStatus, vaultValue } from './state.js'
import { getCommanderProfile } from './inara.js'
import { edsmSystem, canonnSystemPoi, spanshSearchSpecies, spanshPlotRoute } from './apis.js'
import { checkLatest, downloadAndInstall } from './updater.js'
import { postDiscord, sampleEmbed, sessionEmbed, testEmbed } from './discord.js'
import { loadStore, saveStore } from './store.js'

let mainWin = null
let overlayWin = null
let watcher = null
let store = {}
let state = null
let overlayClickThrough = false
let broadcastTimer = null

const isDev = !!process.env['ELECTRON_RENDERER_URL']
const preloadPath = path.join(__dirname, '../preload/index.js')

function snapshot() {
  return {
    ...state,
    shipRaw: undefined, // demasiado grande para difundirlo; se exporta vía ship:slef
    vaultTotal: vaultValue(state),
    settings: {
      journalDir: store.journalDir || defaultJournalDir(),
      inaraKey: store.inaraKey ? '••••' + String(store.inaraKey).slice(-4) : '',
      hasInaraKey: !!store.inaraKey,
      cmdrName: store.cmdrName || state.commander.name || '',
      lang: store.lang || 'es',
      theme: store.theme || null,
      sounds: store.sounds || { enabled: true, volume: 0.5 },
      notify: store.notify || { enabled: true },
      discord: {
        enabled: store.discord?.enabled !== false,
        hasWebhook: !!store.discord?.webhook,
        webhook: store.discord?.webhook ? '••••' + String(store.discord.webhook).slice(-8) : ''
      },
      onboarded: !!store.onboarded
    },
    overlay: { visible: !!overlayWin?.isVisible(), clickThrough: overlayClickThrough },
    watcherError: watcher?.lastError || null,
    external,
    update,
    appVersion: app.getVersion()
  }
}

function broadcast() {
  // Coalescer: el journal puede escupir ráfagas de eventos
  if (broadcastTimer) return
  broadcastTimer = setTimeout(() => {
    broadcastTimer = null
    const snap = snapshot()
    for (const w of [mainWin, overlayWin]) {
      if (w && !w.isDestroyed()) w.webContents.send('state', snap)
    }
  }, 100)
}

function persist() {
  store.vault = state.vault
  store.library = state.library
  store.route = state.route
  store.cmdrName = state.commander.name || store.cmdrName
  saveStore(store)
}

let watcherRetry = null

// ── Notificaciones de Windows ──
const NOTIF_TEXT = {
  es: {
    jackpotBody: (body, sp, v) => [`Premio gordo detectado`, `${body}: posible ${sp} (~${v}M cr)`],
    bigSample: (sp, v) => [`Muestra legendaria completada`, `${sp} — ${v}M cr a la cartera`],
    newVariant: (variant) => [`¡Variante nueva para la colección!`, variant],
    session: (s) => [
      `Resumen de la sesión`,
      `${s.jumps} saltos · ${s.samplesCompleted} especies muestreadas · ${Math.round(vaultValue(state) / 1e6)}M cr sin vender`
    ]
  },
  en: {
    jackpotBody: (body, sp, v) => [`Jackpot detected`, `${body}: possible ${sp} (~${v}M cr)`],
    bigSample: (sp, v) => [`Legendary sample completed`, `${sp} — ${v}M cr to your wallet`],
    newVariant: (variant) => [`New variant for your collection!`, variant],
    session: (s) => [
      `Session summary`,
      `${s.jumps} jumps · ${s.samplesCompleted} species sampled · ${Math.round(vaultValue(state) / 1e6)}M cr unsold`
    ]
  }
}

const notifiedBodies = new Set()

function notify(kind, ...args) {
  if (store.notify?.enabled === false) return
  try {
    const [title, body] = (NOTIF_TEXT[store.lang || 'es'] || NOTIF_TEXT.es)[kind](...args)
    new Notification({ title, body, icon: appIcon(), silent: true }).show()
  } catch {
    // sin soporte de notificaciones: silencio
  }
}

// Feed de Discord (webhook del escuadrón): variantes nuevas, legendarias y sesiones
function discordPost(embed) {
  const cfg = store.discord
  if (!cfg?.webhook || cfg.enabled === false) return
  postDiscord(cfg.webhook, embed).then((r) => {
    if (!r.ok) console.error('[discord]', r.error)
  })
}

// Disparadores de notificación sobre eventos en vivo del journal
function checkNotifications(ev, ctx = {}) {
  if (ev.event === 'ScanOrganic' && ev.ScanType === 'Log' && state.sampling?.isNewVariant) {
    notify('newVariant', state.sampling.variant || state.sampling.species)
  }
  if (ev.event === 'ScanOrganic' && ev.ScanType === 'Analyse') {
    const last = state.vault[state.vault.length - 1]
    if (last && last.value >= 15000000) {
      notify('bigSample', last.species, Math.round(last.value / 1e6))
    }
    // Discord: muestra completada que es variante nueva o legendaria
    if (last && last.timestamp === ev.timestamp && (ctx.wasNewVariant || last.value >= 15000000)) {
      discordPost(
        sampleEmbed({
          sample: last,
          cmdr: state.commander.name,
          lang: store.lang || 'es',
          isNew: !!ctx.wasNewVariant
        })
      )
    }
  }
  if (ev.event === 'SAASignalsFound' || ev.event === 'Scan' || ev.event === 'FSSBodySignals') {
    for (const [id, b] of Object.entries(state.bioBodies)) {
      const best = b.predictions?.[0]
      const hasBio = b.bioCount > 0 || b.genuses.length > 0
      const key = `${state.system.name}|${id}`
      if (hasBio && best && best.value >= 15000000 && !notifiedBodies.has(key)) {
        notifiedBodies.add(key)
        notify('jackpotBody', b.name, best.species, Math.round(best.value / 1e6))
      }
    }
  }
  if (ev.event === 'Shutdown' && state.session.jumps + state.session.samplesCompleted > 0) {
    notify('session', state.session)
    discordPost(
      sessionEmbed({
        session: state.session,
        unsold: vaultValue(state),
        cmdr: state.commander.name,
        lang: store.lang || 'es'
      })
    )
  }
}

// Parser tolerante de rutas: busca en cualquier JSON (export del Galaxy
// Plotter de Spansh, resultados de su API, o una lista simple) el primer
// array de sistemas reconocible.
function extractRouteSystems(node, depth = 0) {
  if (depth > 6) return null
  if (Array.isArray(node)) {
    if (node.length >= 2 && node.every((x) => typeof x === 'string')) {
      return node.map((s) => ({ system: s, neutron: false, dist: null }))
    }
    const mapped = node
      .filter((x) => x && typeof x === 'object')
      .map((x) => {
        const name = x.system || x.name || x.star_system || x.System || x.StarSystem
        return name
          ? {
              system: String(name),
              neutron: !!(x.neutron_star ?? x.neutron ?? x.has_neutron),
              dist:
                x.distance_jumped != null
                  ? Math.round(x.distance_jumped * 10) / 10
                  : x.distance != null
                    ? Math.round(x.distance * 10) / 10
                    : null
            }
          : null
      })
      .filter(Boolean)
    if (mapped.length >= 2) return mapped
    for (const item of node) {
      const r = extractRouteSystems(item, depth + 1)
      if (r) return r
    }
    return null
  }
  if (node && typeof node === 'object') {
    for (const v of Object.values(node)) {
      const r = extractRouteSystems(v, depth + 1)
      if (r) return r
    }
  }
  return null
}

// Estado de auto-actualización (GitHub Releases)
let update = { available: false, checking: false, downloading: false, progress: 0, error: null }

async function checkForUpdate() {
  update = { ...update, checking: true }
  const res = await checkLatest(app.getVersion())
  update = res.ok
    ? { ...res, downloading: false, progress: 0, error: null, checking: false }
    : { available: false, checking: false, downloading: false, progress: 0, error: res.error }
  broadcast()
}

// Contexto online del sistema actual (EDSM + Canonn), se refresca en cada salto
let external = { system: null, loading: false, edsm: null, canonn: null }

async function fetchExternal(systemName) {
  if (!systemName || external.system === systemName) return
  external = { system: systemName, loading: true, edsm: null, canonn: null }
  broadcast()
  const [edsm, canonn] = await Promise.all([
    edsmSystem(systemName),
    canonnSystemPoi(systemName, state.commander.name)
  ])
  // El jugador puede haber saltado otra vez mientras respondían
  if (external.system !== systemName) return
  external = { system: systemName, loading: false, edsm, canonn }
  broadcast()
}

function startWatcher() {
  clearTimeout(watcherRetry)
  watcher?.stop()
  const dir = store.journalDir || defaultJournalDir()
  if (!fs.existsSync(dir)) {
    // La carpeta puede no existir aún (p. ej. antes de la primera sesión del juego):
    // reintentar hasta que aparezca.
    watcher = { lastError: `Esperando a la carpeta del journal: ${dir}`, stop() {} }
    watcherRetry = setTimeout(startWatcher, 5000)
    broadcast()
    return
  }
  watcher = new JournalWatcher(dir, {
    onEvent: (ev, live) => {
      if (process.env.ARTEMIS_DEBUG) console.log('[event]', ev.event, 'live:', live)
      // Antes de aplicar: ¿este Analyse completa una variante que aún no está en
      // la biblioteca? (tras aplicar, ya estará dentro y no se puede saber)
      let wasNewVariant = false
      if (live && ev.event === 'ScanOrganic' && ev.ScanType === 'Analyse') {
        const variantLoc = ev.Variant_Localised || ev.Variant || null
        const speciesLoc = ev.Species_Localised || ev.Species
        wasNewVariant = variantLoc
          ? !state.library.some((l) => l.variant === variantLoc)
          : !state.library.some((l) => l.species === speciesLoc)
      }
      const changed = applyJournalEvent(state, ev, { live })
      if (changed && live) {
        if (ev.event === 'ScanOrganic' || ev.event === 'SellOrganicData' || ev.event === 'Died') {
          persist()
        }
        if (ev.event === 'FSDJump' || ev.event === 'Location') {
          fetchExternal(state.system.name)
          if (ev.event === 'FSDJump' && state.route) persist()
        }
        broadcast()
      }
      if (live) checkNotifications(ev, { wasNewVariant })
    },
    onStatus: (st) => {
      if (applyStatus(state, st)) broadcast()
    },
    onCatchupDone: () => {
      fetchExternal(state.system.name)
      broadcast()
    }
  })
  const res = watcher.start()
  watcher.lastError = res.ok ? null : res.error
  broadcast()
}

function appIcon() {
  const p = path.join(app.getAppPath(), 'resources', 'icon.png')
  const img = nativeImage.createFromPath(p)
  return img.isEmpty() ? undefined : img
}

function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    title: 'ARTEMIS — Compañero de Exobiología',
    icon: appIcon(),
    autoHideMenuBar: true,
    webPreferences: { preload: preloadPath, contextIsolation: true }
  })
  if (isDev) mainWin.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/index.html')
  else mainWin.loadFile(path.join(__dirname, '../renderer/index.html'))
  mainWin.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWin.on('closed', () => {
    mainWin = null
    app.quit()
  })
}

function createOverlayWindow() {
  const { width } = screen.getPrimaryDisplay().workAreaSize
  overlayWin = new BrowserWindow({
    width: 296,
    height: 390,
    x: width - 314,
    y: 40,
    frame: false,
    transparent: true,
    resizable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: true,
    hasShadow: false,
    webPreferences: { preload: preloadPath, contextIsolation: true }
  })
  overlayWin.setAlwaysOnTop(true, 'screen-saver')
  overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  if (isDev) overlayWin.loadURL(process.env['ELECTRON_RENDERER_URL'] + '/overlay.html')
  else overlayWin.loadFile(path.join(__dirname, '../renderer/overlay.html'))
  overlayWin.on('closed', () => (overlayWin = null))
}

function toggleOverlay() {
  if (!overlayWin || overlayWin.isDestroyed()) {
    createOverlayWindow()
    broadcast()
    return
  }
  overlayWin.isVisible() ? overlayWin.hide() : overlayWin.show()
  broadcast()
}

function toggleClickThrough() {
  if (!overlayWin || overlayWin.isDestroyed()) return
  overlayClickThrough = !overlayClickThrough
  overlayWin.setIgnoreMouseEvents(overlayClickThrough, { forward: true })
  broadcast()
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.mayca.artemis')
  store = loadStore()
  state = createGameState(store)

  ipcMain.handle('state:get', () => snapshot())
  ipcMain.handle('settings:set', (_e, patch) => {
    const dirChanged = patch.journalDir != null && patch.journalDir !== store.journalDir
    if (patch.journalDir != null) store.journalDir = patch.journalDir
    if (patch.inaraKey != null && patch.inaraKey !== '' && !patch.inaraKey.startsWith('••••')) {
      store.inaraKey = patch.inaraKey
    }
    if (patch.cmdrName != null) store.cmdrName = patch.cmdrName
    if (patch.lang != null) store.lang = patch.lang
    if (patch.onboarded != null) store.onboarded = patch.onboarded
    if (patch.theme != null) store.theme = { ...(store.theme || {}), ...patch.theme }
    if (patch.sounds != null)
      store.sounds = { enabled: true, volume: 0.5, ...(store.sounds || {}), ...patch.sounds }
    if (patch.notify != null) store.notify = { enabled: true, ...(store.notify || {}), ...patch.notify }
    if (patch.discord != null) {
      const d = { enabled: true, ...(store.discord || {}), ...patch.discord }
      // no machacar el webhook real con la versión enmascarada del formulario
      if (typeof patch.discord.webhook === 'string' && patch.discord.webhook.startsWith('••••')) {
        d.webhook = store.discord?.webhook || ''
      }
      store.discord = d
    }
    saveStore(store)
    if (dirChanged) {
      state = createGameState(store)
      startWatcher()
    }
    broadcast()
    return snapshot()
  })
  ipcMain.handle('inara:refresh', async () => {
    const res = await getCommanderProfile(store.inaraKey, store.cmdrName || state.commander.name)
    if (res.ok) {
      state.inara = res.profile
      broadcast()
    }
    return res
  })
  ipcMain.handle('overlay:toggle', () => toggleOverlay())
  ipcMain.handle('overlay:clickthrough', () => toggleClickThrough())
  ipcMain.handle('win:minimize', () => mainWin?.minimize())
  ipcMain.handle('win:close', () => mainWin?.close())
  ipcMain.handle('targets:search', (_e, species) =>
    spanshSearchSpecies(species, state.system.name || 'Sol')
  )
  // ── Sistema de rutas (ROUTE update) ──
  ipcMain.handle('route:plot', async (_e, { to, range, efficiency }) => {
    const from = state.system.name
    const r = range || state.ship?.maxJumpRange
    if (!from) return { ok: false, error: 'no-system' }
    if (!r) return { ok: false, error: 'no-range' }
    const res = await spanshPlotRoute(from, to, r, efficiency || 60)
    if (res.ok) {
      state.route = { systems: res.systems, index: 0, dest: to, source: 'spansh' }
      persist()
      broadcast()
    }
    return res
  })
  ipcMain.handle('route:import', async () => {
    const pick = await dialog.showOpenDialog(mainWin, {
      title: 'Importar ruta (JSON del Galaxy Plotter de Spansh)',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (pick.canceled || !pick.filePaths[0]) return { ok: false, error: 'cancelled' }
    try {
      const text = fs.readFileSync(pick.filePaths[0], 'utf8')
      const raw = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text)
      const systems = extractRouteSystems(raw)
      if (!systems) return { ok: false, error: 'no-systems' }
      state.route = {
        systems,
        index: 0,
        dest: systems[systems.length - 1].system,
        source: 'import'
      }
      persist()
      broadcast()
      return { ok: true, count: systems.length }
    } catch (e) {
      return { ok: false, error: String(e.message || e) }
    }
  })
  ipcMain.handle('route:clear', () => {
    state.route = null
    persist()
    broadcast()
  })
  ipcMain.handle('ship:slef', () => {
    if (!state.shipRaw) return null
    return JSON.stringify([
      { header: { appName: 'Artemis', appVersion: app.getVersion() }, data: state.shipRaw }
    ])
  })

  ipcMain.handle('update:download', async () => {
    if (!update.available || !update.url || update.downloading) return { ok: false }
    update = { ...update, downloading: true, progress: 0, error: null }
    broadcast()
    try {
      await downloadAndInstall(update.url, update.assetName, (p) => {
        update = { ...update, progress: p }
        broadcast()
      })
      return { ok: true }
    } catch (e) {
      update = { ...update, downloading: false, error: String(e.message || e) }
      broadcast()
      return { ok: false, error: update.error }
    }
  })
  ipcMain.handle('discord:test', async () => {
    if (!store.discord?.webhook) return { ok: false, error: 'no-webhook' }
    return postDiscord(
      store.discord.webhook,
      testEmbed(store.lang || 'es', state.commander.name || store.cmdrName)
    )
  })
  ipcMain.handle('vault:clear', () => {
    state.vault = []
    persist()
    broadcast()
  })

  createMainWindow()
  createOverlayWindow()
  startWatcher()
  setTimeout(checkForUpdate, 4000)

  globalShortcut.register('CommandOrControl+Alt+O', toggleOverlay)
  globalShortcut.register('CommandOrControl+Alt+M', toggleClickThrough)
})

app.on('will-quit', () => globalShortcut.unregisterAll())
app.on('window-all-closed', () => app.quit())

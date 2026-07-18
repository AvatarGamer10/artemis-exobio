import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  globalShortcut,
  Menu,
  screen,
  shell,
  nativeImage,
  Notification,
  Tray
} from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { JournalWatcher, defaultJournalDir } from './journal.js'
import { createGameState, applyJournalEvent, applyStatus, vaultValue } from './state.js'
import { getCommanderProfile } from './inara.js'
import { edsmSystem, canonnSystemPoi, spanshSearchSpecies, spanshPlotRoute } from './apis.js'
import { checkLatest, downloadAndInstall } from './updater.js'
import { postDiscord, sampleEmbed, sessionEmbed, testEmbed } from './discord.js'
import { DiscordRPC } from './rpc.js'
import { loadStore, saveStore } from './store.js'

let mainWin = null
let overlayWin = null
let watcher = null
let store = {}
let state = null
let overlayClickThrough = false
let broadcastTimer = null
let tray = null

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
      rpc: { enabled: store.rpc?.enabled !== false, appId: store.rpc?.appId || '' },
      onboarded: !!store.onboarded
    },
    rpcConnected,
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
    updateRpc()
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

// ── Discord Rich Presence ──
let rpc = null
let rpcConnected = false
let rpcRetry = null
let rpcLastUpdate = 0

function buildRpcActivity() {
  const es = (store.lang || 'es') !== 'en'
  const s = state.sampling
  let details
  let stateLine
  if (s) {
    details = `${es ? 'Muestreando' : 'Sampling'} ${s.species} (${s.step}/3)`
    stateLine = state.system.name || undefined
  } else {
    details = state.system.name
      ? `${es ? 'Explorando' : 'Exploring'} ${state.system.name}`
      : es
        ? 'Preparando la expedición'
        : 'Preparing the expedition'
    const n = state.session.samplesCompleted
    stateLine = `${n} ${es ? 'especies esta sesión' : 'species this session'} · ${Math.round(vaultValue(state) / 1e6)}M cr`
  }
  return {
    details: details.slice(0, 128),
    state: stateLine ? stateLine.slice(0, 128) : undefined,
    timestamps: { start: new Date(state.session.startedAt).getTime() },
    assets: { large_image: 'artemis', large_text: 'ARTEMIS — Exobiology Companion' }
  }
}

function stopRpc() {
  clearTimeout(rpcRetry)
  rpc?.destroy()
  rpc = null
  rpcConnected = false
}

async function startRpc() {
  stopRpc()
  const cfg = store.rpc
  if (!cfg?.appId || cfg.enabled === false) {
    broadcast()
    return
  }
  rpc = new DiscordRPC(cfg.appId)
  rpcConnected = await rpc.connect()
  if (rpcConnected) {
    rpc.once('close', () => {
      rpcConnected = false
      broadcast()
      rpcRetry = setTimeout(startRpc, 30000)
    })
    updateRpc(true)
  } else {
    // Discord cerrado o app ID inválido: reintentar con calma
    rpcRetry = setTimeout(startRpc, 30000)
  }
  broadcast()
}

// Discord limita a ~1 actualización cada 15 s
function updateRpc(force = false) {
  if (!rpcConnected || !rpc) return
  const now = Date.now()
  if (!force && now - rpcLastUpdate < 15000) return
  rpcLastUpdate = now
  rpc.setActivity(buildRpcActivity())
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

// ── Bandeja del sistema ──
const TRAY_TEXT = {
  es: { show: 'Mostrar Artemis', overlay: 'Mostrar / ocultar overlay', quit: 'Salir' },
  en: { show: 'Show Artemis', overlay: 'Show / hide overlay', quit: 'Quit' }
}

function showMain() {
  if (!mainWin || mainWin.isDestroyed()) return
  mainWin.show()
  mainWin.focus()
}

function buildTrayMenu() {
  if (!tray) return
  const txt = TRAY_TEXT[store.lang || 'es'] || TRAY_TEXT.es
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: txt.show, click: showMain },
      { label: txt.overlay, click: toggleOverlay },
      { type: 'separator' },
      { label: txt.quit, click: () => app.quit() }
    ])
  )
}

function createTray() {
  const icon = appIcon()
  if (!icon) return
  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('ARTEMIS — Compañero de Exobiología')
  buildTrayMenu()
  tray.on('double-click', showMain)
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
    if (patch.lang != null) {
      store.lang = patch.lang
      buildTrayMenu()
    }
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
    if (patch.rpc != null) {
      store.rpc = { enabled: true, ...(store.rpc || {}), ...patch.rpc }
      if (typeof store.rpc.appId === 'string') store.rpc.appId = store.rpc.appId.trim()
      startRpc()
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
  // Minimizar = esconder a la bandeja (no ocupa la barra de tareas mientras juegas)
  ipcMain.handle('win:minimize', () => mainWin?.hide())
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
  // ── Copia de seguridad y exportación ──
  ipcMain.handle('backup:export', async () => {
    const stamp = new Date().toISOString().slice(0, 10)
    const pick = await dialog.showSaveDialog(mainWin, {
      title: 'Exportar copia de seguridad',
      defaultPath: `artemis-backup-${stamp}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (pick.canceled || !pick.filePath) return { ok: false, error: 'cancelled' }
    try {
      persist()
      fs.writeFileSync(pick.filePath, JSON.stringify(store, null, 2), 'utf8')
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e.message || e) }
    }
  })
  ipcMain.handle('backup:import', async () => {
    const pick = await dialog.showOpenDialog(mainWin, {
      title: 'Importar copia de seguridad de Artemis',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })
    if (pick.canceled || !pick.filePaths[0]) return { ok: false, error: 'cancelled' }
    try {
      const text = fs.readFileSync(pick.filePaths[0], 'utf8')
      const imp = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text)
      if (!imp || typeof imp !== 'object' || (!imp.library && !imp.vault)) {
        return { ok: false, error: 'invalid' }
      }
      // Unión por id: nunca se pierde nada de lo que ya hay en esta máquina
      const mergeById = (a = [], b = []) => {
        const m = new Map()
        for (const x of [...a, ...b]) if (x && x.id) m.set(x.id, x)
        return [...m.values()].sort((x, y) =>
          String(x.timestamp || '').localeCompare(String(y.timestamp || ''))
        )
      }
      store.library = mergeById(store.library, imp.library)
      store.vault = mergeById(store.vault, imp.vault)
      // Ajustes del backup solo rellenan huecos, no pisan los actuales
      for (const k of ['cmdrName', 'inaraKey', 'lang', 'theme', 'sounds', 'notify', 'discord', 'route']) {
        if (imp[k] != null && store[k] == null) store[k] = imp[k]
      }
      saveStore(store)
      state = createGameState(store)
      startWatcher()
      broadcast()
      return { ok: true, library: store.library.length }
    } catch (e) {
      return { ok: false, error: String(e.message || e) }
    }
  })
  ipcMain.handle('library:csv', async () => {
    const stamp = new Date().toISOString().slice(0, 10)
    const pick = await dialog.showSaveDialog(mainWin, {
      title: 'Exportar biblioteca a CSV',
      defaultPath: `artemis-biblioteca-${stamp}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (pick.canceled || !pick.filePath) return { ok: false, error: 'cancelled' }
    try {
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
      const rows = [
        ['species', 'variant', 'genus', 'system', 'body', 'value_cr', 'timestamp', 'first_logged'],
        ...state.library.map((l) => [
          l.species,
          l.variant || '',
          l.genus || '',
          l.system || '',
          l.body || '',
          l.value ?? '',
          l.timestamp || '',
          l.firstLoggedConfirmed === true ? 'confirmed' : l.maybeFirstLogged ? 'estimated' : ''
        ])
      ]
      // BOM para que Excel abra el UTF-8 bien; ';' como separador (Excel ES)
      fs.writeFileSync(pick.filePath, '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n'), 'utf8')
      return { ok: true, count: state.library.length }
    } catch (e) {
      return { ok: false, error: String(e.message || e) }
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
  createTray()
  startWatcher()
  setTimeout(checkForUpdate, 4000)
  setTimeout(startRpc, 2500)

  globalShortcut.register('CommandOrControl+Alt+O', toggleOverlay)
  globalShortcut.register('CommandOrControl+Alt+M', toggleClickThrough)
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  stopRpc()
})
app.on('window-all-closed', () => app.quit())

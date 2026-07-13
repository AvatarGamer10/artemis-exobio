// Vigila la carpeta del journal de Elite Dangerous: hace tail del
// Journal.*.log más reciente y relee Status.json cuando cambia.

import chokidar from 'chokidar'
import fs from 'node:fs'
import path from 'node:path'

export class JournalWatcher {
  constructor(dir, { onEvent, onStatus, onCatchupDone }) {
    this.dir = dir
    this.onEvent = onEvent
    this.onStatus = onStatus
    this.onCatchupDone = onCatchupDone
    this.currentFile = null
    this.offset = 0
    this.watcher = null
  }

  start() {
    const missing = !fs.existsSync(this.dir)
    if (!missing) {
      const latest = this.findLatestJournal()
      if (latest) {
        this.currentFile = latest
        this.readNewLines(false) // catch-up: reconstruir estado del día sin contar stats de sesión
      }
      this.readStatus()
    }
    this.onCatchupDone?.()

    // chokidar acepta rutas que aún no existen: si la carpeta aparece luego
    // (p. ej. primera sesión del juego), empieza a emitir eventos sola.
    this.watcher = chokidar.watch(this.dir, {
      depth: 0,
      usePolling: true,
      interval: 1000,
      ignoreInitial: true,
      awaitWriteFinish: false
    })
    this.watcher.on('add', (p) => {
      if (process.env.ARTEMIS_DEBUG) console.log('[watcher] add:', p)
      this.onFileChange(p)
    })
    this.watcher.on('change', (p) => {
      if (process.env.ARTEMIS_DEBUG) console.log('[watcher] change:', p)
      this.onFileChange(p)
    })
    this.watcher.on('error', (e) => console.error('[watcher] error:', e))
    return missing
      ? { ok: false, error: `La carpeta no existe (aún): ${this.dir}` }
      : { ok: true, file: this.currentFile }
  }

  stop() {
    this.watcher?.close()
    this.watcher = null
  }

  findLatestJournal() {
    const files = fs
      .readdirSync(this.dir)
      .filter((f) => /^Journal\..*\.log$/.test(f))
      .map((f) => path.join(this.dir, f))
      .sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs)
    return files.at(-1) || null
  }

  onFileChange(p) {
    const base = path.basename(p)
    if (base === 'Status.json') {
      this.readStatus()
      return
    }
    if (!/^Journal\..*\.log$/.test(base)) return
    // ¿Journal nuevo (nueva sesión de juego)?
    if (p !== this.currentFile) {
      const latest = this.findLatestJournal()
      if (latest !== this.currentFile) {
        this.currentFile = latest
        this.offset = 0
      }
    }
    this.readNewLines(true)
  }

  readNewLines(live) {
    if (!this.currentFile || !fs.existsSync(this.currentFile)) return
    const size = fs.statSync(this.currentFile).size
    if (size < this.offset) this.offset = 0 // archivo truncado/rotado
    if (size === this.offset) return
    const fd = fs.openSync(this.currentFile, 'r')
    try {
      const buf = Buffer.alloc(size - this.offset)
      fs.readSync(fd, buf, 0, buf.length, this.offset)
      this.offset = size
      const text = buf.toString('utf8')
      // La última línea puede estar a medio escribir: si no acaba en \n, se reprocesa luego
      const lastNl = text.lastIndexOf('\n')
      if (lastNl === -1) {
        this.offset -= Buffer.byteLength(text, 'utf8')
        return
      }
      const complete = text.slice(0, lastNl)
      this.offset -= Buffer.byteLength(text.slice(lastNl + 1), 'utf8')
      for (const line of complete.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          this.onEvent(JSON.parse(trimmed), live)
        } catch {
          // línea corrupta: ignorar
        }
      }
    } finally {
      fs.closeSync(fd)
    }
  }

  readStatus() {
    const p = path.join(this.dir, 'Status.json')
    if (!fs.existsSync(p)) return
    try {
      const raw = fs.readFileSync(p, 'utf8')
      if (raw.trim()) this.onStatus(JSON.parse(raw))
    } catch {
      // ED reescribe el archivo constantemente; los fallos de lectura puntuales son normales
    }
  }
}

export function defaultJournalDir() {
  return path.join(
    process.env.USERPROFILE || '',
    'Saved Games',
    'Frontier Developments',
    'Elite Dangerous'
  )
}

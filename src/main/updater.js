// Auto-actualización vía GitHub Releases: comprueba la última release del
// repo al arrancar y, si es más nueva, descarga el instalador y lo lanza.

import { app, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

const REPO = 'AvatarGamer10/artemis-exobio'
const HEADERS = { 'User-Agent': 'Artemis-Exobio-Companion', Accept: 'application/vnd.github+json' }

export function isNewer(a, b) {
  const pa = String(a).split('.').map(Number)
  const pb = String(b).split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true
    if ((pa[i] || 0) < (pb[i] || 0)) return false
  }
  return false
}

export async function checkLatest(currentVersion) {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: HEADERS
    })
    // 404 = repo privado o sin releases visibles: no hay nada que ofrecer
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    const rel = await res.json()
    const latest = String(rel.tag_name || '').replace(/^v/, '')
    if (!latest || !isNewer(latest, currentVersion)) return { ok: true, available: false }
    const asset = (rel.assets || []).find((a) => a.name.endsWith('.exe'))
    return {
      ok: true,
      available: true,
      version: latest,
      notes: rel.body || '',
      pageUrl: rel.html_url,
      url: asset?.browser_download_url || null,
      assetName: asset?.name || null,
      size: asset?.size || null
    }
  } catch (e) {
    return { ok: false, error: String(e.message || e) }
  }
}

export async function downloadAndInstall(url, assetName, onProgress) {
  const dest = path.join(app.getPath('temp'), assetName || 'Artemis-Setup.exe')
  const res = await fetch(url, { headers: { 'User-Agent': HEADERS['User-Agent'] } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const total = Number(res.headers.get('content-length')) || 0
  const chunks = []
  let got = 0
  const reader = res.body.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(Buffer.from(value))
    got += value.length
    if (total) onProgress?.(Math.min(99, Math.round((got / total) * 100)))
  }
  fs.writeFileSync(dest, Buffer.concat(chunks))
  onProgress?.(100)
  // Lanza el instalador NSIS (oneClick) y cierra la app para que pueda sustituirla
  await shell.openPath(dest)
  setTimeout(() => app.quit(), 900)
  return dest
}

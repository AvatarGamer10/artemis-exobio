// Clientes de APIs públicas: EDSM (¿sistema conocido?), Canonn (bio reportada
// por la comunidad) y Spansh (búsqueda de cuerpos por especie).

const UA = { 'User-Agent': 'Artemis-Exobio-Companion/0.3' }

async function getJson(url, opts = {}, timeoutMs = 15000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal, headers: { ...UA, ...(opts.headers || {}) } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

// EDSM: si el sistema no está en su base, nadie lo ha subido → posible first discovery
export async function edsmSystem(systemName) {
  try {
    const data = await getJson(
      `https://www.edsm.net/api-system-v1/bodies?systemName=${encodeURIComponent(systemName)}`
    )
    const bodies = Array.isArray(data?.bodies) ? data.bodies : []
    const known = !!data?.name || bodies.length > 0
    return { ok: true, known, bodyCount: bodies.length }
  } catch (e) {
    return { ok: false, error: String(e.message || e) }
  }
}

// Canonn: señales SAA y entradas de codex ya reportadas en el sistema
export async function canonnSystemPoi(systemName, cmdrName) {
  try {
    const data = await getJson(
      `https://us-central1-canonn-api-236217.cloudfunctions.net/query/getSystemPoi?system=${encodeURIComponent(systemName)}&cmdr=${encodeURIComponent(cmdrName || 'Artemis')}`,
      {},
      20000
    )
    const bioSignals = (data?.SAAsignals || []).filter((s) => s.hud_category === 'Biology')
    const bioCodex = (data?.codex || [])
      .filter((c) => c.hud_category === 'Biology')
      .map((c) => ({ name: c.english_name, body: c.body ?? null }))
    return { ok: true, bioSignals, bioCodex }
  } catch (e) {
    return { ok: false, error: String(e.message || e) }
  }
}

// Spansh: cuerpos con una especie concreta cerca de un sistema de referencia
export async function spanshSearchSpecies(species, referenceSystem, size = 15) {
  try {
    const genus = species.split(' ')[0]
    const data = await getJson(
      'https://spansh.co.uk/api/bodies/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: { landmarks: [{ type: genus, subtype: [species] }] },
          sort: [{ distance: { direction: 'asc' } }],
          size,
          page: 0,
          reference_system: referenceSystem
        })
      },
      30000
    )
    const results = (data?.results || []).map((r) => {
      const lm = (r.landmarks || []).find((l) => l.subtype === species)
      const count = (r.landmarks || []).filter((l) => l.subtype === species).length
      return {
        system: r.system_name,
        body: r.name,
        distanceLy: r.distance != null ? Math.round(r.distance * 10) / 10 : null,
        distLs: r.distance_to_arrival != null ? Math.round(r.distance_to_arrival) : null,
        bodyClass: r.subtype || null,
        gravity: r.gravity != null ? Math.round(r.gravity * 100) / 100 : null,
        atmosphere: r.atmosphere || null,
        value: lm?.value ?? null,
        count
      }
    })
    return { ok: true, results, total: data?.count ?? results.length }
  } catch (e) {
    return { ok: false, error: String(e.message || e) }
  }
}

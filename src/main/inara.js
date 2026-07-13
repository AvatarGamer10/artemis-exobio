// Cliente de la API de Inara (https://inara.cz/inara-api-docs/)

const INARA_URL = 'https://inara.cz/inapi/v1/'
const APP_NAME = 'Artemis Exobio Companion'
const APP_VERSION = '0.1.0'

export async function getCommanderProfile(apiKey, commanderName) {
  if (!apiKey) return { ok: false, error: 'Falta la API key de Inara' }
  const body = {
    header: {
      appName: APP_NAME,
      appVersion: APP_VERSION,
      isBeingDeveloped: true,
      APIkey: apiKey,
      commanderName: commanderName || undefined
    },
    events: [
      {
        eventName: 'getCommanderProfile',
        eventTimestamp: new Date().toISOString(),
        eventData: { searchName: commanderName || '' }
      }
    ]
  }
  try {
    const res = await fetch(INARA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
    const json = await res.json()
    const ev = json?.events?.[0]
    if (!ev || ev.eventStatus >= 300) {
      return { ok: false, error: ev?.eventStatusText || 'Respuesta inválida de Inara' }
    }
    const d = ev.eventData || {}
    return {
      ok: true,
      profile: {
        name: d.commanderName || d.userName,
        ranks: (d.commanderRanksPilot || []).map((r) => ({
          name: r.rankName,
          value: r.rankValue,
          progress: r.rankProgress
        })),
        squadron: d.commanderSquadron?.squadronName || null,
        allegiance: d.preferredAllegianceName || null,
        avatarUrl: d.avatarImageURL || null,
        inaraUrl: d.inaraURL || null,
        fetchedAt: new Date().toISOString()
      }
    }
  } catch (e) {
    return { ok: false, error: String(e.message || e) }
  }
}

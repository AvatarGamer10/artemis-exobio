// Feed social: publica hitos de exobiología en un canal de Discord vía webhook.

const RARITY_COLOR = {
  legendary: 0xffb547,
  rare: 0x5bc8e8,
  uncommon: 0x58c46a,
  common: 0x9a8a72
}

export function rarityOf(value) {
  if (value >= 15000000) return 'legendary'
  if (value >= 8000000) return 'rare'
  if (value >= 2000000) return 'uncommon'
  return 'common'
}

const cr = (n) => new Intl.NumberFormat('es-ES').format(Math.round(n || 0))

export async function postDiscord(webhook, embed) {
  if (!/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(webhook || '')) {
    return { ok: false, error: 'invalid-webhook' }
  }
  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'ARTEMIS', embeds: [embed] })
    })
    if (!res.ok && res.status !== 204) return { ok: false, error: `HTTP ${res.status}` }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e.message || e) }
  }
}

export function sampleEmbed({ sample, cmdr, lang, isNew }) {
  const es = lang !== 'en'
  const rarity = rarityOf(sample.value)
  const rarityName = es
    ? { legendary: 'Legendaria', rare: 'Rara', uncommon: 'Notable', common: 'Común' }[rarity]
    : { legendary: 'Legendary', rare: 'Rare', uncommon: 'Uncommon', common: 'Common' }[rarity]
  const lines = [
    es
      ? `**CMDR ${cmdr || '?'}** ha registrado ${isNew ? 'una variante **NUEVA** para su colección' : 'una muestra'} ${rarity === 'legendary' ? '🏆' : ''}`
      : `**CMDR ${cmdr || '?'}** logged ${isNew ? 'a **NEW** variant for their collection' : 'a sample'} ${rarity === 'legendary' ? '🏆' : ''}`,
    `📍 ${sample.body || sample.system || '?'}`,
    `💰 ${cr(sample.value)} cr · ${rarityName}${sample.maybeFirstLogged ? (es ? ' · ★ posible first logged (×5)' : ' · ★ possible first logged (×5)') : ''}`
  ]
  return {
    title: `🧬 ${sample.variant || sample.species}`,
    description: lines.join('\n'),
    color: RARITY_COLOR[rarity],
    footer: { text: 'ARTEMIS · Exobiology Companion' },
    timestamp: new Date().toISOString()
  }
}

export function sessionEmbed({ session, unsold, cmdr, lang }) {
  const es = lang !== 'en'
  return {
    title: es ? `📋 Resumen de sesión — CMDR ${cmdr || '?'}` : `📋 Session summary — CMDR ${cmdr || '?'}`,
    description: [
      `🚀 ${session.jumps} ${es ? 'saltos' : 'jumps'} · ${session.distanceLy.toFixed(1)} ${es ? 'al' : 'ly'}`,
      `🧬 ${session.samplesCompleted} ${es ? 'especies muestreadas' : 'species sampled'}`,
      `💰 ${cr(unsold)} cr ${es ? 'sin vender en la cartera' : 'unsold in the wallet'}`
    ].join('\n'),
    color: 0xff8a2a,
    footer: { text: 'ARTEMIS · Exobiology Companion' },
    timestamp: new Date().toISOString()
  }
}

export function testEmbed(lang, cmdr) {
  const es = lang !== 'en'
  return {
    title: es ? '🛰 Artemis conectada' : '🛰 Artemis connected',
    description: es
      ? `El feed de exobiología de **CMDR ${cmdr || '?'}** se publicará en este canal: variantes nuevas, muestras legendarias y resúmenes de sesión.`
      : `The exobiology feed of **CMDR ${cmdr || '?'}** will post to this channel: new variants, legendary samples and session summaries.`,
    color: 0x58c46a,
    footer: { text: 'ARTEMIS · Exobiology Companion' },
    timestamp: new Date().toISOString()
  }
}

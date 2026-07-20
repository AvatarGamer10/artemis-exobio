import React, { useMemo } from 'react'
import { cr } from '../useArtemis.js'
import { IconLeaf, IconRadar, IconRoute, IconWallet } from '../Icons.jsx'

// Bitácora en vivo: la columna derecha. Funde tus muestras, entradas de
// codex y la ruta en una única línea temporal, lo más reciente arriba.
const RARITY = (v) =>
  v >= 15000000 ? 'legendary' : v >= 8000000 ? 'rare' : v >= 2000000 ? 'uncommon' : 'common'

function timeAgo(ts, lang) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000))
  if (mins < 1) return lang === 'en' ? 'now' : 'ahora'
  if (mins < 60) return `${mins}m`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}

export default function LiveFeed({ state, t, lang }) {
  const items = useMemo(() => {
    const out = []
    for (const l of state.library || []) {
      out.push({
        id: 'l' + l.id,
        kind: 'sample',
        ts: l.timestamp,
        title: l.variant || l.species,
        sub: l.body || l.system || '',
        value: l.value,
        rarity: RARITY(l.value || 0),
        flag: l.firstLoggedConfirmed === true ? '✪' : l.maybeFirstLogged ? '★' : null
      })
    }
    for (const c of state.codexNew || []) {
      out.push({
        id: 'c' + c.timestamp + c.name,
        kind: 'codex',
        ts: c.timestamp,
        title: c.name,
        sub: c.region || c.system || ''
      })
    }
    return out.sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || ''))).slice(0, 30)
  }, [state.library, state.codexNew])

  const route = state.route
  const next = route?.systems?.[route.index + 1]

  return (
    <aside className="feed">
      <div className="feed-head">
        <span className="feed-title">{t('feedTitle')}</span>
        <span className="feed-count">{items.length}</span>
      </div>

      <div className="feed-summary">
        <div className="feed-sum-item">
          <IconWallet size={13} />
          <span>{cr(state.vaultTotal)}</span>
        </div>
        <div className="feed-sum-item">
          <IconLeaf size={13} />
          <span>{state.session.samplesCompleted}</span>
        </div>
        {next && (
          <div className="feed-sum-item">
            <IconRoute size={13} />
            <span className="truncate">{next.system}</span>
          </div>
        )}
      </div>

      <div className="feed-list">
        {items.length === 0 && <div className="feed-empty">{t('feedEmpty')}</div>}
        {items.map((it) => (
          <div key={it.id} className={`feed-item rar-${it.rarity || 'common'}`}>
            <div className={`feed-avatar av-${it.kind} rar-${it.rarity || 'common'}`}>
              {it.kind === 'sample' ? <IconLeaf size={15} /> : <IconRadar size={15} />}
            </div>
            <div className="feed-body">
              <div className="feed-row">
                <span className="feed-name">
                  {it.title} {it.flag && <span className="feed-flag">{it.flag}</span>}
                </span>
                <span className="feed-time">{timeAgo(it.ts, lang)}</span>
              </div>
              <div className="feed-row">
                <span className="feed-sub">{it.sub}</span>
                {it.value != null && <span className="feed-val">{cr(it.value)}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

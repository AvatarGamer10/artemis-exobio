import React, { useMemo, useState } from 'react'
import { cr } from '../useArtemis.js'
import { IconLeaf, IconChart } from '../Icons.jsx'

const MAX_ROWS = 200

export default function Library({ state, t, lang }) {
  const [query, setQuery] = useState('')
  const locale = lang === 'en' ? 'en-GB' : 'es-ES'
  const library = state.library || []

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const all = [...library].reverse()
    if (!q) return all
    return all.filter((e) =>
      [e.species, e.variant, e.genus, e.system, e.body]
        .filter(Boolean)
        .some((f) => f.toLowerCase().includes(q))
    )
  }, [library, query])

  const uniqueSpecies = new Set(library.map((e) => e.species)).size
  const totalValue = library.reduce((s, e) => s + (e.value || 0), 0)

  return (
    <>
      <div className="panel">
        <h2>
          <IconChart size={16} /> {t('libTitle')}
        </h2>
        <div className="grid3">
          <div className="stat">
            <div className="n">{library.length}</div>
            <div className="l">{t('libSamples')}</div>
          </div>
          <div className="stat">
            <div className="n">{uniqueSpecies}</div>
            <div className="l">{t('libUnique')}</div>
          </div>
          <div className="stat">
            <div className="n">{cr(totalValue)}</div>
            <div className="l">{t('libValue')}</div>
          </div>
        </div>
      </div>
      <div className="panel">
        <h2>
          <IconLeaf size={16} /> {t('libSearchTitle')}
        </h2>
        <input
          className="hud"
          value={query}
          placeholder={t('libSearchPh')}
          onChange={(e) => setQuery(e.target.value)}
        />
        {library.length === 0 ? (
          <div className="empty">
            <IconLeaf size={40} />
            <div>{t('libEmpty')}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">{t('libNoMatch')}</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', marginTop: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th>{t('colSpecies')}</th>
                    <th>{t('colVariant')}</th>
                    <th>{t('colSystem')}</th>
                    <th>{t('colBody')}</th>
                    <th>{t('libDate')}</th>
                    <th className="num">{t('colValue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, MAX_ROWS).map((e) => (
                    <tr key={e.id} className={e.maybeFirstLogged ? 'first' : ''}>
                      <td>{e.species}{e.maybeFirstLogged ? ' ★' : ''}</td>
                      <td>{e.variant || '—'}</td>
                      <td>{e.system || '—'}</td>
                      <td>{e.body || '—'}</td>
                      <td>{e.timestamp ? new Date(e.timestamp).toLocaleDateString(locale) : '—'}</td>
                      <td className="num">{cr(e.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length > MAX_ROWS && (
              <div className="muted" style={{ marginTop: 8 }}>
                {t('libTruncated', MAX_ROWS, filtered.length)}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

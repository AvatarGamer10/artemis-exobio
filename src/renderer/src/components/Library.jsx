import React, { useMemo, useState } from 'react'
import { cr } from '../useArtemis.js'
import { IconLeaf, IconChart, IconSave } from '../Icons.jsx'

const MAX_ROWS = 200

export default function Library({ state, t, lang }) {
  const [query, setQuery] = useState('')
  const [csvMsg, setCsvMsg] = useState(null)

  const exportCsv = async () => {
    const r = await window.artemis.exportCsv()
    if (r?.ok) {
      setCsvMsg(t('libCsvOk', r.count))
      setTimeout(() => setCsvMsg(null), 3000)
    }
  }
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
                    <tr key={e.id} className={e.maybeFirstLogged || e.firstLoggedConfirmed ? 'first' : ''}>
                      <td>
                        <span className="species">{e.species}</span>
                        {e.firstLoggedConfirmed === true ? ' ✪' : e.maybeFirstLogged ? ' ★' : ''}
                      </td>
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
            <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="hud ghost" onClick={exportCsv}>
                <IconSave size={16} /> {t('libCsv')}
              </button>
              {csvMsg && <span className="v good">{csvMsg}</span>}
              <span className="muted">{t('libFirstNote')}</span>
            </div>
          </>
        )}
      </div>
    </>
  )
}

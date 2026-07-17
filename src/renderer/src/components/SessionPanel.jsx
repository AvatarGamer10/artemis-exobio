import React from 'react'
import { cr } from '../useArtemis.js'
import { IconChart, IconRadar } from '../Icons.jsx'

export default function SessionPanel({ state, t, lang }) {
  const s = state.session
  const locale = lang === 'en' ? 'en-GB' : 'es-ES'
  return (
    <>
      <div className="panel">
        <h2>
          <IconChart size={16} /> {t('sessTitle', new Date(s.startedAt).toLocaleTimeString(locale))}
        </h2>
        <div className="grid3">
          <div className="stat">
            <div className="n">{s.jumps}</div>
            <div className="l">{t('sessJumps')}</div>
          </div>
          <div className="stat">
            <div className="n">{s.distanceLy.toFixed(1)}</div>
            <div className="l">{t('sessLy')}</div>
          </div>
          <div className="stat">
            <div className="n">{s.bioBodiesVisited}</div>
            <div className="l">{t('sessBioVisited')}</div>
          </div>
          <div className="stat">
            <div className="n">{s.samplesCompleted}</div>
            <div className="l">{t('sessSpecies')}</div>
          </div>
          <div className="stat">
            <div className="n">{cr(s.creditsEarned)}</div>
            <div className="l">{t('sessSold')}</div>
          </div>
          <div className="stat">
            <div className="n">{cr(state.vaultTotal)}</div>
            <div className="l">{t('sessPending')}</div>
          </div>
          <div className="stat">
            <div className="n">{cr(s.valueSampled || 0)}</div>
            <div className="l">{t('sessValueSampled')}</div>
          </div>
          <div className="stat">
            <div className="n">
              {(() => {
                const hours = Math.max(0.05, (Date.now() - new Date(s.startedAt).getTime()) / 3600000)
                return s.valueSampled ? Math.round((s.valueSampled || 0) / hours / 1e6 * 10) / 10 + 'M' : '—'
              })()}
            </div>
            <div className="l">{t('sessPerHour')}</div>
          </div>
        </div>
      </div>
      {state.codexNew.length > 0 && (
        <div className="panel">
          <h2>
            <IconRadar size={16} /> {t('codexTitle')}
          </h2>
          <table>
            <thead>
              <tr>
                <th>{t('colEntry')}</th>
                <th>{t('colSystem')}</th>
                <th>{t('colRegion')}</th>
              </tr>
            </thead>
            <tbody>
              {state.codexNew.map((c, i) => (
                <tr key={i} className="first">
                  <td>★ {c.name}</td>
                  <td>{c.system}</td>
                  <td>{c.region || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

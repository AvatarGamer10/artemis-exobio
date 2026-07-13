import React from 'react'
import { cr } from '../useArtemis.js'
import { IconWallet, IconLeaf, IconTrash } from '../Icons.jsx'

export default function VaultPanel({ state, t }) {
  const vault = [...state.vault].reverse()
  return (
    <>
      <div className="panel">
        <h2>
          <IconWallet size={16} /> {t('vaultTitle')}
        </h2>
        <div className="grid2">
          <div className="stat">
            <div className="n">{vault.length}</div>
            <div className="l">{t('vaultSamples')}</div>
          </div>
          <div className="stat">
            <div className="n">{cr(state.vaultTotal)}</div>
            <div className="l">{t('vaultValue')}</div>
          </div>
        </div>
        <div className="muted" style={{ marginTop: 10 }}>
          {t('vaultDeathWarn')}
        </div>
      </div>
      <div className="panel">
        <h2>
          <IconLeaf size={16} /> {t('vaultDetail')}
        </h2>
        {vault.length === 0 ? (
          <div className="empty">
            <IconLeaf size={40} />
            <div>{t('vaultEmpty')}</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t('colSpecies')}</th>
                <th>{t('colVariant')}</th>
                <th>{t('colBody')}</th>
                <th className="num">{t('colValue')}</th>
              </tr>
            </thead>
            <tbody>
              {vault.map((v) => (
                <tr key={v.id} className={v.maybeFirstLogged ? 'first' : ''}>
                  <td>{v.species}{v.maybeFirstLogged ? ' ★' : ''}</td>
                  <td>{v.variant || '—'}</td>
                  <td>{v.body || '—'}</td>
                  <td className="num">{cr(v.value * (v.maybeFirstLogged ? 5 : 1))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {vault.length > 0 && (
          <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="hud danger" onClick={() => window.artemis.clearVault()}>
              <IconTrash size={17} /> {t('vaultClear')}
            </button>
            <span className="muted">{t('firstLogNote')}</span>
          </div>
        )}
      </div>
    </>
  )
}

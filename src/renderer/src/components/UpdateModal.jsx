import React, { useState } from 'react'
import { IconSync } from '../Icons.jsx'

// Aviso de nueva versión disponible en GitHub Releases.
export default function UpdateModal({ update, t }) {
  const [hidden, setHidden] = useState(false)
  if (!update?.available || hidden) return null

  const mb = update.size ? Math.round(update.size / 1048576) : null
  const busy = update.downloading

  return (
    <div className="onboard">
      <div className="ob-card">
        <div className="logo-big">
          <IconSync size={32} />
        </div>
        <h2>{t('updTitle', update.version)}</h2>
        <p>
          {t('updBody')}
          {mb ? ` (${mb} MB)` : ''}
        </p>
        {update.notes && (
          <p className="muted" style={{ maxHeight: 120, overflowY: 'auto', textAlign: 'left', whiteSpace: 'pre-wrap' }}>
            {update.notes.slice(0, 600)}
          </p>
        )}
        {busy && (
          <>
            <div className="bar-wrap" style={{ margin: '14px 0 6px' }}>
              <div className="bar" style={{ width: update.progress + '%' }} />
            </div>
            <p className="muted">{t('updDownloading', update.progress)}</p>
          </>
        )}
        {update.error && <p className="warn">⚠ {update.error}</p>}
        {!busy && (
          <div className="ob-nav">
            <button className="hud primary" onClick={() => window.artemis.updateDownload()}>
              {t('updNow')}
            </button>
            <button className="hud ghost" onClick={() => setHidden(true)}>
              {t('updLater')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

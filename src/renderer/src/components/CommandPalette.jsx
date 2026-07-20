import React, { useEffect, useMemo, useRef, useState } from 'react'

// Paleta de comandos (Ctrl+K): saltar a cualquier sección o lanzar una
// acción sin buscarla por el rail. Filtra por nombre y por atajo escrito.
export default function CommandPalette({ open, onClose, sections, actions, t }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef(null)

  const items = useMemo(() => {
    const all = [
      ...sections.map((s) => ({ ...s, kind: 'section' })),
      ...actions.map((a) => ({ ...a, kind: 'action' }))
    ]
    const needle = q.trim().toLowerCase()
    if (!needle) return all
    return all.filter((i) => i.label.toLowerCase().includes(needle))
  }, [q, sections, actions])

  useEffect(() => {
    if (open) {
      setQ('')
      setSel(0)
      setTimeout(() => inputRef.current?.focus(), 20)
    }
  }, [open])

  useEffect(() => {
    if (sel >= items.length) setSel(Math.max(0, items.length - 1))
  }, [items.length, sel])

  if (!open) return null

  const run = (item) => {
    onClose()
    item.run()
  }

  const onKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSel((n) => (n + 1) % Math.max(1, items.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSel((n) => (n - 1 + items.length) % Math.max(1, items.length))
    } else if (e.key === 'Enter' && items[sel]) {
      e.preventDefault()
      run(items[sel])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="cmdk-backdrop" onClick={onClose}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="cmdk-input"
          value={q}
          placeholder={t('cmdkPlaceholder')}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
        />
        <div className="cmdk-list">
          {items.length === 0 && <div className="cmdk-empty">{t('cmdkEmpty')}</div>}
          {items.map((item, i) => (
            <button
              key={item.kind + item.id}
              className={`cmdk-item ${i === sel ? 'sel' : ''}`}
              onMouseEnter={() => setSel(i)}
              onClick={() => run(item)}
              type="button"
            >
              <item.icon size={15} />
              <span>{item.label}</span>
              <span className="cmdk-kind">
                {item.kind === 'section' ? t('cmdkSection') : t('cmdkAction')}
              </span>
            </button>
          ))}
        </div>
        <div className="cmdk-foot">
          <span>↑↓ {t('cmdkNav')}</span>
          <span>↵ {t('cmdkOpen')}</span>
          <span>esc {t('cmdkClose')}</span>
        </div>
      </div>
    </div>
  )
}

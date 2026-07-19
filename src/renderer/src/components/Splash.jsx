import React, { useEffect, useState } from 'react'

// Pantalla de inicio: el instrumento se enciende. El arco de escaneo barre,
// la hoja se dibuja trazo a trazo y el nombre se abre. Clic o tecla la salta.
const STEPS = {
  es: ['Calibrando sensores', 'Leyendo el journal', 'Cargando catálogo de flora', 'Listo'],
  en: ['Calibrating sensors', 'Reading the journal', 'Loading flora catalog', 'Ready']
}

export default function Splash({ lang = 'es', onDone }) {
  const [step, setStep] = useState(0)
  const [out, setOut] = useState(false)
  const steps = STEPS[lang] || STEPS.es

  useEffect(() => {
    // ?splash=hold la deja fija para poder ajustar el diseño con calma
    if (window.location.search.includes('splash=hold')) {
      setStep(steps.length - 1)
      return
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const total = reduced ? 300 : 2900
    const ticks = steps.map((_, i) =>
      setTimeout(() => setStep(i), reduced ? 0 : 900 + i * 480)
    )
    const finish = setTimeout(() => setOut(true), total)
    const gone = setTimeout(onDone, total + (reduced ? 40 : 560))
    const skip = () => {
      setOut(true)
      setTimeout(onDone, 400)
    }
    window.addEventListener('keydown', skip, { once: true })
    return () => {
      ticks.forEach(clearTimeout)
      clearTimeout(finish)
      clearTimeout(gone)
      window.removeEventListener('keydown', skip)
    }
  }, [])

  const skipNow = () => {
    setOut(true)
    setTimeout(onDone, 400)
  }

  return (
    <div className={`splash ${out ? 'out' : ''}`} onClick={skipNow}>
      <div className="splash-inner">
        <svg className="splash-mark" viewBox="0 0 160 160" aria-hidden="true">
          <circle className="tick-ring" cx="80" cy="80" r="66" />
          <path className="scan" d="M 24 96 A 66 66 0 1 1 136 96" />
          <g className="leaf-fill">
            <path d="M80 34 C112 56 120 104 80 132 C48 100 56 56 80 34 Z" fill="url(#lg)" />
          </g>
          <path className="leaf-line" d="M80 34 C112 56 120 104 80 132 C48 100 56 56 80 34 Z" />
          <path className="vein" d="M80 46 C79 74 79 104 81 124" />
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="0.7" y2="1">
              <stop offset="0%" stopColor="#b2f7a6" />
              <stop offset="100%" stopColor="#2c9a4b" />
            </linearGradient>
          </defs>
        </svg>

        <div className="splash-word">ARTEMIS</div>
        <div className="splash-sub">
          {lang === 'en' ? 'Exobiology Companion' : 'Compañero de Exobiología'}
        </div>

        <div className="splash-line">
          <i />
        </div>
        <div className="splash-status">{steps[step]}</div>
      </div>
      <div className="splash-skip">
        {lang === 'en' ? 'click to skip' : 'clic para saltar'}
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { useT } from '../i18n.js'
import suitImg from '../assets/artemis-suit.webp'
import { IconLeaf, IconPlanet, IconEye, IconWallet, IconSync } from '../Icons.jsx'

const STEP_ICONS = [IconPlanet, IconEye, IconWallet, IconSync]

// Primer arranque: elegir idioma + mini tour de 4 pasos.
export default function Onboarding({ lang }) {
  const [step, setStep] = useState(0) // 0 = idioma, 1..4 = tour
  const t = useT(lang)
  const totalTour = 4

  const setLang = (l) => {
    window.artemis.setSettings({ lang: l })
    setStep(1)
  }
  const finish = () => window.artemis.setSettings({ onboarded: true })

  if (step === 0) {
    return (
      <div className="onboard">
        <div className="ob-card">
          {/* El traje de exploración que da nombre a la app */}
          <img className="ob-hero" src={suitImg} alt="" />
          <div className="logo-big">
            <IconLeaf size={34} />
          </div>
          <h2>{t('obWelcome')}</h2>
          <p>{t('obChooseLang')} / Choose your language</p>
          <div className="ob-langs">
            <button className="langbtn" onClick={() => setLang('es')}>
              🇪🇸 Español
            </button>
            <button className="langbtn" onClick={() => setLang('en')}>
              🇬🇧 English
            </button>
          </div>
        </div>
      </div>
    )
  }

  const Icon = STEP_ICONS[step - 1]
  return (
    <div className="onboard">
      <div className="ob-card">
        <div className="logo-big">
          <Icon size={32} />
        </div>
        <h2>{t(`obT${step}`)}</h2>
        <p>{t(`obD${step}`)}</p>
        <div className="ob-dots">
          {Array.from({ length: totalTour }).map((_, i) => (
            <span key={i} className={i === step - 1 ? 'on' : ''} />
          ))}
        </div>
        <div className="ob-nav">
          {step > 1 && (
            <button className="hud ghost" onClick={() => setStep(step - 1)}>
              {t('obBack')}
            </button>
          )}
          {step < totalTour ? (
            <button className="hud" onClick={() => setStep(step + 1)}>
              {t('obNext')}
            </button>
          ) : (
            <button className="hud" onClick={finish}>
              {t('obStart')}
            </button>
          )}
        </div>
        <button className="ob-skip" onClick={finish}>
          {t('obSkip')}
        </button>
      </div>
    </div>
  )
}

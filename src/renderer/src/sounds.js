// Alertas sonoras sintetizadas con Web Audio (sin archivos de audio).

let ctx = null
function audio() {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(freq, startIn, dur, vol, type = 'sine') {
  const ac = audio()
  const t0 = ac.currentTime + startIn
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gain).connect(ac.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

// kind: 'chime' (muestra completada), 'clear' (fuera del radio de colonia),
// 'jackpot' (premio gordo), 'warn' (aviso)
export function play(kind, volume = 0.5) {
  const v = Math.max(0, Math.min(1, volume)) * 0.5
  try {
    switch (kind) {
      case 'chime':
        tone(660, 0, 0.18, v)
        tone(880, 0.14, 0.28, v)
        break
      case 'clear':
        tone(1180, 0, 0.12, v * 0.8, 'triangle')
        break
      case 'jackpot':
        tone(523, 0, 0.16, v)
        tone(659, 0.12, 0.16, v)
        tone(784, 0.24, 0.16, v)
        tone(1047, 0.36, 0.4, v)
        break
      case 'warn':
        tone(240, 0, 0.22, v, 'square')
        tone(190, 0.26, 0.3, v, 'square')
        break
    }
  } catch {
    // sin audio disponible: silencio
  }
}

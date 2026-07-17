import { useEffect, useState } from 'react'

// Estado de ejemplo para abrir la UI en un navegador normal (sin Electron),
// útil para iterar sobre el diseño.
const DEMO_STATE = {
  commander: { name: 'Mayca', credits: 125000000 },
  system: { name: 'Prestige BIO-1', bodyCount: 9, scanned: 9, allBodiesFound: true },
  systemBodies: {
    0: { id: 0, name: 'Prestige BIO-1 A', star: 'K', planetClass: null, landable: false, distLs: 0 },
    2: { id: 2, name: 'Prestige BIO-1 b 1', star: null, planetClass: 'High metal content body', landable: false, distLs: 210 },
    7: { id: 7, name: 'Prestige BIO-1 c 3', star: null, planetClass: 'Rocky body', landable: true, distLs: 512 },
    8: { id: 8, name: 'Prestige BIO-1 c 4', star: null, planetClass: 'Icy body', landable: true, distLs: 534 },
    9: { id: 9, name: 'Prestige BIO-1 d 1', star: null, planetClass: 'Sudarsky class I gas giant', landable: false, distLs: 1310 }
  },
  bioBodies: {
    7: {
      id: 7,
      name: 'Prestige BIO-1 c 3',
      bioCount: 2,
      genuses: [
        { genus: 'g1', localised: 'Stratum', predGenus: 'Stratum', colonyRange: 500, completed: true },
        { genus: 'g2', localised: 'Bacterium', predGenus: 'Bacterium', colonyRange: 500, completed: false }
      ],
      scanInfo: {
        gravity: 0.27,
        tempK: 178,
        atmosphere: 'thin ammonia atmosphere',
        volcanism: '',
        planetClass: 'Rocky body'
      },
      predictions: [
        { species: 'Stratum Laminamus', genus: 'Stratum', value: 2788300 },
        { species: 'Bacterium Alcyoneum', genus: 'Bacterium', value: 1658500 },
        { species: 'Osseus Spiralis', genus: 'Osseus', value: 2404700 },
        { species: 'Tussock Catena', genus: 'Tussock', value: 1766600 }
      ]
    }
  },
  currentBodyName: 'Prestige BIO-1 c 3',
  sampling: {
    genusLocalised: 'Bacterium',
    species: 'Bacterium Informem',
    variant: 'Bacterium Informem - Ámbar',
    step: 2,
    colonyRange: 500,
    currentDist: 340,
    clear: false,
    isNewVariant: true,
    value: 8418000,
    lastSamplePos: { lat: 12.006, lon: -45.003 },
    samplePositions: [
      { lat: 12.0, lon: -45.0 },
      { lat: 12.006, lon: -45.003 }
    ]
  },
  trail: [
    { lat: 11.998, lon: -45.001 },
    { lat: 12.0, lon: -45.0 },
    { lat: 12.002, lon: -45.0005 },
    { lat: 12.004, lon: -45.002 },
    { lat: 12.006, lon: -45.003 },
    { lat: 12.0075, lon: -45.0045 },
    { lat: 12.0085, lon: -45.006 }
  ],
  vault: [
    {
      id: '1',
      species: 'Stratum Tectonicas',
      variant: 'Stratum Tectonicas - Verde',
      body: 'Prestige BIO-1 c 3',
      value: 19010800,
      maybeFirstLogged: true
    }
  ],
  vaultTotal: 95054000,
  library: [
    {
      id: 'L1',
      species: 'Stratum Tectonicas',
      variant: 'Stratum Tectonicas - Verde',
      genus: 'Stratum',
      system: 'Prestige BIO-1',
      body: 'Prestige BIO-1 c 3',
      value: 19010800,
      maybeFirstLogged: true,
      timestamp: '2026-07-10T18:00:00Z'
    },
    {
      id: 'L2',
      species: 'Fungoida Setisis',
      variant: 'Fungoida Setisis - Ámbar',
      genus: 'Fungoida',
      system: 'Synuefe XR-H d11-102',
      body: 'C 2',
      value: 1670100,
      maybeFirstLogged: false,
      timestamp: '2026-07-08T21:30:00Z'
    }
  ],
  session: {
    startedAt: new Date().toISOString(),
    jumps: 14,
    distanceLy: 512.4,
    bioBodiesVisited: 3,
    samplesCompleted: 5,
    creditsEarned: 42000000
  },
  status: {
    lowFuel: false,
    bodyName: 'Prestige BIO-1 c 3',
    lat: 12.0085,
    lon: -45.006,
    planetRadius: 2900000,
    heading: 205
  },
  codexNew: [
    { name: 'Stratum Tectonicas - Verde', system: 'Prestige BIO-1', region: 'Inner Orion Spur' }
  ],
  inara: null,
  settings: {
    journalDir: 'C:\\…\\Elite Dangerous',
    inaraKey: '',
    hasInaraKey: false,
    cmdrName: 'Mayca',
    lang: 'es',
    theme: null,
    discord: { enabled: true, hasWebhook: false, webhook: '' },
    sounds: { enabled: true, volume: 0.5 },
    notify: { enabled: true },
    // con ?tour en la URL se previsualiza el asistente de primer arranque
    onboarded: !window.location.search.includes('tour')
  },
  overlay: { visible: true, clickThrough: false },
  watcherError: null,
  appVersion: '0.7.0',
  ship: { type: 'Krait Phantom', name: 'Perseverance', ident: 'MAY-01', maxJumpRange: 68.42, cargo: 32 },
  route: {
    dest: 'Colonia',
    index: 1,
    source: 'spansh',
    systems: [
      { system: 'Prestige BIO-1', neutron: false, dist: 0 },
      { system: 'Synuefe XR-H d11-102', neutron: false, dist: 61.3 },
      { system: 'Praea Euq HW-W d1-52', neutron: true, dist: 268.9 },
      { system: 'Colonia', neutron: false, dist: 65.2 }
    ]
  },
  // con ?update en la URL se previsualiza el aviso de actualización
  update: {
    available: window.location.search.includes('update'),
    version: '9.9.9',
    notes: '- Novedades de ejemplo\n- Otra mejora',
    size: 82385128,
    downloading: false,
    progress: 0,
    error: null
  },
  external: {
    system: 'Prestige BIO-1',
    loading: false,
    edsm: { ok: true, known: false, bodyCount: 0 },
    canonn: {
      ok: true,
      bioSignals: [{ body: 'c 3', hud_category: 'Biology', count: 2 }],
      bioCodex: [{ name: 'Stratum Tectonicas - Green', body: 'c 3' }]
    }
  }
}

// Stub para abrir la UI en un navegador normal: los botones no hacen nada
// pero tampoco rompen.
const isDemo = !window.artemis
if (isDemo) {
  window.artemis = new Proxy({}, { get: () => async () => {} })
}

export function useArtemis() {
  const [state, setState] = useState(isDemo ? DEMO_STATE : null)
  useEffect(() => {
    if (isDemo) return
    let alive = true
    window.artemis.getState().then((s) => alive && setState(s))
    const off = window.artemis.onState((s) => alive && setState(s))
    return () => {
      alive = false
      off()
    }
  }, [])
  return state
}

export const cr = (n) =>
  n == null ? '—' : new Intl.NumberFormat('es-ES').format(Math.round(n)) + ' cr'

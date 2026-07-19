// Simulador de journal de Elite Dangerous para probar Artemis sin el juego.
// Escribe eventos en ./sim-journal — apunta la app a esa carpeta en AJUSTES.
import fs from 'node:fs'
import path from 'node:path'

const DIR = path.resolve('sim-journal')
fs.mkdirSync(DIR, { recursive: true })
const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)
const JOURNAL = path.join(DIR, `Journal.${stamp}.01.log`)

const now = () => new Date().toISOString()
const write = (ev) => {
  fs.appendFileSync(JOURNAL, JSON.stringify({ timestamp: now(), ...ev }) + '\n')
  console.log('journal →', ev.event, ev.ScanType || ev.BodyName || ev.StarSystem || '')
}
let lat = 12.0
let lon = -45.0
const status = (extra = {}) => {
  const st = {
    timestamp: now(),
    event: 'Status',
    Flags: 0,
    Flags2: 1, // OnFoot
    Latitude: lat,
    Longitude: lon,
    Altitude: 0,
    BodyName: 'Prestige BIO-1 c 3',
    PlanetRadius: 2900000,
    ...extra
  }
  fs.writeFileSync(path.join(DIR, 'Status.json'), JSON.stringify(st))
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const BIO_SIG = { Type: '$SAA_SignalType_Biological;', Type_Localised: 'Biológica', Count: 2 }

async function main() {
  console.log('Simulando en:', DIR, '\n')
  write({ event: 'Commander', Name: 'Mayca', FID: 'F000000' })
  write({ event: 'LoadGame', Commander: 'Mayca', Credits: 125000000, Ship: 'Krait Phantom' })
  await sleep(1200)

  write({ event: 'FSDJump', StarSystem: 'Prestige BIO-1', SystemAddress: 999, JumpDist: 42.3 })
  await sleep(1200)
  write({ event: 'FSSDiscoveryScan', BodyCount: 9, Progress: 1 })
  await sleep(800)
  write({
    event: 'Scan', ScanType: 'Detailed', BodyName: 'Prestige BIO-1 c 3', BodyID: 7,
    Landable: true, SurfaceGravity: 2.65, SurfaceTemperature: 178,
    Atmosphere: 'thin ammonia atmosphere', AtmosphereType: 'Ammonia',
    Volcanism: '', PlanetClass: 'Rocky body', DistanceFromArrivalLS: 512
  })
  write({
    event: 'FSSBodySignalDiscovered', BodyName: 'Prestige BIO-1 c 3', BodyID: 7,
    Signals: [BIO_SIG]
  })
  await sleep(1500)
  write({
    event: 'SAASignalsFound', BodyName: 'Prestige BIO-1 c 3', BodyID: 7,
    Signals: [BIO_SIG],
    Genuses: [
      { Genus: '$Codex_Ent_Stratum_Genus_Name;', Genus_Localised: 'Stratum' },
      { Genus: '$Codex_Ent_Bacterial_Genus_Name;', Genus_Localised: 'Bacterium' }
    ]
  })
  await sleep(1500)
  write({ event: 'ApproachBody', StarSystem: 'Prestige BIO-1', Body: 'Prestige BIO-1 c 3', BodyID: 7 })
  status()
  await sleep(1000)
  write({ event: 'Disembark', OnPlanet: true, Body: 'Prestige BIO-1 c 3' })
  status()
  await sleep(1500)

  // Muestra 1/3 de Stratum Tectonicas
  const organic = (scanType) => ({
    event: 'ScanOrganic', ScanType: scanType, SystemAddress: 999, Body: 7,
    Genus: '$Codex_Ent_Stratum_Genus_Name;', Genus_Localised: 'Stratum',
    Species: '$Codex_Ent_Stratum_07_Name;', Species_Localised: 'Stratum Tectonicas',
    Variant: '$Codex_Ent_Stratum_07_TTS_Name;', Variant_Localised: 'Stratum Tectonicas - Verde'
  })
  write(organic('Log'))
  console.log('  … caminando (ver barra de distancia en el overlay)')
  // Caminar ~600 m (Stratum requiere 500 m): en este radio, 0.012° ≈ 600 m
  for (let i = 0; i < 12; i++) {
    lat += 0.001
    status()
    await sleep(900)
  }
  write(organic('Sample'))
  console.log('  … caminando otra vez')
  for (let i = 0; i < 12; i++) {
    lon += 0.001
    status()
    await sleep(900)
  }
  write(organic('Sample'))
  await sleep(800)
  write(organic('Analyse'))
  console.log('\n✓ Stratum Tectonicas completado (~19M cr) — mira la CARTERA')
  await sleep(2000)

  write({ event: 'Embark', OnPlanet: true })
  write({ event: 'LeaveBody', StarSystem: 'Prestige BIO-1', Body: 'Prestige BIO-1 c 3' })
  await sleep(1500)
  write({ event: 'Shutdown' })
  console.log('\nSimulación terminada (con Shutdown: dispara resumen de sesión + Discord).')
}

main()

// Estado del juego reconstruido a partir de los eventos del journal.
// Un único objeto que se difunde entero a los renderers en cada cambio.

import { getSpeciesValue, getColonyRange, surfaceDistance } from './exobio.js'
import { predictSpecies, genusFromCodex } from './predict.js'

const SCAN_STEP = { Log: 1, Sample: 2, Analyse: 3 }

export function createGameState(persisted = {}) {
  return {
    commander: { name: persisted.cmdrName || null, credits: null },
    system: { name: null, bodyCount: null, scanned: 0, allBodiesFound: false },
    // Todos los cuerpos escaneados del sistema (para el mapa), por BodyID
    systemBodies: {},
    // Cuerpos con señales biológicas del sistema actual, por BodyID
    bioBodies: {},
    currentBodyId: null,
    currentBodyName: null,
    onFoot: false,
    // Muestreo activo
    sampling: null, // { genus, genusLocalised, species, variant, step, colonyRange, lastSamplePos, currentDist, clear }
    // Cartera: muestras completadas sin vender
    vault: persisted.vault || [], // { id, species, variant, genus, body, system, value, maybeFirstLogged, timestamp }
    // Biblioteca: registro permanente de todo lo muestreado (no se vacía al vender)
    library: persisted.library || [],
    // Nave actual (del evento Loadout) y ruta activa (Spansh o importada)
    ship: null,
    shipRaw: null, // Loadout completo para exportar como SLEF; se excluye del snapshot
    route: persisted.route || null, // { systems: [{system, neutron, dist}], index, dest }
    session: {
      startedAt: new Date().toISOString(),
      jumps: 0,
      distanceLy: 0,
      bioBodiesVisited: 0,
      samplesCompleted: 0,
      creditsEarned: 0
    },
    status: { lat: null, lon: null, planetRadius: null, bodyName: null, lowFuel: false },
    codexNew: [], // entradas nuevas de esta sesión
    inara: null,
    lastEventAt: null
  }
}

export function vaultValue(state) {
  return state.vault.reduce((s, v) => s + v.value * (v.maybeFirstLogged ? 5 : 1), 0)
}

function bioBody(state, bodyId, bodyName) {
  if (!state.bioBodies[bodyId]) {
    state.bioBodies[bodyId] = {
      id: bodyId,
      name: bodyName,
      bioCount: 0,
      genuses: [], // { genus, localised, colonyRange, completed }
      scanInfo: null
    }
  }
  if (bodyName) state.bioBodies[bodyId].name = bodyName
  return state.bioBodies[bodyId]
}

function markGenusCompleted(state, bodyName, genusLocalised) {
  const body = Object.values(state.bioBodies).find((b) => b.name === bodyName)
  if (!body) return
  const g = body.genuses.find((g) => g.localised === genusLocalised)
  if (g) g.completed = true
}

// Devuelve true si el evento cambió el estado (para saber si re-difundir).
export function applyJournalEvent(state, ev, { live } = { live: true }) {
  const t = ev.event
  state.lastEventAt = ev.timestamp

  switch (t) {
    case 'Commander':
      state.commander.name = ev.Name
      return true
    case 'LoadGame':
      state.commander.name = ev.Commander ?? state.commander.name
      state.commander.credits = ev.Credits ?? state.commander.credits
      return true

    case 'Location':
      state.system.name = ev.StarSystem
      return true

    case 'Loadout':
      state.ship = {
        type: ev.Ship_Localised || ev.Ship || null,
        name: ev.ShipName || null,
        ident: ev.ShipIdent || null,
        maxJumpRange: ev.MaxJumpRange != null ? +ev.MaxJumpRange.toFixed(2) : null,
        cargo: ev.CargoCapacity ?? null
      }
      state.shipRaw = ev
      return true

    case 'FSDJump':
      // Seguimiento de ruta: al llegar a un waypoint, avanza el índice
      if (state.route?.systems) {
        const i = state.route.systems.findIndex(
          (s) => s.system.toLowerCase() === (ev.StarSystem || '').toLowerCase()
        )
        if (i >= 0) state.route.index = Math.max(state.route.index, i)
      }
      state.system = { name: ev.StarSystem, bodyCount: null, scanned: 0, allBodiesFound: false }
      state.systemBodies = {}
      state.bioBodies = {}
      state.currentBodyId = null
      state.currentBodyName = null
      state.sampling = null
      if (live) {
        state.session.jumps += 1
        state.session.distanceLy += ev.JumpDist || 0
      }
      return true

    case 'FSSDiscoveryScan':
      state.system.bodyCount = ev.BodyCount
      return true

    case 'FSSAllBodiesFound':
      state.system.allBodiesFound = true
      return true

    case 'Scan': {
      if (live) state.system.scanned += 1
      // Para el mapa del sistema: estrellas y planetas (los cinturones no traen clase)
      if (ev.StarType || ev.PlanetClass) {
        state.systemBodies[ev.BodyID] = {
          id: ev.BodyID,
          name: ev.BodyName,
          star: ev.StarType || null,
          planetClass: ev.PlanetClass || null,
          landable: !!ev.Landable,
          distLs: ev.DistanceFromArrivalLS ?? 0
        }
      }
      // Guardamos condiciones físicas por si el cuerpo tiene bio
      if (ev.Landable) {
        const b = bioBody(state, ev.BodyID, ev.BodyName)
        b.scanInfo = {
          gravity: ev.SurfaceGravity != null ? +(ev.SurfaceGravity / 9.81).toFixed(2) : null,
          tempK: ev.SurfaceTemperature != null ? Math.round(ev.SurfaceTemperature) : null,
          atmosphere: ev.Atmosphere || '',
          volcanism: ev.Volcanism || '',
          planetClass: ev.PlanetClass || null
        }
        b.predictions = predictSpecies({
          atmosphereType: ev.AtmosphereType || null,
          tempK: ev.SurfaceTemperature ?? null,
          gravity: ev.SurfaceGravity != null ? ev.SurfaceGravity / 9.81 : null,
          planetClass: ev.PlanetClass,
          volcanism: ev.Volcanism,
          distLs: ev.DistanceFromArrivalLS
        })
      }
      return true
    }

    case 'FSSBodySignals':
    case 'FSSBodySignalDiscovered': {
      const bio = (ev.Signals || []).find((s) => s.Type === '$SAA_SignalType_Biological;')
      if (bio) {
        const b = bioBody(state, ev.BodyID, ev.BodyName)
        b.bioCount = Math.max(b.bioCount, bio.Count)
      }
      return !!bio
    }

    case 'SAASignalsFound': {
      const bio = (ev.Signals || []).find((s) => s.Type === '$SAA_SignalType_Biological;')
      if (!bio && !(ev.Genuses || []).length) return false
      const b = bioBody(state, ev.BodyID, ev.BodyName)
      if (bio) b.bioCount = Math.max(b.bioCount, bio.Count)
      for (const g of ev.Genuses || []) {
        if (!b.genuses.some((x) => x.genus === g.Genus)) {
          const predGenus = genusFromCodex(g.Genus, g.Genus_Localised)
          b.genuses.push({
            genus: g.Genus,
            localised: g.Genus_Localised || g.Genus,
            predGenus,
            colonyRange: getColonyRange(g.Genus_Localised || predGenus || ''),
            completed: false
          })
        }
      }
      return true
    }

    case 'ApproachBody':
      state.currentBodyId = ev.BodyID
      state.currentBodyName = ev.Body
      if (live && state.bioBodies[ev.BodyID]) state.session.bioBodiesVisited += 1
      return true

    case 'LeaveBody':
      state.currentBodyId = null
      state.currentBodyName = null
      state.sampling = null
      return true

    case 'Disembark':
      state.onFoot = true
      return true
    case 'Embark':
      state.onFoot = false
      return true

    case 'ScanOrganic': {
      const step = SCAN_STEP[ev.ScanType] ?? 1
      const genusLoc = ev.Genus_Localised || ev.Genus
      const speciesLoc = ev.Species_Localised || ev.Species
      const variantLoc = ev.Variant_Localised || ev.Variant || null

      if (ev.ScanType === 'Analyse') {
        // Muestra completa → a la cartera
        const value = getSpeciesValue(speciesLoc, genusLoc)
        const id = `${ev.timestamp}|${speciesLoc}`
        // El Genetic Sampler no permite llevar la misma especie dos veces sin vender:
        // deduplicar también protege contra catch-ups repetidos del journal.
        const dup = state.vault.some(
          (v) => v.id === id || (v.species === speciesLoc && v.variant === variantLoc)
        )
        if (!dup) {
          const sample = {
            id,
            species: speciesLoc,
            variant: variantLoc,
            genus: genusLoc,
            body: state.currentBodyName,
            system: state.system.name,
            value,
            maybeFirstLogged: state.codexNew.some((c) => c.name === variantLoc),
            timestamp: ev.timestamp
          }
          state.vault.push(sample)
          if (!state.library.some((l) => l.id === id)) state.library.push({ ...sample })
          if (live) state.session.samplesCompleted += 1
        }
        markGenusCompleted(state, state.currentBodyName, genusLoc)
        state.sampling = null
        return true
      }

      // Log (1/3) o Sample (2/3): si cambia la especie se reinicia el progreso
      const pos =
        state.status.lat != null
          ? { lat: state.status.lat, lon: state.status.lon }
          : null
      if (!state.sampling || state.sampling.species !== speciesLoc) {
        state.sampling = {
          genus: ev.Genus,
          genusLocalised: genusLoc,
          species: speciesLoc,
          variant: variantLoc,
          step,
          colonyRange: getColonyRange(genusLoc),
          lastSamplePos: pos,
          currentDist: 0,
          clear: false,
          value: getSpeciesValue(speciesLoc, genusLoc)
        }
      } else {
        state.sampling.step = Math.max(state.sampling.step, step)
        state.sampling.lastSamplePos = pos
        state.sampling.currentDist = 0
        state.sampling.clear = false
      }
      return true
    }

    case 'SellOrganicData': {
      const soldSpecies = new Set(
        (ev.BioData || []).map((b) => b.Species_Localised || b.Species)
      )
      state.vault = state.vault.filter((v) => !soldSpecies.has(v.species))
      if (live) {
        const earned = (ev.BioData || []).reduce(
          (s, b) => s + (b.Value || 0) + (b.Bonus || 0),
          0
        )
        state.session.creditsEarned += earned
      }
      return true
    }

    case 'Died':
      // Al morir se pierden los datos biológicos no vendidos
      state.vault = []
      state.sampling = null
      return true

    case 'CodexEntry':
      if (ev.IsNewEntry && ev.SubCategory === '$Codex_SubCategory_Organic_Structures;') {
        state.codexNew.push({
          name: ev.Name_Localised || ev.Name,
          region: ev.Region_Localised || null,
          system: ev.System,
          timestamp: ev.timestamp
        })
        return true
      }
      return false

    default:
      return false
  }
}

// Actualización desde Status.json (posición, fuel, a pie o no)
export function applyStatus(state, st) {
  if (!st) return false
  let changed = false
  const flags2 = st.Flags2 || 0
  const onFoot = !!(flags2 & 1)
  if (onFoot !== state.onFoot) {
    state.onFoot = onFoot
    changed = true
  }
  const lowFuel = !!((st.Flags || 0) & (1 << 19))
  if (lowFuel !== state.status.lowFuel) {
    state.status.lowFuel = lowFuel
    changed = true
  }
  if (st.Latitude != null && st.Longitude != null) {
    state.status.lat = st.Latitude
    state.status.lon = st.Longitude
    state.status.planetRadius = st.PlanetRadius ?? state.status.planetRadius
    state.status.bodyName = st.BodyName ?? state.status.bodyName
    changed = true
    // Distancia de colonia respecto a la última muestra
    if (state.sampling?.lastSamplePos && state.status.planetRadius) {
      const d = surfaceDistance(
        state.sampling.lastSamplePos,
        { lat: st.Latitude, lon: st.Longitude },
        state.status.planetRadius
      )
      if (d != null) {
        state.sampling.currentDist = Math.round(d)
        state.sampling.clear =
          state.sampling.colonyRange != null && d >= state.sampling.colonyRange
      }
    }
  }
  return changed
}

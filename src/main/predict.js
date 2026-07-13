// Motor de predicción de especies: reglas de condiciones (datos de la
// comunidad, estilo Canonn/Bioforge) evaluadas contra el Scan del cuerpo.
// Los umbrales llevan un margen pequeño: es una estimación, no un oráculo.

import { SPECIES_VALUES } from './exobio.js'

// Abreviaturas de atmósferas (AtmosphereType del journal)
const CO2 = ['CarbonDioxide', 'CarbonDioxideRich']
const AMM = ['Ammonia']
const AR = ['Argon']
const ARR = ['ArgonRich']
const NE = ['Neon', 'NeonRich']
const MET = ['Methane', 'MethaneRich']
const N2 = ['Nitrogen']
const O2 = ['Oxygen']
const SO2 = ['SulphurDioxide']
const H2O = ['Water', 'WaterRich']

const ROCKY = ['rocky']
const HMC = ['hmc']
const RH = ['rocky', 'hmc']
const ICY = ['icy', 'rockyice']

// Familias de vulcanismo (substring sobre el campo Volcanism)
const V_WATER = ['water']
const V_CARBON = ['carbon', 'methane']
const V_NITRO = ['nitrogen', 'ammonia']
const V_ROCK = ['silicate', 'iron', 'rocky', 'metallic']

const S = (species, def) => ({ species, genus: species.split(' ')[0], ...def })

// gMax por defecto: 0.28 g (la mayoría de flora requiere ≤0.27)
const RULES = [
  // ── Aleoida (rocosos/HMC) ──
  S('Aleoida Arcus', { atmo: CO2, tMin: 173, tMax: 181, pc: RH }),
  S('Aleoida Coronamus', { atmo: CO2, tMin: 179, tMax: 191, pc: RH }),
  S('Aleoida Gravis', { atmo: CO2, tMin: 189, tMax: 197, pc: RH }),
  S('Aleoida Laminiae', { atmo: AMM, pc: RH }),
  S('Aleoida Spica', { atmo: AMM, pc: RH }),

  // ── Bacterium (tolera hasta ~0.61 g) ──
  S('Bacterium Acies', { atmo: NE, gMax: 0.61 }),
  S('Bacterium Alcyoneum', { atmo: AMM, gMax: 0.61 }),
  S('Bacterium Aurasus', { atmo: CO2, gMax: 0.61 }),
  S('Bacterium Bullaris', { atmo: MET, gMax: 0.61 }),
  S('Bacterium Cerbrus', { atmo: [...H2O, ...SO2], gMax: 0.61 }),
  S('Bacterium Informem', { atmo: N2, gMax: 0.61 }),
  S('Bacterium Nebulus', { atmo: ['Helium'], gMax: 0.61 }),
  S('Bacterium Omentum', { atmo: NE, volc: V_NITRO, gMax: 0.61 }),
  S('Bacterium Scopulum', { atmo: NE, volc: V_CARBON, gMax: 0.61 }),
  S('Bacterium Tela', { volc: [...V_ROCK, 'helium'], gMax: 0.61 }),
  S('Bacterium Verrata', { atmo: [...NE, ...H2O, ...AMM], volc: V_WATER, gMax: 0.61 }),
  S('Bacterium Vesicula', { atmo: [...AR, ...ARR], gMax: 0.61 }),
  S('Bacterium Volu', { atmo: O2, tMin: 143, tMax: 248, gMax: 0.61 }),

  // ── Cactoida (rocosos/HMC) ──
  S('Cactoida Cortexum', { atmo: CO2, tMin: 178, tMax: 197, pc: RH }),
  S('Cactoida Lapis', { atmo: AMM, pc: RH }),
  S('Cactoida Peperatis', { atmo: AMM, pc: RH }),
  S('Cactoida Pullulanta', { atmo: CO2, tMin: 178, tMax: 197, pc: RH }),
  S('Cactoida Vermis', { atmo: [...H2O, ...SO2], pc: RH }),

  // ── Clypeus (CO2/Agua, ≥190 K) ──
  S('Clypeus Lacrimam', { atmo: [...CO2, ...H2O], tMin: 188, pc: ROCKY }),
  S('Clypeus Margaritus', { atmo: [...CO2, ...H2O], tMin: 188, pc: HMC }),
  S('Clypeus Speculumi', { atmo: [...CO2, ...H2O], tMin: 188, pc: ROCKY, minDistLs: 2500 }),

  // ── Concha ──
  S('Concha Aureolas', { atmo: AMM }),
  S('Concha Biconcavis', { atmo: N2 }),
  S('Concha Labiata', { atmo: CO2, tMax: 199 }),
  S('Concha Renibus', { atmo: [...H2O, ...CO2, ...SO2], pc: RH }),

  // ── Electricae (helados, atmósferas nobles) ──
  S('Electricae Pluma', { atmo: [...NE, ...AR, ...ARR, 'Helium'], pc: ICY }),
  S('Electricae Radialem', { atmo: [...NE, ...AR, ...ARR, 'Helium'], pc: ICY }),

  // ── Fonticulua (helados) ──
  S('Fonticulua Campestris', { atmo: AR, pc: ICY }),
  S('Fonticulua Digitos', { atmo: MET, pc: ICY }),
  S('Fonticulua Fluctus', { atmo: O2, pc: ICY }),
  S('Fonticulua Lapida', { atmo: N2, pc: ICY }),
  S('Fonticulua Segmentatus', { atmo: NE, pc: ICY }),
  S('Fonticulua Upupam', { atmo: ARR, pc: ICY }),

  // ── Frutexa (rocosos/HMC) ──
  S('Frutexa Acus', { atmo: CO2, tMax: 197, pc: ROCKY }),
  S('Frutexa Collum', { atmo: SO2, pc: ROCKY }),
  S('Frutexa Fera', { atmo: CO2, tMax: 197, pc: ROCKY }),
  S('Frutexa Flabellum', { atmo: AMM, pc: ROCKY }),
  S('Frutexa Flammasis', { atmo: AMM, pc: ROCKY }),
  S('Frutexa Metallicum', { atmo: [...CO2, ...AMM], tMax: 197, pc: HMC }),
  S('Frutexa Sponsae', { atmo: H2O, pc: ROCKY }),

  // ── Fumerola (requiere vulcanismo) ──
  S('Fumerola Aquatis', { volc: V_WATER }),
  S('Fumerola Carbosis', { volc: V_CARBON }),
  S('Fumerola Extremus', { volc: V_ROCK }),
  S('Fumerola Nitris', { volc: V_NITRO }),

  // ── Fungoida ──
  S('Fungoida Bullarum', { atmo: [...AR, ...ARR] }),
  S('Fungoida Gelata', { atmo: [...CO2, ...H2O], tMin: 178, tMax: 197 }),
  S('Fungoida Setisis', { atmo: [...AMM, ...MET] }),
  S('Fungoida Stabitis', { atmo: [...CO2, ...H2O], tMin: 178, tMax: 197 }),

  // ── Osseus ──
  S('Osseus Cornibus', { atmo: CO2, tMin: 178, tMax: 197 }),
  S('Osseus Discus', { atmo: H2O }),
  S('Osseus Fractus', { atmo: CO2, tMin: 178, tMax: 192 }),
  S('Osseus Pellebantus', { atmo: CO2, tMin: 188, tMax: 197 }),
  S('Osseus Pumice', { atmo: [...AR, ...ARR, ...MET, ...N2], pc: ICY }),
  S('Osseus Spiralis', { atmo: AMM }),

  // ── Recepta (SO2) ──
  S('Recepta Conditivus', { atmo: SO2, pc: ICY }),
  S('Recepta Deltahedronix', { atmo: SO2, pc: RH }),
  S('Recepta Umbrux', { atmo: SO2 }),

  // ── Stratum (tolera hasta ~0.6 g; Tectonicas es el único en HMC) ──
  S('Stratum Araneamus', { atmo: SO2, tMin: 163, pc: ROCKY, gMax: 0.61 }),
  S('Stratum Cucumisis', { atmo: [...SO2, ...CO2], tMin: 188, pc: ROCKY, gMax: 0.61 }),
  S('Stratum Excutitus', { atmo: [...SO2, ...CO2], tMin: 163, tMax: 192, pc: ROCKY, gMax: 0.61 }),
  S('Stratum Frigus', { atmo: [...SO2, ...CO2], tMin: 188, pc: ROCKY, gMax: 0.61 }),
  S('Stratum Laminamus', { atmo: AMM, tMin: 163, pc: ROCKY, gMax: 0.61 }),
  S('Stratum Limaxus', { atmo: [...SO2, ...CO2], tMin: 163, tMax: 192, pc: ROCKY, gMax: 0.61 }),
  S('Stratum Paleas', { atmo: [...AMM, ...H2O, ...CO2], tMin: 163, pc: ROCKY, gMax: 0.61 }),
  S('Stratum Tectonicas', { atmo: [...SO2, ...CO2, ...AMM, ...H2O, ...O2], tMin: 163, pc: HMC, gMax: 0.61 }),

  // ── Tubus (rocosos, gravedad muy baja ≤0.15) ──
  S('Tubus Cavas', { atmo: CO2, tMin: 158, tMax: 197, pc: ROCKY, gMax: 0.16 }),
  S('Tubus Compagibus', { atmo: CO2, tMin: 158, tMax: 197, pc: ROCKY, gMax: 0.16 }),
  S('Tubus Conifer', { atmo: CO2, tMin: 158, tMax: 197, pc: ROCKY, gMax: 0.16 }),
  S('Tubus Rosarium', { atmo: AMM, pc: ROCKY, gMax: 0.16 }),
  S('Tubus Sororibus', { atmo: [...CO2, ...AMM], tMin: 158, tMax: 197, pc: HMC, gMax: 0.16 }),

  // ── Tussock (rocosos) ──
  S('Tussock Albata', { atmo: CO2, tMin: 173, tMax: 182, pc: ROCKY }),
  S('Tussock Capillum', { atmo: [...AR, ...MET], pc: ['rocky', 'rockyice'] }),
  S('Tussock Caputus', { atmo: CO2, tMin: 178, tMax: 192, pc: ROCKY }),
  S('Tussock Catena', { atmo: AMM, pc: ROCKY }),
  S('Tussock Cultro', { atmo: AMM, pc: ROCKY }),
  S('Tussock Divisa', { atmo: AMM, pc: ROCKY }),
  S('Tussock Ignis', { atmo: CO2, tMin: 158, tMax: 172, pc: ROCKY }),
  S('Tussock Pennata', { atmo: CO2, tMin: 143, tMax: 157, pc: ROCKY }),
  S('Tussock Pennatis', { atmo: CO2, tMax: 197, pc: ROCKY }),
  S('Tussock Propagito', { atmo: CO2, tMax: 197, pc: ROCKY }),
  S('Tussock Serrati', { atmo: CO2, tMin: 168, tMax: 177, pc: ROCKY }),
  S('Tussock Stigmasis', { atmo: SO2, pc: ROCKY }),
  S('Tussock Triticum', { atmo: CO2, tMin: 188, tMax: 197, pc: ROCKY }),
  S('Tussock Ventusa', { atmo: CO2, tMin: 153, tMax: 162, pc: ROCKY }),
  S('Tussock Virgam', { atmo: H2O, pc: ROCKY })
]

function classOf(planetClass) {
  const p = (planetClass || '').toLowerCase()
  if (p.includes('rocky ice')) return 'rockyice'
  if (p.includes('rocky')) return 'rocky'
  if (p.includes('metal')) return 'hmc'
  if (p.includes('icy')) return 'icy'
  return null
}

// c: { atmosphereType, tempK, gravity (g), planetClass, volcanism, distLs }
export function predictSpecies(c) {
  if (!c || !c.atmosphereType || c.atmosphereType === 'None') return []
  const pc = classOf(c.planetClass)
  const volc = (c.volcanism || '').toLowerCase()
  return RULES.filter((r) => {
    if (c.gravity != null && c.gravity > (r.gMax ?? 0.28)) return false
    if (r.atmo && !r.atmo.includes(c.atmosphereType)) return false
    if (r.tMin != null && c.tempK != null && c.tempK < r.tMin) return false
    if (r.tMax != null && c.tempK != null && c.tempK > r.tMax) return false
    if (r.pc && pc && !r.pc.includes(pc)) return false
    if (r.volc && !r.volc.some((v) => volc.includes(v))) return false
    if (r.minDistLs && (c.distLs ?? 0) < r.minDistLs) return false
    return true
  })
    .map((r) => ({
      species: r.species,
      genus: r.genus,
      value: SPECIES_VALUES[r.species] ?? 1000000
    }))
    .sort((a, b) => b.value - a.value)
}

// Mapa clave del codex → género de predicción (para filtrar tras el DSS)
export const CODEX_GENUS = {
  Aleoids: 'Aleoida',
  Bacterial: 'Bacterium',
  Cactoid: 'Cactoida',
  Clypeus: 'Clypeus',
  Conchas: 'Concha',
  Electricae: 'Electricae',
  Fonticulus: 'Fonticulua',
  Shrubs: 'Frutexa',
  Fumerolas: 'Fumerola',
  Fungoids: 'Fungoida',
  Osseus: 'Osseus',
  Recepta: 'Recepta',
  Stratum: 'Stratum',
  Tubus: 'Tubus',
  Tussocks: 'Tussock'
}

export function genusFromCodex(genusId, localised) {
  const m = /\$Codex_Ent_(\w+?)_Genus_Name;/.exec(genusId || '')
  return (m && CODEX_GENUS[m[1]]) || localised || null
}

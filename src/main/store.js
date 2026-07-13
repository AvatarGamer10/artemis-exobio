// Persistencia simple en JSON dentro de userData: ajustes + cartera sin vender.

import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

const FILE = () => path.join(app.getPath('userData'), 'artemis-store.json')

export function loadStore() {
  try {
    // strip BOM: editores/PowerShell pueden guardar UTF-8 con BOM y rompe JSON.parse
    return JSON.parse(fs.readFileSync(FILE(), 'utf8').replace(/^﻿/, ''))
  } catch {
    return {}
  }
}

export function saveStore(data) {
  try {
    fs.writeFileSync(FILE(), JSON.stringify(data, null, 2), 'utf8')
  } catch (e) {
    console.error('No se pudo guardar el store:', e)
  }
}

// Append-only audit log — vsaka sprememba se zabeleži
// Shranjeno v data/changelog.json (zadnjih 500 vnosov)

import { readFile, writeFile } from './github.js'

const MAX_ENTRIES = 500

export async function logChange(action, entity, details = {}) {
  try {
    const path = 'data/changelog.json'
    const existing = await readFile(path)
    const entries = existing?.data ?? []
    const sha = existing?.sha ?? null

    const entry = {
      ts: new Date().toISOString(),
      action,   // 'inventory_update' | 'production_create' | 'receive_from_seamstress' | 'purchase_add' | ...
      entity,   // 'inventory' | 'production' | 'purchases'
      ...details,
    }

    const next = [entry, ...entries].slice(0, MAX_ENTRIES)
    await writeFile(path, next, sha)
  } catch {
    // Changelog failure must never block the main operation
  }
}

// Human-readable action labels
export const ACTION_LABELS = {
  inventory_add: 'Dodan artikel',
  inventory_update: 'Posodobljen artikel',
  inventory_delete: 'Izbrisan artikel',
  fabric_deducted: 'Blago oddano v šivalnico',
  production_create: 'Nova produkcija',
  production_update: 'Posodobljena produkcija',
  production_delete: 'Izbrisana produkcija',
  receive_from_seamstress: 'Prejem iz šivalnice',
  purchase_add: 'Nova nabava',
  purchase_update: 'Posodobljena nabava',
  purchase_delete: 'Izbrisana nabava',
  manual_deduction: 'Ročno odštevanje zaloge',
  restore_backup: 'Obnova iz backupa',
}

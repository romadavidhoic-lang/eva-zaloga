import React, { createContext, useContext, useEffect, useReducer } from 'react'
import { loadData, saveData, isConfigured } from './github.js'
import { setCache, getCache } from './cache.js'
import { logChange } from './changelog.js'

const StoreContext = createContext(null)

const initialState = {
  configured: false,
  loading: true,
  syncing: false,
  offline: false,       // true = delamo iz lokalnega cache, GitHub ni dosegljiv
  offlineSince: null,
  error: null,
  inventory: [],
  inventorySha: null,
  production: [],
  productionSha: null,
  purchases: [],
  purchasesSha: null,
  channels: [],
  channelsSha: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'INIT_DONE':
      return { ...state, loading: false, configured: action.configured }
    case 'LOAD_DATA':
      return {
        ...state,
        loading: false,
        offline: action.offline ?? false,
        offlineSince: action.offline ? (state.offlineSince ?? new Date().toISOString()) : null,
        inventory: action.inventory,
        inventorySha: action.inventorySha,
        production: action.production,
        productionSha: action.productionSha,
        purchases: action.purchases,
        purchasesSha: action.purchasesSha,
        channels: action.channels,
        channelsSha: action.channelsSha,
      }
    case 'SET_SYNCING':
      return { ...state, syncing: action.value, error: action.value ? null : state.error }
    case 'SET_ERROR':
      return { ...state, error: action.message, syncing: false }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    case 'UPDATE_INVENTORY':
      return { ...state, inventory: action.data, inventorySha: action.sha, offline: false }
    case 'UPDATE_PRODUCTION':
      return { ...state, production: action.data, productionSha: action.sha, offline: false }
    case 'UPDATE_PURCHASES':
      return { ...state, purchases: action.data, purchasesSha: action.sha, offline: false }
    case 'UPDATE_CHANNELS':
      return { ...state, channels: action.data, channelsSha: action.sha }
    default:
      return state
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    if (!isConfigured()) {
      dispatch({ type: 'INIT_DONE', configured: false })
      return
    }
    loadAllData()
  }, [])

  async function loadAllData() {
    dispatch({ type: 'SET_SYNCING', value: true })
    try {
      const [inv, prod, purch, chan] = await Promise.all([
        loadData('inventory'),
        loadData('production'),
        loadData('purchases'),
        loadData('channels'),
      ])
      const anyFromCache = inv.fromCache || prod.fromCache || purch.fromCache
      dispatch({
        type: 'LOAD_DATA',
        inventory: inv.data,
        inventorySha: inv.sha,
        production: prod.data,
        productionSha: prod.sha,
        purchases: purch.data,
        purchasesSha: purch.sha,
        channels: chan.data,
        channelsSha: chan.sha,
        offline: anyFromCache,
      })
      dispatch({ type: 'INIT_DONE', configured: true })
    } catch (e) {
      dispatch({ type: 'SET_ERROR', message: e.message })
    } finally {
      dispatch({ type: 'SET_SYNCING', value: false })
    }
  }

  function allDataSnapshot(overrides = {}) {
    return {
      inventory: overrides.inventory ?? state.inventory,
      production: overrides.production ?? state.production,
      purchases: overrides.purchases ?? state.purchases,
    }
  }

  async function saveInventory(data, changeAction = 'inventory_update', changeDetails = {}) {
    dispatch({ type: 'SET_SYNCING', value: true })
    try {
      const res = await saveData('inventory', data, state.inventorySha, allDataSnapshot({ inventory: data }))
      dispatch({ type: 'UPDATE_INVENTORY', data, sha: res.content.sha })
      logChange(changeAction, 'inventory', changeDetails).catch(() => {})
    } catch (e) {
      dispatch({ type: 'SET_ERROR', message: e.message })
      throw e
    } finally {
      dispatch({ type: 'SET_SYNCING', value: false })
    }
  }

  async function saveProduction(data, changeAction = 'production_update', changeDetails = {}) {
    dispatch({ type: 'SET_SYNCING', value: true })
    try {
      const res = await saveData('production', data, state.productionSha, allDataSnapshot({ production: data }))
      dispatch({ type: 'UPDATE_PRODUCTION', data, sha: res.content.sha })
      logChange(changeAction, 'production', changeDetails).catch(() => {})
    } catch (e) {
      dispatch({ type: 'SET_ERROR', message: e.message })
      throw e
    } finally {
      dispatch({ type: 'SET_SYNCING', value: false })
    }
  }

  async function savePurchases(data, changeAction = 'purchase_update', changeDetails = {}) {
    dispatch({ type: 'SET_SYNCING', value: true })
    try {
      const res = await saveData('purchases', data, state.purchasesSha, allDataSnapshot({ purchases: data }))
      dispatch({ type: 'UPDATE_PURCHASES', data, sha: res.content.sha })
      logChange(changeAction, 'purchases', changeDetails).catch(() => {})
    } catch (e) {
      dispatch({ type: 'SET_ERROR', message: e.message })
      throw e
    } finally {
      dispatch({ type: 'SET_SYNCING', value: false })
    }
  }

  // Atomic two-step operation: deduct fabric + create production record
  // If either step fails, the first is rolled back
  async function sendToProduction(productionRecord, inventoryWithDeductedFabric) {
    dispatch({ type: 'SET_SYNCING', value: true })

    // Save pending intent to localStorage — recovery on reload if crash mid-op
    const pendingOp = {
      type: 'send_to_production',
      productionRecord,
      inventorySnapshot: state.inventory,
      startedAt: new Date().toISOString(),
    }
    localStorage.setItem('eva_pending_op', JSON.stringify(pendingOp))

    try {
      // Step 1: deduct fabric from inventory
      const invRes = await saveData(
        'inventory',
        inventoryWithDeductedFabric,
        state.inventorySha,
        allDataSnapshot({ inventory: inventoryWithDeductedFabric }),
      )
      dispatch({ type: 'UPDATE_INVENTORY', data: inventoryWithDeductedFabric, sha: invRes.content.sha })

      // Step 2: create production record
      const newProduction = [...state.production, productionRecord]
      try {
        const prodRes = await saveData(
          'production',
          newProduction,
          state.productionSha,
          allDataSnapshot({ inventory: inventoryWithDeductedFabric, production: newProduction }),
        )
        dispatch({ type: 'UPDATE_PRODUCTION', data: newProduction, sha: prodRes.content.sha })
        logChange('fabric_deducted', 'inventory', {
          article: productionRecord.articleName,
          meters: productionRecord.fabricMeters,
          seamstress: productionRecord.seamstress,
        }).catch(() => {})
        logChange('production_create', 'production', {
          article: productionRecord.articleName,
          seamstress: productionRecord.seamstress,
        }).catch(() => {})
      } catch (step2Error) {
        // Step 2 failed — roll back step 1 to original inventory
        try {
          const rollbackRes = await saveData('inventory', state.inventory, invRes.content.sha)
          dispatch({ type: 'UPDATE_INVENTORY', data: state.inventory, sha: rollbackRes.content.sha })
        } catch {
          // Rollback also failed — leave pending_op in localStorage for recovery
          dispatch({
            type: 'SET_ERROR',
            message: 'Kritična napaka pri shranjevanju. Preverite stran "Obnova" v Nastavitvah.',
          })
          throw step2Error
        }
        throw new Error('Napaka pri ustvarjanju produkcijskega naloga. Zaloga blaga je bila obnovljena.')
      }

      localStorage.removeItem('eva_pending_op')
    } catch (e) {
      if (!e.message.includes('Napaka pri ustvarjanju')) {
        dispatch({ type: 'SET_ERROR', message: e.message })
      }
      throw e
    } finally {
      dispatch({ type: 'SET_SYNCING', value: false })
    }
  }

  // Atomic two-step operation: receive from seamstress — update production status + add to inventory
  async function receiveFromSeamstress(productionId, actualYield, updatedProduction) {
    dispatch({ type: 'SET_SYNCING', value: true })

    const pendingOp = {
      type: 'receive_from_seamstress',
      productionId,
      actualYield,
      productionSnapshot: state.production,
      inventorySnapshot: state.inventory,
      startedAt: new Date().toISOString(),
    }
    localStorage.setItem('eva_pending_op', JSON.stringify(pendingOp))

    try {
      // Step 1: update production status to 'vrnjeno'
      const prodRes = await saveData(
        'production',
        updatedProduction,
        state.productionSha,
        allDataSnapshot({ production: updatedProduction }),
      )
      dispatch({ type: 'UPDATE_PRODUCTION', data: updatedProduction, sha: prodRes.content.sha })

      // Step 2: add received pieces to inventory
      const productionItem = state.production.find(p => p.id === productionId)
      const updatedInventory = state.inventory.map(item => {
        if (item.id !== productionItem?.articleId) return item
        const variants = item.variants.map(v => ({
          ...v,
          qty: Math.max(0, (v.qty || 0) + (actualYield[v.size] || 0)),
        }))
        return { ...item, variants }
      })

      try {
        const invRes = await saveData(
          'inventory',
          updatedInventory,
          state.inventorySha,
          allDataSnapshot({ inventory: updatedInventory, production: updatedProduction }),
        )
        dispatch({ type: 'UPDATE_INVENTORY', data: updatedInventory, sha: invRes.content.sha })
        logChange('receive_from_seamstress', 'production', {
          article: productionItem?.articleName,
          seamstress: productionItem?.seamstress,
          yield: actualYield,
        }).catch(() => {})
      } catch (step2Error) {
        // Step 2 failed — roll back production status
        try {
          const rollbackRes = await saveData('production', state.production, prodRes.content.sha)
          dispatch({ type: 'UPDATE_PRODUCTION', data: state.production, sha: rollbackRes.content.sha })
        } catch {
          dispatch({
            type: 'SET_ERROR',
            message: 'Kritična napaka pri sprejemu. Preverite stran "Obnova" v Nastavitvah.',
          })
          throw step2Error
        }
        throw new Error('Napaka pri posodabljanju zaloge. Status produkcije je bil obnovljen.')
      }

      localStorage.removeItem('eva_pending_op')
    } catch (e) {
      dispatch({ type: 'SET_ERROR', message: e.message })
      throw e
    } finally {
      dispatch({ type: 'SET_SYNCING', value: false })
    }
  }

  // Manual deduction (B2B ročni računi)
  async function manualDeduction(itemId, variantSize, qty, reason) {
    const item = state.inventory.find(i => i.id === itemId)
    if (!item) throw new Error('Artikel ne obstaja')
    const variant = item.variants.find(v => v.size === variantSize)
    if (!variant) throw new Error('Varianta ne obstaja')
    if (variant.qty < qty) throw new Error(`Ni dovolj zaloge. Na voljo: ${variant.qty}, zahtevano: ${qty}`)

    const updatedInventory = state.inventory.map(i => {
      if (i.id !== itemId) return i
      return {
        ...i,
        variants: i.variants.map(v =>
          v.size === variantSize ? { ...v, qty: v.qty - qty } : v
        ),
      }
    })
    await saveInventory(updatedInventory, 'manual_deduction', {
      article: item.name,
      size: variantSize,
      qty,
      reason,
    })
  }

  // Restore from backup
  async function restoreFromBackup(backupData) {
    dispatch({ type: 'SET_SYNCING', value: true })
    try {
      const [invRes, prodRes, purchRes] = await Promise.all([
        saveData('inventory', backupData.inventory, state.inventorySha),
        saveData('production', backupData.production, state.productionSha),
        saveData('purchases', backupData.purchases, state.purchasesSha),
      ])
      dispatch({ type: 'UPDATE_INVENTORY', data: backupData.inventory, sha: invRes.content.sha })
      dispatch({ type: 'UPDATE_PRODUCTION', data: backupData.production, sha: prodRes.content.sha })
      dispatch({ type: 'UPDATE_PURCHASES', data: backupData.purchases, sha: purchRes.content.sha })
      logChange('restore_backup', 'all', { restoredAt: backupData.backedUpAt }).catch(() => {})
    } catch (e) {
      dispatch({ type: 'SET_ERROR', message: e.message })
      throw e
    } finally {
      dispatch({ type: 'SET_SYNCING', value: false })
    }
  }

  // Check for pending ops on mount (recovery after crash mid-operation)
  useEffect(() => {
    const pending = localStorage.getItem('eva_pending_op')
    if (pending) {
      try {
        const op = JSON.parse(pending)
        const ageMs = Date.now() - new Date(op.startedAt).getTime()
        // Only show recovery if op is less than 1 hour old
        if (ageMs < 3600000) {
          dispatch({
            type: 'SET_ERROR',
            message: `Prejšnja operacija "${op.type}" ni bila dokončana. Preverite zalogo in produkcijo, ter preverite Backup v Nastavitvah.`,
          })
        } else {
          localStorage.removeItem('eva_pending_op')
        }
      } catch {
        localStorage.removeItem('eva_pending_op')
      }
    }
  }, [])

  return (
    <StoreContext.Provider value={{
      state,
      dispatch,
      saveInventory,
      saveProduction,
      savePurchases,
      sendToProduction,
      receiveFromSeamstress,
      manualDeduction,
      restoreFromBackup,
      reload: loadAllData,
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  return useContext(StoreContext)
}

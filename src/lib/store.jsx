import React, { createContext, useContext, useEffect, useReducer } from 'react'
import { loadData, saveData, isConfigured } from './github.js'

const StoreContext = createContext(null)

const initialState = {
  configured: false,
  loading: true,
  syncing: false,
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
      return { ...state, syncing: action.value }
    case 'SET_ERROR':
      return { ...state, error: action.message, syncing: false }
    case 'UPDATE_INVENTORY':
      return { ...state, inventory: action.data, inventorySha: action.sha }
    case 'UPDATE_PRODUCTION':
      return { ...state, production: action.data, productionSha: action.sha }
    case 'UPDATE_PURCHASES':
      return { ...state, purchases: action.data, purchasesSha: action.sha }
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
      })
      dispatch({ type: 'INIT_DONE', configured: true })
    } catch (e) {
      dispatch({ type: 'SET_ERROR', message: e.message })
    } finally {
      dispatch({ type: 'SET_SYNCING', value: false })
    }
  }

  async function saveInventory(data) {
    dispatch({ type: 'SET_SYNCING', value: true })
    try {
      const res = await saveData('inventory', data, state.inventorySha)
      dispatch({ type: 'UPDATE_INVENTORY', data, sha: res.content.sha })
    } catch (e) {
      dispatch({ type: 'SET_ERROR', message: e.message })
      throw e
    } finally {
      dispatch({ type: 'SET_SYNCING', value: false })
    }
  }

  async function saveProduction(data) {
    dispatch({ type: 'SET_SYNCING', value: true })
    try {
      const res = await saveData('production', data, state.productionSha)
      dispatch({ type: 'UPDATE_PRODUCTION', data, sha: res.content.sha })
    } catch (e) {
      dispatch({ type: 'SET_ERROR', message: e.message })
      throw e
    } finally {
      dispatch({ type: 'SET_SYNCING', value: false })
    }
  }

  async function savePurchases(data) {
    dispatch({ type: 'SET_SYNCING', value: true })
    try {
      const res = await saveData('purchases', data, state.purchasesSha)
      dispatch({ type: 'UPDATE_PURCHASES', data, sha: res.content.sha })
    } catch (e) {
      dispatch({ type: 'SET_ERROR', message: e.message })
      throw e
    } finally {
      dispatch({ type: 'SET_SYNCING', value: false })
    }
  }

  return (
    <StoreContext.Provider
      value={{ state, dispatch, saveInventory, saveProduction, savePurchases, reload: loadAllData }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  return useContext(StoreContext)
}

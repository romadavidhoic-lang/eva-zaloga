import React, { useState } from 'react'
import { StoreProvider } from './lib/store.jsx'
import Layout from './components/Layout.jsx'
import Dashboard from './components/Dashboard.jsx'
import Inventory from './components/Inventory.jsx'
import Production from './components/Production.jsx'
import Purchases from './components/Purchases.jsx'
import Reports from './components/Reports.jsx'
import Settings from './components/Settings.jsx'

function Pages({ page, setPage }) {
  switch (page) {
    case 'dashboard': return <Dashboard setPage={setPage} />
    case 'inventory': return <Inventory />
    case 'production': return <Production />
    case 'purchases': return <Purchases />
    case 'reports': return <Reports />
    case 'settings': return <Settings setPage={setPage} />
    default: return <Dashboard setPage={setPage} />
  }
}

export default function App() {
  const [page, setPage] = useState('dashboard')

  return (
    <StoreProvider>
      <Layout page={page} setPage={setPage}>
        <Pages page={page} setPage={setPage} />
      </Layout>
    </StoreProvider>
  )
}

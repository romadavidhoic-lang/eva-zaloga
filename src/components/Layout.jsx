import React, { useState } from 'react'
import {
  LayoutDashboard, Package, Scissors, ShoppingCart, BarChart3,
  Settings, RefreshCw, AlertCircle, Menu, X, ChevronRight,
} from 'lucide-react'
import { useStore } from '../lib/store.jsx'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Zaloga', icon: Package },
  { id: 'production', label: 'Produkcija', icon: Scissors },
  { id: 'purchases', label: 'Nabava', icon: ShoppingCart },
  { id: 'reports', label: 'Poročila', icon: BarChart3 },
  { id: 'settings', label: 'Nastavitve', icon: Settings },
]

export default function Layout({ page, setPage, children }) {
  const { state, reload } = useStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-60 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100">
          <div>
            <p className="text-sm font-bold text-brand-700 leading-tight">Eva Žaponšek</p>
            <p className="text-xs text-gray-400">Upravljanje zaloge</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = page === id
            return (
              <button
                key={id}
                onClick={() => { setPage(id); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <Icon size={18} className={active ? 'text-brand-600' : 'text-gray-400'} />
                {label}
                {active && <ChevronRight size={14} className="ml-auto text-brand-400" />}
              </button>
            )
          })}
        </nav>

        {/* Sync status */}
        <div className="px-4 py-3 border-t border-gray-100">
          {state.error ? (
            <div className="flex items-center gap-2 text-xs text-red-600">
              <AlertCircle size={14} />
              <span className="truncate">{state.error}</span>
            </div>
          ) : state.syncing ? (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <RefreshCw size={14} className="animate-spin" />
              <span>Sinhronizacija...</span>
            </div>
          ) : state.configured ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">GitHub sinhroniziran</span>
              <button onClick={reload} className="text-xs text-brand-600 hover:text-brand-700">
                Osveži
              </button>
            </div>
          ) : (
            <div className="text-xs text-yellow-600">GitHub ni nastavljen</div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
              <Menu size={20} />
            </button>
            <h1 className="text-base font-semibold text-gray-800">
              {NAV.find((n) => n.id === page)?.label ?? ''}
            </h1>
          </div>
          {state.syncing && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <RefreshCw size={12} className="animate-spin" /> Shranjevanje...
            </span>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5">
          {children}
        </main>
      </div>
    </div>
  )
}

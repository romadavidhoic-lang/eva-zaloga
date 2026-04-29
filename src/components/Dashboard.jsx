import React from 'react'
import { Package, Scissors, ShoppingCart, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { formatCurrency, formatDate } from '../lib/export.js'

export default function Dashboard({ setPage }) {
  const { state } = useStore()
  const { inventory, production, purchases } = state

  // Computed stats
  const totalItems = inventory.length
  const lowStock = inventory.filter((i) => {
    const total = (i.variants || []).reduce((s, v) => s + (v.qty || 0), 0)
    return total <= (i.lowStockThreshold ?? 2) && total > 0
  }).length
  const outOfStock = inventory.filter((i) => {
    const total = (i.variants || []).reduce((s, v) => s + (v.qty || 0), 0)
    return total === 0
  }).length
  const activeProduction = production.filter((p) => p.status === 'v_delu').length
  const totalPurchaseValue = purchases.reduce((s, p) => s + (p.totalPrice || 0), 0)

  const recentPurchases = [...purchases]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)

  const overdueProduction = production.filter(
    (p) => p.status === 'v_delu' && p.dueDate && new Date(p.dueDate) < new Date(),
  )

  const statCards = [
    {
      label: 'Skupaj artiklov',
      value: totalItems,
      icon: Package,
      color: 'text-brand-600',
      bg: 'bg-brand-50',
      action: () => setPage('inventory'),
    },
    {
      label: 'V produkciji',
      value: activeProduction,
      icon: Scissors,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      action: () => setPage('production'),
    },
    {
      label: 'Vrednost nabave',
      value: formatCurrency(totalPurchaseValue),
      icon: ShoppingCart,
      color: 'text-green-600',
      bg: 'bg-green-50',
      action: () => setPage('purchases'),
    },
    {
      label: 'Nizka / brez zaloge',
      value: `${lowStock} / ${outOfStock}`,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      action: () => setPage('inventory'),
    },
  ]

  if (state.loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
        <RefreshCw size={20} className="animate-spin" />
        <span>Nalaganje...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {overdueProduction.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">
              {overdueProduction.length} zamujenih produkcij
            </p>
            <p className="text-xs text-red-500 mt-0.5">
              {overdueProduction.map((p) => p.seamstress).join(', ')}
            </p>
          </div>
          <button onClick={() => setPage('production')} className="ml-auto text-xs text-red-600 underline">
            Poglej
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <button
            key={c.label}
            onClick={c.action}
            className="card p-5 text-left hover:shadow-md transition-shadow"
          >
            <div className={`inline-flex p-2 rounded-lg ${c.bg} mb-3`}>
              <c.icon size={18} className={c.color} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-500 mt-1">{c.label}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Low stock */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Nizka zaloga</h2>
            <button onClick={() => setPage('inventory')} className="text-xs text-brand-600 hover:underline">
              Vsa zaloga
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {inventory
              .filter((i) => {
                const total = (i.variants || []).reduce((s, v) => s + (v.qty || 0), 0)
                return total <= (i.lowStockThreshold ?? 2)
              })
              .slice(0, 8)
              .map((item) => {
                const total = (item.variants || []).reduce((s, v) => s + (v.qty || 0), 0)
                return (
                  <div key={item.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.sku}</p>
                    </div>
                    <span className={total === 0 ? 'badge-red' : 'badge-yellow'}>
                      {total === 0 ? 'Ni zaloge' : `${total} kos`}
                    </span>
                  </div>
                )
              })}
            {inventory.filter((i) => {
              const t = (i.variants || []).reduce((s, v) => s + (v.qty || 0), 0)
              return t <= (i.lowStockThreshold ?? 2)
            }).length === 0 && (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">Zaloga je v redu</p>
            )}
          </div>
        </div>

        {/* Recent purchases */}
        <div className="card">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Zadnje nabave</h2>
            <button onClick={() => setPage('purchases')} className="text-xs text-brand-600 hover:underline">
              Vse nabave
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {recentPurchases.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{p.supplier}</p>
                  <p className="text-xs text-gray-400">{formatDate(p.date)}</p>
                </div>
                <span className="text-sm font-semibold text-gray-700">{formatCurrency(p.totalPrice)}</span>
              </div>
            ))}
            {recentPurchases.length === 0 && (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">Še ni nobene nabave</p>
            )}
          </div>
        </div>
      </div>

      {/* Channel sync status */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Prodajni kanali</h2>
        <div className="flex flex-wrap gap-3">
          {(state.channels || []).map((ch) => (
            <div key={ch.id} className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className={`w-2 h-2 rounded-full ${ch.active ? 'bg-green-500' : 'bg-gray-300'}`} />
              <div>
                <p className="text-sm font-medium text-gray-700">{ch.name}</p>
                <p className="text-xs text-gray-400">
                  {ch.lastSync ? `Zadnji sync: ${formatDate(ch.lastSync)}` : 'Ni bila sinhronizirana'}
                </p>
              </div>
              <span className={ch.active ? 'badge-green' : 'badge-gray'}>
                {ch.active ? 'Aktivna' : 'Neaktivna'}
              </span>
            </div>
          ))}
          {(state.channels || []).length === 0 && (
            <p className="text-sm text-gray-400">Ni dodanih kanalov. Dodaj v Nastavitvah.</p>
          )}
        </div>
      </div>
    </div>
  )
}

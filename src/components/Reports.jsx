import React, { useState } from 'react'
import { Download, FileText, Package, Scissors, ShoppingCart } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { exportCSV, exportJSON, formatDate, formatCurrency } from '../lib/export.js'

export default function Reports() {
  const { state } = useStore()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  function filterByDate(items, key) {
    return items.filter((i) => {
      if (dateFrom && i[key] < dateFrom) return false
      if (dateTo && i[key] > dateTo) return false
      return true
    })
  }

  function exportInventory() {
    const rows = state.inventory.flatMap((item) =>
      (item.variants || []).map((v) => ({
        naziv: item.name,
        sku: item.sku,
        kategorija: item.category,
        velikost: v.size,
        barva: v.color,
        material: v.material,
        qty: v.qty,
        cena_eur: v.price,
      })),
    )
    exportCSV('zaloga', rows, [
      { key: 'naziv', label: 'Naziv' },
      { key: 'sku', label: 'SKU' },
      { key: 'kategorija', label: 'Kategorija' },
      { key: 'velikost', label: 'Velikost' },
      { key: 'barva', label: 'Barva' },
      { key: 'material', label: 'Material' },
      { key: 'qty', label: 'Količina' },
      { key: 'cena_eur', label: 'Cena (€)' },
    ])
  }

  function exportProduction() {
    const rows = filterByDate(state.production, 'assignedDate').map((p) => ({
      artikel: p.articleName,
      sivilja: p.seamstress,
      kolicina: p.qty,
      oddano: formatDate(p.assignedDate),
      rok: formatDate(p.dueDate),
      vrnjeno: formatDate(p.returnedDate),
      status: p.status,
      opomba: p.note,
    }))
    exportCSV('produkcija', rows, [
      { key: 'artikel', label: 'Artikel' },
      { key: 'sivilja', label: 'Šivilja' },
      { key: 'kolicina', label: 'Količina' },
      { key: 'oddano', label: 'Datum oddaje' },
      { key: 'rok', label: 'Rok vrnitve' },
      { key: 'vrnjeno', label: 'Datum vrnitve' },
      { key: 'status', label: 'Status' },
      { key: 'opomba', label: 'Opomba' },
    ])
  }

  function exportPurchases() {
    const rows = filterByDate(state.purchases, 'date').map((p) => ({
      datum: formatDate(p.date),
      dobavitelj: p.supplier,
      racun: p.invoiceNumber,
      skupaj_eur: p.totalPrice,
      opomba: p.note,
    }))
    exportCSV('nabave', rows, [
      { key: 'datum', label: 'Datum' },
      { key: 'dobavitelj', label: 'Dobavitelj' },
      { key: 'racun', label: 'Številka računa' },
      { key: 'skupaj_eur', label: 'Skupaj (€)' },
      { key: 'opomba', label: 'Opomba' },
    ])
  }

  function exportAll() {
    exportJSON('eva-backup-' + new Date().toISOString().slice(0, 10), {
      inventory: state.inventory,
      production: state.production,
      purchases: state.purchases,
    })
  }

  // Summary numbers
  const totalInventoryValue = state.inventory.flatMap((i) => i.variants || [])
    .reduce((s, v) => s + (v.qty || 0) * (v.price || 0), 0)
  const purchasesFiltered = filterByDate(state.purchases, 'date')
  const purchasesTotal = purchasesFiltered.reduce((s, p) => s + (p.totalPrice || 0), 0)
  const productionFiltered = filterByDate(state.production, 'assignedDate')
  const completedProduction = productionFiltered.filter((p) => p.status === 'vrnjeno' || p.status === 'dokoncano').length

  return (
    <div className="space-y-6">
      {/* Date filter */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Filter po datumu</h2>
        <div className="flex items-center gap-4">
          <div>
            <label className="label">Od</label>
            <input type="date" className="input w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">Do</label>
            <input type="date" className="input w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-xs text-gray-400 hover:text-gray-600 mt-4">
              Počisti
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <Package size={20} className="text-brand-500 mb-3" />
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalInventoryValue)}</p>
          <p className="text-xs text-gray-400 mt-1">Vrednost zaloge (skupaj)</p>
        </div>
        <div className="card p-5">
          <ShoppingCart size={20} className="text-green-500 mb-3" />
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(purchasesTotal)}</p>
          <p className="text-xs text-gray-400 mt-1">
            Nabave{dateFrom || dateTo ? ' v izbranem obdobju' : ''} ({purchasesFiltered.length})
          </p>
        </div>
        <div className="card p-5">
          <Scissors size={20} className="text-blue-500 mb-3" />
          <p className="text-2xl font-bold text-gray-800">{completedProduction}</p>
          <p className="text-xs text-gray-400 mt-1">
            Zaključenih produkcij{dateFrom || dateTo ? ' v obdobju' : ''}
          </p>
        </div>
      </div>

      {/* Export buttons */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Izvozi podatke (CSV)</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <button onClick={exportInventory} className="btn-secondary justify-center py-3">
            <Package size={16} className="text-brand-500" />
            <div className="text-left">
              <p className="font-medium text-gray-700">Zaloga</p>
              <p className="text-xs text-gray-400">{state.inventory.length} artiklov</p>
            </div>
            <Download size={15} className="ml-auto" />
          </button>
          <button onClick={exportProduction} className="btn-secondary justify-center py-3">
            <Scissors size={16} className="text-blue-500" />
            <div className="text-left">
              <p className="font-medium text-gray-700">Produkcija</p>
              <p className="text-xs text-gray-400">{productionFiltered.length} nalog</p>
            </div>
            <Download size={15} className="ml-auto" />
          </button>
          <button onClick={exportPurchases} className="btn-secondary justify-center py-3">
            <ShoppingCart size={16} className="text-green-500" />
            <div className="text-left">
              <p className="font-medium text-gray-700">Nabave</p>
              <p className="text-xs text-gray-400">{purchasesFiltered.length} računov</p>
            </div>
            <Download size={15} className="ml-auto" />
          </button>
          <button onClick={exportAll} className="btn-secondary justify-center py-3">
            <FileText size={16} className="text-gray-500" />
            <div className="text-left">
              <p className="font-medium text-gray-700">Backup (JSON)</p>
              <p className="text-xs text-gray-400">Celotna baza podatkov</p>
            </div>
            <Download size={15} className="ml-auto" />
          </button>
        </div>
      </div>
    </div>
  )
}

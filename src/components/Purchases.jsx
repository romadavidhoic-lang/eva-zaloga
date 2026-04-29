import React, { useState, useMemo } from 'react'
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { formatDate, formatCurrency } from '../lib/export.js'

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

const EMPTY_LINE = { id: '', sku: '', name: '', qty: 1, unitPrice: 0 }
const EMPTY = {
  id: '', supplier: '', date: '', invoiceNumber: '',
  lines: [], note: '', totalPrice: 0,
}

export default function Purchases() {
  const { state, savePurchases } = useStore()
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)

  const sorted = useMemo(
    () => [...state.purchases].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [state.purchases],
  )

  const totalValue = sorted.reduce((s, p) => s + (p.totalPrice || 0), 0)

  function openAdd() {
    setForm({
      ...EMPTY,
      id: uid(),
      date: new Date().toISOString().slice(0, 10),
      lines: [{ ...EMPTY_LINE, id: uid() }],
    })
    setModal({ mode: 'add' })
  }

  function openEdit(item) {
    setForm(JSON.parse(JSON.stringify(item)))
    setModal({ mode: 'edit' })
  }

  function setLine(idx, field, value) {
    const lines = form.lines.map((l, i) => {
      if (i !== idx) return l
      const updated = { ...l, [field]: value }
      if (field === 'qty' || field === 'unitPrice') {
        // recalc line total handled by totalPrice computed below
      }
      return updated
    })
    const totalPrice = lines.reduce((s, l) => s + (l.qty || 0) * (l.unitPrice || 0), 0)
    setForm((f) => ({ ...f, lines, totalPrice }))
  }

  function addLine() {
    const lines = [...form.lines, { ...EMPTY_LINE, id: uid() }]
    setForm((f) => ({ ...f, lines }))
  }

  function removeLine(idx) {
    const lines = form.lines.filter((_, i) => i !== idx)
    const totalPrice = lines.reduce((s, l) => s + (l.qty || 0) * (l.unitPrice || 0), 0)
    setForm((f) => ({ ...f, lines, totalPrice }))
  }

  async function handleSave() {
    const next = modal.mode === 'add'
      ? [...state.purchases, form]
      : state.purchases.map((p) => (p.id === form.id ? form : p))
    await savePurchases(next)
    setModal(null)
  }

  async function handleDelete(id) {
    if (!confirm('Izbriši nabavo?')) return
    await savePurchases(state.purchases.filter((p) => p.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* Header with total */}
      <div className="flex items-center justify-between">
        <div className="card px-5 py-3 flex items-center gap-4">
          <div>
            <p className="text-xs text-gray-400">Skupna vrednost nabav</p>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(totalValue)}</p>
          </div>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} /> Nova nabava
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Datum</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-gray-500">Dobavitelj</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 hidden md:table-cell">Račun</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 hidden lg:table-cell">Artiklov</th>
              <th className="text-right px-3 py-3 text-xs font-medium text-gray-500">Znesek</th>
              <th className="px-5 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 text-gray-600">{formatDate(p.date)}</td>
                <td className="px-3 py-3 font-medium text-gray-800">{p.supplier}</td>
                <td className="px-3 py-3 text-gray-500 font-mono text-xs hidden md:table-cell">{p.invoiceNumber || '—'}</td>
                <td className="px-3 py-3 text-gray-500 hidden lg:table-cell">
                  {(p.lines || []).reduce((s, l) => s + (l.qty || 0), 0)} kos
                </td>
                <td className="px-3 py-3 text-right font-semibold text-gray-800">{formatCurrency(p.totalPrice)}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-brand-600">
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-500">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">
                  Ni nobene nabave. Dodaj prvo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-base font-semibold">
                {modal.mode === 'add' ? 'Nova nabava' : 'Uredi nabavo'}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Dobavitelj *</label>
                  <input className="input" value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Datum *</label>
                  <input type="date" className="input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Številka računa</label>
                  <input className="input font-mono" value={form.invoiceNumber} onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Skupaj (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input font-semibold"
                    value={form.totalPrice}
                    onChange={(e) => setForm((f) => ({ ...f, totalPrice: Number(e.target.value) }))}
                  />
                </div>
              </div>

              {/* Lines */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Vrstice</label>
                  <button onClick={addLine} className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
                    <Plus size={13} /> Dodaj vrstico
                  </button>
                </div>
                <div className="space-y-2">
                  {form.lines.map((l, idx) => (
                    <div key={l.id} className="grid grid-cols-5 gap-2 items-center bg-gray-50 p-2 rounded-lg">
                      <input className="input text-xs col-span-2" placeholder="Naziv artikla" value={l.name} onChange={(e) => setLine(idx, 'name', e.target.value)} />
                      <input className="input text-xs font-mono" placeholder="SKU" value={l.sku} onChange={(e) => setLine(idx, 'sku', e.target.value)} />
                      <input type="number" className="input text-xs" placeholder="Qty" value={l.qty} onChange={(e) => setLine(idx, 'qty', Number(e.target.value))} />
                      <div className="flex gap-1">
                        <input type="number" step="0.01" className="input text-xs" placeholder="€/kos" value={l.unitPrice} onChange={(e) => setLine(idx, 'unitPrice', Number(e.target.value))} />
                        <button onClick={() => removeLine(idx)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Opomba</label>
                <textarea className="input resize-none" rows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setModal(null)} className="btn-secondary">Prekliči</button>
              <button onClick={handleSave} disabled={!form.supplier || !form.date} className="btn-primary disabled:opacity-50">
                <Save size={15} /> Shrani
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

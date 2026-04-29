import React, { useState, useMemo } from 'react'
import { Plus, Search, Edit2, Trash2, ChevronDown, ChevronRight, X, Save } from 'lucide-react'
import { useStore } from '../lib/store.jsx'

const EMPTY_VARIANT = { id: '', size: '', color: '', material: '', qty: 0, price: 0 }
const EMPTY_ITEM = {
  id: '', sku: '', name: '', category: '', description: '',
  lowStockThreshold: 2, variants: [],
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

function statusBadge(total, threshold) {
  if (total === 0) return <span className="badge-red">Ni zaloge</span>
  if (total <= threshold) return <span className="badge-yellow">Nizka zaloga</span>
  return <span className="badge-green">Na zalogi</span>
}

export default function Inventory() {
  const { state, saveInventory } = useStore()
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState({})
  const [modal, setModal] = useState(null) // null | { mode: 'add'|'edit', item }
  const [form, setForm] = useState(EMPTY_ITEM)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return state.inventory.filter(
      (i) => i.name?.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q),
    )
  }, [state.inventory, search])

  function openAdd() {
    setForm({ ...EMPTY_ITEM, id: uid(), variants: [{ ...EMPTY_VARIANT, id: uid() }] })
    setModal({ mode: 'add' })
  }

  function openEdit(item) {
    setForm(JSON.parse(JSON.stringify(item)))
    setModal({ mode: 'edit' })
  }

  async function handleSave() {
    const next = modal.mode === 'add'
      ? [...state.inventory, form]
      : state.inventory.map((i) => (i.id === form.id ? form : i))
    await saveInventory(next)
    setModal(null)
  }

  async function handleDelete(id) {
    if (!confirm('Izbriši artikel?')) return
    await saveInventory(state.inventory.filter((i) => i.id !== id))
  }

  function setVariant(idx, field, value) {
    const variants = form.variants.map((v, i) => (i === idx ? { ...v, [field]: value } : v))
    setForm((f) => ({ ...f, variants }))
  }

  function addVariant() {
    setForm((f) => ({ ...f, variants: [...f.variants, { ...EMPTY_VARIANT, id: uid() }] }))
  }

  function removeVariant(idx) {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }))
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Išči artikel, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button onClick={openAdd} className="btn-primary ml-auto">
          <Plus size={16} /> Nov artikel
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 w-8"></th>
              <th className="text-left px-3 py-3 text-xs font-medium text-gray-500">Artikel</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 hidden md:table-cell">SKU</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 hidden lg:table-cell">Kategorija</th>
              <th className="text-right px-3 py-3 text-xs font-medium text-gray-500">Skupaj</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-gray-500">Status</th>
              <th className="px-5 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((item) => {
              const total = (item.variants || []).reduce((s, v) => s + (v.qty || 0), 0)
              const isOpen = expanded[item.id]
              return (
                <React.Fragment key={item.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="pl-5 py-3">
                      <button
                        onClick={() => setExpanded((e) => ({ ...e, [item.id]: !e[item.id] }))}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-800">{item.name}</td>
                    <td className="px-3 py-3 text-gray-500 hidden md:table-cell font-mono text-xs">{item.sku}</td>
                    <td className="px-3 py-3 text-gray-500 hidden lg:table-cell">{item.category || '—'}</td>
                    <td className="px-3 py-3 text-right font-semibold">{total}</td>
                    <td className="px-3 py-3">{statusBadge(total, item.lowStockThreshold ?? 2)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-brand-600">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-500">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={7} className="bg-gray-50 px-8 pb-3">
                        <table className="w-full text-xs mt-2">
                          <thead>
                            <tr className="text-gray-400">
                              <th className="text-left py-1 font-medium">Velikost</th>
                              <th className="text-left py-1 font-medium">Barva</th>
                              <th className="text-left py-1 font-medium hidden sm:table-cell">Material</th>
                              <th className="text-right py-1 font-medium">Qty</th>
                              <th className="text-right py-1 font-medium hidden sm:table-cell">Cena (€)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {(item.variants || []).map((v) => (
                              <tr key={v.id}>
                                <td className="py-1.5 text-gray-700">{v.size || '—'}</td>
                                <td className="py-1.5 text-gray-700">{v.color || '—'}</td>
                                <td className="py-1.5 text-gray-700 hidden sm:table-cell">{v.material || '—'}</td>
                                <td className="py-1.5 text-right font-semibold text-gray-800">{v.qty}</td>
                                <td className="py-1.5 text-right text-gray-600 hidden sm:table-cell">{v.price ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">
                  {search ? 'Ni rezultatov za iskanje.' : 'Zaloga je prazna. Dodaj prvi artikel.'}
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
                {modal.mode === 'add' ? 'Nov artikel' : 'Uredi artikel'}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Naziv *</label>
                  <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">SKU</label>
                  <input className="input font-mono" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Kategorija</label>
                  <input className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Opozorilo pri zalogi ≤</label>
                  <input type="number" className="input" value={form.lowStockThreshold} onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: Number(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label className="label">Opis</label>
                <textarea className="input resize-none" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>

              {/* Variants */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Variante</label>
                  <button onClick={addVariant} className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
                    <Plus size={13} /> Dodaj varianto
                  </button>
                </div>
                <div className="space-y-2">
                  {form.variants.map((v, idx) => (
                    <div key={v.id} className="grid grid-cols-5 gap-2 items-center bg-gray-50 p-2 rounded-lg">
                      <input className="input text-xs" placeholder="Velikost" value={v.size} onChange={(e) => setVariant(idx, 'size', e.target.value)} />
                      <input className="input text-xs" placeholder="Barva" value={v.color} onChange={(e) => setVariant(idx, 'color', e.target.value)} />
                      <input className="input text-xs" placeholder="Material" value={v.material} onChange={(e) => setVariant(idx, 'material', e.target.value)} />
                      <input type="number" className="input text-xs" placeholder="Qty" value={v.qty} onChange={(e) => setVariant(idx, 'qty', Number(e.target.value))} />
                      <div className="flex items-center gap-1">
                        <input type="number" className="input text-xs" placeholder="€" value={v.price} onChange={(e) => setVariant(idx, 'price', Number(e.target.value))} />
                        <button onClick={() => removeVariant(idx)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setModal(null)} className="btn-secondary">Prekliči</button>
              <button onClick={handleSave} disabled={!form.name} className="btn-primary disabled:opacity-50">
                <Save size={15} /> Shrani
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

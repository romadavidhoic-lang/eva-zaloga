import React, { useState, useMemo } from 'react'
import { Plus, Search, Edit2, Trash2, ChevronDown, ChevronRight, X, Save, Scissors, Package } from 'lucide-react'
import { useStore } from '../lib/store.jsx'

const EMPTY_VARIANT = { id: '', size: '', color: '', qty: 0, price: 0 }
const EMPTY_FABRIC = { name: '', stock: 0, unit: 'm', lowStockThreshold: 10 }
const EMPTY_CONVERSION = { metersPerBatch: 10, yields: {} }
const EMPTY_ITEM = {
  id: '', sku: '', name: '', category: '', description: '',
  type: 'simple', lowStockThreshold: 2,
  fabric: { ...EMPTY_FABRIC },
  conversion: { ...EMPTY_CONVERSION },
  variants: [],
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

function statusBadge(total, threshold) {
  if (total === 0) return <span className="badge-red">Ni zaloge</span>
  if (total <= threshold) return <span className="badge-yellow">Nizka zaloga</span>
  return <span className="badge-green">Na zalogi</span>
}

function fabricBadge(stock, threshold) {
  if (stock <= 0) return <span className="badge-red">Ni blaga</span>
  if (stock <= threshold) return <span className="badge-yellow">{stock} m</span>
  return <span className="badge-green">{stock} m</span>
}

export default function Inventory() {
  const { state, saveInventory } = useStore()
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState({})
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_ITEM)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return state.inventory.filter(
      (i) => i.name?.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q),
    )
  }, [state.inventory, search])

  function openAdd() {
    setForm({ ...EMPTY_ITEM, id: uid(), variants: [{ ...EMPTY_VARIANT, id: uid() }], fabric: { ...EMPTY_FABRIC }, conversion: { metersPerBatch: 10, yields: {} } })
    setModal({ mode: 'add' })
  }

  function openEdit(item) {
    const copy = JSON.parse(JSON.stringify(item))
    if (!copy.fabric) copy.fabric = { ...EMPTY_FABRIC }
    if (!copy.conversion) copy.conversion = { metersPerBatch: 10, yields: {} }
    setForm(copy)
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

  function setYield(size, value) {
    setForm((f) => ({
      ...f,
      conversion: { ...f.conversion, yields: { ...f.conversion.yields, [size]: Number(value) } },
    }))
  }

  const variantSizes = form.variants.map((v) => v.size).filter(Boolean)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Išči artikel, SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
              <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 hidden lg:table-cell">Tip</th>
              <th className="text-right px-3 py-3 text-xs font-medium text-gray-500">Kosi</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-gray-500 hidden lg:table-cell">Blago</th>
              <th className="text-left px-3 py-3 text-xs font-medium text-gray-500">Status</th>
              <th className="px-5 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((item) => {
              const total = (item.variants || []).reduce((s, v) => s + (v.qty || 0), 0)
              const isOpen = expanded[item.id]
              const isComplex = item.type === 'complex'
              return (
                <React.Fragment key={item.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="pl-5 py-3">
                      <button onClick={() => setExpanded((e) => ({ ...e, [item.id]: !e[item.id] }))} className="text-gray-400 hover:text-gray-600">
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-800">{item.name}</td>
                    <td className="px-3 py-3 text-gray-500 hidden md:table-cell font-mono text-xs">{item.sku}</td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      {isComplex
                        ? <span className="flex items-center gap-1 text-xs text-purple-600"><Scissors size={12} /> Lastna prod.</span>
                        : <span className="flex items-center gap-1 text-xs text-gray-400"><Package size={12} /> Gotov</span>}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold">{total}</td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      {isComplex ? fabricBadge(item.fabric?.stock ?? 0, item.fabric?.lowStockThreshold ?? 10) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3">{statusBadge(total, item.lowStockThreshold ?? 2)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-brand-600"><Edit2 size={15} /></button>
                        <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={8} className="bg-gray-50 px-8 pb-4">
                        {isComplex && item.fabric && (
                          <div className="mt-2 mb-3 flex items-center gap-4 text-xs text-gray-600 bg-purple-50 rounded-lg px-3 py-2">
                            <span className="font-medium text-purple-700">Blago:</span>
                            <span>{item.fabric.name || '—'}</span>
                            <span className="font-semibold">{item.fabric.stock} {item.fabric.unit}</span>
                            {item.conversion && (
                              <span className="text-gray-400">
                                Konverzija: {item.conversion.metersPerBatch}m →{' '}
                                {Object.entries(item.conversion.yields || {}).map(([s, q]) => `${q}x${s}`).join(', ')}
                              </span>
                            )}
                          </div>
                        )}
                        <table className="w-full text-xs mt-1">
                          <thead>
                            <tr className="text-gray-400">
                              <th className="text-left py-1 font-medium">Velikost</th>
                              <th className="text-left py-1 font-medium">Barva</th>
                              <th className="text-right py-1 font-medium">Qty</th>
                              <th className="text-right py-1 font-medium hidden sm:table-cell">Cena (€)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {(item.variants || []).map((v) => (
                              <tr key={v.id}>
                                <td className="py-1.5 text-gray-700">{v.size || '—'}</td>
                                <td className="py-1.5 text-gray-700">{v.color || '—'}</td>
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
                <td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400">
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
              <h2 className="text-base font-semibold">{modal.mode === 'add' ? 'Nov artikel' : 'Uredi artikel'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Tip artikla */}
              <div>
                <label className="label">Tip artikla *</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setForm((f) => ({ ...f, type: 'simple' }))}
                    className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-colors ${form.type === 'simple' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    <Package size={16} /> Gotov izdelek
                    <span className="text-xs font-normal ml-1 opacity-70">kupimo že narejenega</span>
                  </button>
                  <button
                    onClick={() => setForm((f) => ({ ...f, type: 'complex' }))}
                    className={`flex-1 flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-colors ${form.type === 'complex' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    <Scissors size={16} /> Lastna produkcija
                    <span className="text-xs font-normal ml-1 opacity-70">šivamo iz blaga</span>
                  </button>
                </div>
              </div>

              {/* Osnovni podatki */}
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
                  <label className="label">Opozorilo pri zalogi ≤ (kos)</label>
                  <input type="number" className="input" value={form.lowStockThreshold} onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: Number(e.target.value) }))} />
                </div>
              </div>

              {/* Blago + konverzija — samo za complex */}
              {form.type === 'complex' && (
                <div className="space-y-4 bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Zaloga blaga</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Naziv blaga</label>
                      <input className="input" placeholder="npr. Svila bela" value={form.fabric.name} onChange={(e) => setForm((f) => ({ ...f, fabric: { ...f.fabric, name: e.target.value } }))} />
                    </div>
                    <div>
                      <label className="label">Enota</label>
                      <select className="input" value={form.fabric.unit} onChange={(e) => setForm((f) => ({ ...f, fabric: { ...f.fabric, unit: e.target.value } }))}>
                        <option value="m">metri (m)</option>
                        <option value="kg">kilogrami (kg)</option>
                        <option value="kos">kosi</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Trenutna zaloga blaga</label>
                      <input type="number" step="0.1" className="input" value={form.fabric.stock} onChange={(e) => setForm((f) => ({ ...f, fabric: { ...f.fabric, stock: Number(e.target.value) } }))} />
                    </div>
                    <div>
                      <label className="label">Opozorilo pri ≤</label>
                      <input type="number" step="0.1" className="input" value={form.fabric.lowStockThreshold} onChange={(e) => setForm((f) => ({ ...f, fabric: { ...f.fabric, lowStockThreshold: Number(e.target.value) } }))} />
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide pt-2">Konverzijska formula</p>
                  <div className="flex items-center gap-3">
                    <div className="w-32">
                      <label className="label">Na koliko {form.fabric.unit}</label>
                      <input type="number" step="0.1" className="input" value={form.conversion.metersPerBatch} onChange={(e) => setForm((f) => ({ ...f, conversion: { ...f.conversion, metersPerBatch: Number(e.target.value) } }))} />
                    </div>
                    <div className="text-gray-400 text-sm mt-4">→</div>
                    <div className="flex-1">
                      <label className="label">Kosi po velikosti</label>
                      <div className="flex flex-wrap gap-2">
                        {variantSizes.length === 0 && <p className="text-xs text-gray-400">Najprej dodaj variante spodaj</p>}
                        {variantSizes.map((size) => (
                          <div key={size} className="flex items-center gap-1">
                            <span className="text-xs text-gray-500 w-8">{size}:</span>
                            <input
                              type="number"
                              className="input text-xs w-16"
                              placeholder="0"
                              value={form.conversion.yields[size] ?? ''}
                              onChange={(e) => setYield(size, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-purple-500">
                    Primer: iz {form.conversion.metersPerBatch}{form.fabric.unit} dobiš{' '}
                    {Object.entries(form.conversion.yields).filter(([, v]) => v > 0).map(([s, q]) => `${q}× ${s}`).join(', ') || '...'}
                  </p>
                </div>
              )}

              {/* Variante */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Variante (končni izdelki)</label>
                  <button onClick={addVariant} className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
                    <Plus size={13} /> Dodaj varianto
                  </button>
                </div>
                <div className="space-y-2">
                  {form.variants.map((v, idx) => (
                    <div key={v.id} className="grid grid-cols-4 gap-2 items-center bg-gray-50 p-2 rounded-lg">
                      <input className="input text-xs" placeholder="Velikost (S/M/L...)" value={v.size} onChange={(e) => setVariant(idx, 'size', e.target.value)} />
                      <input className="input text-xs" placeholder="Barva" value={v.color} onChange={(e) => setVariant(idx, 'color', e.target.value)} />
                      <input type="number" className="input text-xs" placeholder="Qty" value={v.qty} onChange={(e) => setVariant(idx, 'qty', Number(e.target.value))} />
                      <div className="flex items-center gap-1">
                        <input type="number" className="input text-xs" placeholder="€" value={v.price} onChange={(e) => setVariant(idx, 'price', Number(e.target.value))} />
                        <button onClick={() => removeVariant(idx)} className="text-gray-400 hover:text-red-500 flex-shrink-0"><X size={14} /></button>
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

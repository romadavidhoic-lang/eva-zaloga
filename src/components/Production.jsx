import React, { useState, useMemo } from 'react'
import { Plus, Edit2, Trash2, X, Save, AlertTriangle, Scissors, Package, CheckCircle } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { formatDate } from '../lib/export.js'

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

const STATUS = [
  { id: 'v_delu', label: 'V delu', badge: 'badge-blue' },
  { id: 'dokoncano', label: 'Dokončano', badge: 'badge-green' },
  { id: 'vrnjeno', label: 'Vrnjeno', badge: 'badge-gray' },
  { id: 'problem', label: 'Problem', badge: 'badge-red' },
]

const EMPTY = {
  id: '', type: 'simple',
  articleId: '', articleName: '',
  fabricMeters: 0, expectedYield: {}, actualYield: {},
  qty: 1, seamstress: '',
  assignedDate: '', dueDate: '', returnedDate: '',
  status: 'v_delu', note: '',
}

function calcExpectedYield(article, meters) {
  if (!article?.conversion) return {}
  const { metersPerBatch, yields } = article.conversion
  if (!metersPerBatch) return {}
  const ratio = meters / metersPerBatch
  return Object.fromEntries(
    Object.entries(yields || {}).map(([size, qty]) => [size, Math.floor(qty * ratio)])
  )
}

export default function Production() {
  const { state, saveProduction, sendToProduction, receiveFromSeamstress } = useStore()
  const [filterStatus, setFilterStatus] = useState('vse')
  const [modal, setModal] = useState(null)
  const [receiveModal, setReceiveModal] = useState(null) // { production item }
  const [form, setForm] = useState(EMPTY)
  const [actualYield, setActualYield] = useState({})

  const complexArticles = useMemo(
    () => state.inventory.filter((i) => i.type === 'complex'),
    [state.inventory]
  )

  const filtered = useMemo(() => {
    return state.production
      .filter((p) => filterStatus === 'vse' || p.status === filterStatus)
      .sort((a, b) => new Date(b.assignedDate) - new Date(a.assignedDate))
  }, [state.production, filterStatus])

  function openAdd() {
    setForm({ ...EMPTY, id: uid(), assignedDate: new Date().toISOString().slice(0, 10) })
    setModal({ mode: 'add' })
  }

  function openEdit(item) {
    setForm(JSON.parse(JSON.stringify(item)))
    setModal({ mode: 'edit' })
  }

  function handleArticleSelect(articleId) {
    const article = complexArticles.find((a) => a.id === articleId)
    if (!article) {
      setForm((f) => ({ ...f, articleId: '', articleName: '', type: 'simple', expectedYield: {}, fabricMeters: 0 }))
      return
    }
    const expectedYield = calcExpectedYield(article, form.fabricMeters || 0)
    setForm((f) => ({ ...f, articleId, articleName: article.name, type: 'complex', expectedYield }))
  }

  function handleFabricMeters(meters) {
    const article = complexArticles.find((a) => a.id === form.articleId)
    const expectedYield = article ? calcExpectedYield(article, meters) : {}
    setForm((f) => ({ ...f, fabricMeters: meters, expectedYield }))
  }

  async function handleSave() {
    if (modal.mode === 'add' && form.type === 'complex' && form.articleId && form.fabricMeters > 0) {
      // Validate: enough fabric available?
      const article = state.inventory.find(i => i.id === form.articleId)
      const available = article?.fabric?.stock ?? 0
      if (form.fabricMeters > available) {
        if (!confirm(`Opozorilo: oddate ${form.fabricMeters}m blaga, na zalogi pa je samo ${available}m. Nadaljujete?`)) return
      }

      const inventoryWithDeduction = state.inventory.map((item) => {
        if (item.id !== form.articleId) return item
        return { ...item, fabric: { ...item.fabric, stock: Math.max(0, (item.fabric?.stock || 0) - form.fabricMeters) } }
      })
      // Atomic operation: deduct fabric + create production (with rollback on failure)
      await sendToProduction(form, inventoryWithDeduction)
    } else {
      const next = modal.mode === 'add'
        ? [...state.production, form]
        : state.production.map((p) => (p.id === form.id ? form : p))
      const action = modal.mode === 'add' ? 'production_create' : 'production_update'
      await saveProduction(next, action, { article: form.articleName })
    }
    setModal(null)
  }

  async function handleDelete(id) {
    if (!confirm('Izbriši produkcijsko nalogo?')) return
    await saveProduction(state.production.filter((p) => p.id !== id))
  }

  function openReceive(item) {
    // Pre-fill with expected yield
    setActualYield({ ...item.expectedYield })
    setReceiveModal(item)
  }

  async function handleReceive() {
    const p = receiveModal
    const updatedProduction = state.production.map((prod) =>
      prod.id === p.id
        ? { ...prod, status: 'vrnjeno', returnedDate: new Date().toISOString().slice(0, 10), actualYield }
        : prod
    )
    // Atomic: update production status + add pieces to inventory (with rollback on failure)
    await receiveFromSeamstress(p.id, actualYield, updatedProduction)
    setReceiveModal(null)
  }

  async function quickStatus(id, status) {
    const next = state.production.map((p) => {
      if (p.id !== id) return p
      return { ...p, status, ...(status === 'vrnjeno' ? { returnedDate: new Date().toISOString().slice(0, 10) } : {}) }
    })
    await saveProduction(next)
  }

  function isOverdue(p) {
    return p.status === 'v_delu' && p.dueDate && new Date(p.dueDate) < new Date()
  }

  const selectedArticle = complexArticles.find((a) => a.id === form.articleId)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {[{ id: 'vse', label: 'Vse' }, ...STATUS].map((s) => (
            <button
              key={s.id}
              onClick={() => setFilterStatus(s.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${filterStatus === s.id ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button onClick={openAdd} className="btn-primary ml-auto">
          <Plus size={16} /> Nova naloga
        </button>
      </div>

      {/* Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => {
          const statusInfo = STATUS.find((s) => s.id === p.status) || STATUS[0]
          const overdue = isOverdue(p)
          const isComplex = p.type === 'complex'
          return (
            <div key={p.id} className={`card p-4 space-y-3 ${overdue ? 'border-red-300 bg-red-50' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    {isComplex ? <Scissors size={13} className="text-purple-500" /> : <Package size={13} className="text-gray-400" />}
                    <p className="text-sm font-semibold text-gray-800">{p.articleName}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{p.seamstress}</p>
                </div>
                <span className={statusInfo.badge}>{statusInfo.label}</span>
              </div>

              {overdue && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <AlertTriangle size={12} /> Zamuja od {formatDate(p.dueDate)}
                </div>
              )}

              {isComplex && (
                <div className="bg-purple-50 rounded-lg px-3 py-2 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-purple-600">Blago oddano:</span>
                    <span className="font-semibold text-purple-800">{p.fabricMeters} m</span>
                  </div>
                  {Object.keys(p.expectedYield || {}).length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-purple-600">Pričakovano:</span>
                      <span className="font-medium text-purple-700">
                        {Object.entries(p.expectedYield).map(([s, q]) => `${q}×${s}`).join(', ')}
                      </span>
                    </div>
                  )}
                  {p.actualYield && Object.keys(p.actualYield).length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-purple-600">Dejansko:</span>
                      <span className="font-medium text-green-700">
                        {Object.entries(p.actualYield).filter(([, q]) => q > 0).map(([s, q]) => `${q}×${s}`).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {!isComplex && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-400">Količina</p>
                    <p className="font-semibold text-gray-700">{p.qty} kos</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Rok</p>
                    <p className={`font-semibold ${overdue ? 'text-red-600' : 'text-gray-700'}`}>{formatDate(p.dueDate)}</p>
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-400 flex gap-3">
                <span>Oddano: {formatDate(p.assignedDate)}</span>
                {p.dueDate && <span>Rok: {formatDate(p.dueDate)}</span>}
              </div>

              {p.note && <p className="text-xs text-gray-500 italic">"{p.note}"</p>}

              <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                {p.status === 'v_delu' && (
                  isComplex ? (
                    <button onClick={() => openReceive(p)} className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
                      <CheckCircle size={13} /> Sprejmi iz šivalnice
                    </button>
                  ) : (
                    <button onClick={() => quickStatus(p.id, 'vrnjeno')} className="text-xs text-green-600 hover:text-green-700 font-medium">
                      Označi vrnjeno
                    </button>
                  )
                )}
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-brand-600"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-sm text-gray-400">Ni produkcijskih nalog.</div>
        )}
      </div>

      {/* Add/Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-base font-semibold">{modal.mode === 'add' ? 'Nova produkcijska naloga' : 'Uredi nalogo'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* Tip */}
              <div>
                <label className="label">Tip naloge</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setForm((f) => ({ ...f, type: 'simple', articleId: '', expectedYield: {} }))}
                    className={`flex-1 flex items-center gap-2 p-2.5 rounded-lg border-2 text-xs font-medium transition-colors ${form.type === 'simple' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500'}`}
                  >
                    <Package size={14} /> Gotov izdelek
                  </button>
                  <button
                    onClick={() => setForm((f) => ({ ...f, type: 'complex' }))}
                    className={`flex-1 flex items-center gap-2 p-2.5 rounded-lg border-2 text-xs font-medium transition-colors ${form.type === 'complex' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500'}`}
                    disabled={complexArticles.length === 0}
                  >
                    <Scissors size={14} /> Lastna produkcija
                    {complexArticles.length === 0 && <span className="opacity-60">(ni art.)</span>}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Artikel */}
                {form.type === 'complex' ? (
                  <div className="col-span-2">
                    <label className="label">Artikel *</label>
                    <select className="input" value={form.articleId} onChange={(e) => handleArticleSelect(e.target.value)}>
                      <option value="">— izberi artikel —</option>
                      {complexArticles.map((a) => (
                        <option key={a.id} value={a.id}>{a.name} (blago: {a.fabric?.stock ?? 0} {a.fabric?.unit})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="col-span-2">
                    <label className="label">Naziv artikla *</label>
                    <input className="input" value={form.articleName} onChange={(e) => setForm((f) => ({ ...f, articleName: e.target.value }))} />
                  </div>
                )}

                {/* Complex: blago */}
                {form.type === 'complex' && (
                  <div className="col-span-2 bg-purple-50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-4">
                      <div>
                        <label className="label">Metres blaga v produkcijo</label>
                        <input
                          type="number" step="0.5" className="input w-32"
                          value={form.fabricMeters}
                          onChange={(e) => handleFabricMeters(Number(e.target.value))}
                        />
                      </div>
                      {selectedArticle && (
                        <div className="text-xs text-purple-600 mt-4">
                          Razpoložljivo: <strong>{selectedArticle.fabric?.stock ?? 0} {selectedArticle.fabric?.unit}</strong>
                        </div>
                      )}
                    </div>
                    {Object.keys(form.expectedYield || {}).length > 0 && (
                      <div className="text-xs text-purple-700 bg-white rounded-lg px-3 py-2">
                        Pričakovano iz šivalnice:{' '}
                        <strong>{Object.entries(form.expectedYield).map(([s, q]) => `${q}× ${s}`).join(', ')}</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* Simple: qty */}
                {form.type === 'simple' && (
                  <div>
                    <label className="label">Količina</label>
                    <input type="number" className="input" value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: Number(e.target.value) }))} />
                  </div>
                )}

                <div className={form.type === 'simple' ? '' : 'col-span-1'}>
                  <label className="label">Šivilja *</label>
                  <input className="input" value={form.seamstress} onChange={(e) => setForm((f) => ({ ...f, seamstress: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Datum oddaje</label>
                  <input type="date" className="input" value={form.assignedDate} onChange={(e) => setForm((f) => ({ ...f, assignedDate: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Rok vrnitve</label>
                  <input type="date" className="input" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
                </div>
                {modal.mode === 'edit' && (
                  <>
                    <div>
                      <label className="label">Datum vrnitve</label>
                      <input type="date" className="input" value={form.returnedDate} onChange={(e) => setForm((f) => ({ ...f, returnedDate: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Status</label>
                      <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                        {STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </div>
                  </>
                )}
                <div className="col-span-2">
                  <label className="label">Opomba</label>
                  <textarea className="input resize-none" rows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setModal(null)} className="btn-secondary">Prekliči</button>
              <button
                onClick={handleSave}
                disabled={!form.seamstress || (form.type === 'simple' ? !form.articleName : !form.articleId)}
                className="btn-primary disabled:opacity-50"
              >
                <Save size={15} />
                {modal.mode === 'add' && form.type === 'complex' && form.fabricMeters > 0
                  ? `Oddaj v šivalnico (−${form.fabricMeters}m)`
                  : 'Shrani'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive from seamstress modal */}
      {receiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold">Sprejmi iz šivalnice</h2>
                <p className="text-xs text-gray-400 mt-0.5">{receiveModal.articleName} — {receiveModal.seamstress}</p>
              </div>
              <button onClick={() => setReceiveModal(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500">
                Pričakovano: <strong>{Object.entries(receiveModal.expectedYield || {}).map(([s, q]) => `${q}× ${s}`).join(', ') || '—'}</strong>
              </p>
              <p className="text-sm font-medium text-gray-700">Vnesi dejansko prejete kose:</p>
              <div className="space-y-2">
                {Object.keys(receiveModal.expectedYield || {}).map((size) => (
                  <div key={size} className="flex items-center gap-3">
                    <span className="w-12 text-sm font-medium text-gray-700">{size}</span>
                    <input
                      type="number"
                      className="input w-24"
                      value={actualYield[size] ?? receiveModal.expectedYield[size] ?? 0}
                      onChange={(e) => setActualYield((y) => ({ ...y, [size]: Number(e.target.value) }))}
                    />
                    <span className="text-xs text-gray-400">kos</span>
                    {actualYield[size] !== receiveModal.expectedYield[size] && (
                      <span className="text-xs text-orange-500">
                        pričak. {receiveModal.expectedYield[size]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-xs text-green-700">
                Kosi bodo avtomatsko dodani v zalogo končnih izdelkov.
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setReceiveModal(null)} className="btn-secondary">Prekliči</button>
              <button onClick={handleReceive} className="btn-primary">
                <CheckCircle size={15} /> Potrdi prejem → dodaj v zalogo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

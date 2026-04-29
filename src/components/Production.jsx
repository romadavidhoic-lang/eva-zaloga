import React, { useState, useMemo } from 'react'
import { Plus, Edit2, Trash2, X, Save, AlertTriangle } from 'lucide-react'
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
  id: '', articleName: '', qty: 1, seamstress: '',
  assignedDate: '', dueDate: '', returnedDate: '',
  status: 'v_delu', note: '',
}

export default function Production() {
  const { state, saveProduction } = useStore()
  const [filterStatus, setFilterStatus] = useState('vse')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)

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

  async function handleSave() {
    const next = modal.mode === 'add'
      ? [...state.production, form]
      : state.production.map((p) => (p.id === form.id ? form : p))
    await saveProduction(next)
    setModal(null)
  }

  async function handleDelete(id) {
    if (!confirm('Izbriši produkcijsko nalogo?')) return
    await saveProduction(state.production.filter((p) => p.id !== id))
  }

  async function quickStatus(id, status) {
    const next = state.production.map((p) => {
      if (p.id !== id) return p
      return {
        ...p,
        status,
        ...(status === 'vrnjeno' ? { returnedDate: new Date().toISOString().slice(0, 10) } : {}),
      }
    })
    await saveProduction(next)
  }

  function isOverdue(p) {
    return p.status === 'v_delu' && p.dueDate && new Date(p.dueDate) < new Date()
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {[{ id: 'vse', label: 'Vse' }, ...STATUS].map((s) => (
            <button
              key={s.id}
              onClick={() => setFilterStatus(s.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                filterStatus === s.id ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
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
          return (
            <div
              key={p.id}
              className={`card p-4 space-y-3 ${overdue ? 'border-red-300 bg-red-50' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{p.articleName}</p>
                  <p className="text-xs text-gray-500">{p.seamstress}</p>
                </div>
                <span className={statusInfo.badge}>{statusInfo.label}</span>
              </div>

              {overdue && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <AlertTriangle size={12} /> Zamuja od {formatDate(p.dueDate)}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-gray-400">Količina</p>
                  <p className="font-semibold text-gray-700">{p.qty} kos</p>
                </div>
                <div>
                  <p className="text-gray-400">Oddano</p>
                  <p className="font-semibold text-gray-700">{formatDate(p.assignedDate)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Rok</p>
                  <p className={`font-semibold ${overdue ? 'text-red-600' : 'text-gray-700'}`}>
                    {formatDate(p.dueDate)}
                  </p>
                </div>
              </div>

              {p.note && <p className="text-xs text-gray-500 italic">"{p.note}"</p>}

              <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                {p.status === 'v_delu' && (
                  <button
                    onClick={() => quickStatus(p.id, 'vrnjeno')}
                    className="text-xs text-green-600 hover:text-green-700 font-medium"
                  >
                    Označi vrnjeno
                  </button>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-brand-600">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-sm text-gray-400">
            Ni produkcijskih nalog.
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-base font-semibold">
                {modal.mode === 'add' ? 'Nova produkcijska naloga' : 'Uredi nalogo'}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Artikel *</label>
                  <input className="input" value={form.articleName} onChange={(e) => setForm((f) => ({ ...f, articleName: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Šivilja *</label>
                  <input className="input" value={form.seamstress} onChange={(e) => setForm((f) => ({ ...f, seamstress: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Količina</label>
                  <input type="number" className="input" value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="label">Datum oddaje</label>
                  <input type="date" className="input" value={form.assignedDate} onChange={(e) => setForm((f) => ({ ...f, assignedDate: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Rok vrnitve</label>
                  <input type="date" className="input" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
                </div>
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
                <div className="col-span-2">
                  <label className="label">Opomba</label>
                  <textarea className="input resize-none" rows={2} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setModal(null)} className="btn-secondary">Prekliči</button>
              <button onClick={handleSave} disabled={!form.articleName || !form.seamstress} className="btn-primary disabled:opacity-50">
                <Save size={15} /> Shrani
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useState, useEffect, useRef } from 'react'
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react'

const PIN_HASH_KEY = 'eva_pin_hash'
const SESSION_KEY = 'eva_unlocked'

// Simple hash — not cryptographic, but sufficient to prevent casual access
async function hashPin(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('eva_salt_' + pin))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function isUnlocked() {
  return sessionStorage.getItem(SESSION_KEY) === '1'
}

function markUnlocked() {
  sessionStorage.setItem(SESSION_KEY, '1')
}

export function usePinLock() {
  const hasPinSet = () => !!localStorage.getItem(PIN_HASH_KEY)
  const [locked, setLocked] = useState(() => hasPinSet() && !isUnlocked())
  const [pinEnabled, setPinEnabled] = useState(hasPinSet)

  function lock() {
    sessionStorage.removeItem(SESSION_KEY)
    setLocked(true)
  }

  async function setPin(pin) {
    const hash = await hashPin(pin)
    localStorage.setItem(PIN_HASH_KEY, hash)
    setPinEnabled(true)
    markUnlocked()
    setLocked(false)
  }

  function removePin() {
    localStorage.removeItem(PIN_HASH_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    setPinEnabled(false)
    setLocked(false)
  }

  async function unlock(pin) {
    const hash = await hashPin(pin)
    const stored = localStorage.getItem(PIN_HASH_KEY)
    if (hash === stored) {
      markUnlocked()
      setLocked(false)
      return true
    }
    return false
  }

  return { locked, pinEnabled, lock, setPin, removePin, unlock }
}

export default function PinLock({ onUnlock }) {
  const [pin, setPin] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!pin) return
    setLoading(true)
    setError('')
    const ok = await onUnlock(pin)
    if (!ok) {
      setError('Napačna PIN koda')
      setPin('')
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-[200] bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-sm p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-50 mb-5">
          <Lock size={28} className="text-brand-600" />
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-1">Eva Zaponšek</h1>
        <p className="text-sm text-gray-500 mb-6">Vnesite PIN za dostop</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type={show ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError('') }}
              placeholder="PIN"
              className="w-full px-4 py-3 text-center text-xl font-mono tracking-widest border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShow(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!pin || loading}
            className="btn-primary w-full justify-center py-3 disabled:opacity-50"
          >
            {loading ? 'Preverjam...' : 'Vstopi'}
          </button>
        </form>
      </div>
    </div>
  )
}

// Settings panel for PIN management
export function PinSettings({ pinEnabled, onSetPin, onRemovePin, onLock }) {
  const [mode, setMode] = useState(null) // 'set' | 'change' | 'remove'
  const [newPin, setNewPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState('')

  async function handleSet() {
    if (newPin.length < 4) { setMsg('PIN mora imeti vsaj 4 številke'); return }
    if (newPin !== confirm) { setMsg('PIN-a se ne ujemata'); return }
    await onSetPin(newPin)
    setMsg('PIN nastavljen!')
    setMode(null); setNewPin(''); setConfirm('')
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${pinEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
        <span className="text-sm text-gray-700">
          {pinEnabled ? 'PIN zaščita je vklopljena' : 'PIN zaščita je izklopljena'}
        </span>
        {pinEnabled && (
          <button onClick={onLock} className="ml-auto text-xs text-brand-600 hover:underline flex items-center gap-1">
            <Lock size={12} /> Zakleni zdaj
          </button>
        )}
      </div>

      {!mode && (
        <div className="flex gap-2">
          <button onClick={() => setMode('set')} className="btn-secondary text-xs">
            <ShieldCheck size={13} /> {pinEnabled ? 'Spremeni PIN' : 'Nastavi PIN'}
          </button>
          {pinEnabled && (
            <button onClick={() => { if (confirm('Odstranis PIN zaščito?')) onRemovePin() }} className="btn-secondary text-xs text-red-500 border-red-200 hover:bg-red-50">
              Odstrani PIN
            </button>
          )}
        </div>
      )}

      {mode === 'set' && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div>
            <label className="label">Nov PIN (4–8 številk)</label>
            <input type="password" inputMode="numeric" maxLength={8} className="input w-32 font-mono tracking-widest text-center"
              value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} />
          </div>
          <div>
            <label className="label">Potrdi PIN</label>
            <input type="password" inputMode="numeric" maxLength={8} className="input w-32 font-mono tracking-widest text-center"
              value={confirm} onChange={e => setConfirm(e.target.value.replace(/\D/g, ''))} />
          </div>
          {msg && <p className={`text-xs ${msg.includes('!') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}
          <div className="flex gap-2">
            <button onClick={handleSet} className="btn-primary text-xs">Shrani PIN</button>
            <button onClick={() => { setMode(null); setNewPin(''); setConfirm(''); setMsg('') }} className="btn-secondary text-xs">Prekliči</button>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">
        PIN se shrani lokalno v brskalnik. Ob zaprtju brskalnika bo potrebno vnesti PIN znova.
      </p>
    </div>
  )
}

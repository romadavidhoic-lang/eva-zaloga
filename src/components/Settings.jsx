import React, { useState, useEffect } from 'react'
import { Save, Eye, EyeOff, CheckCircle, XCircle, Loader, Plus, Trash2 } from 'lucide-react'
import { isConfigured, readFile } from '../lib/github.js'
import { useStore } from '../lib/store.jsx'

export default function Settings({ setPage }) {
  const { reload } = useStore()
  const [token, setToken] = useState(localStorage.getItem('gh_token') || '')
  const [owner, setOwner] = useState(localStorage.getItem('gh_owner') || '')
  const [repo, setRepo] = useState(localStorage.getItem('gh_repo') || '')
  const [branch, setBranch] = useState(localStorage.getItem('gh_branch') || 'main')
  const [showToken, setShowToken] = useState(false)
  const [testStatus, setTestStatus] = useState(null) // null | 'loading' | 'ok' | 'error'
  const [testMsg, setTestMsg] = useState('')
  const [saved, setSaved] = useState(false)

  // Sales channels
  const { state, dispatch } = useStore()
  const [channels, setChannels] = useState(state.channels || [])
  const [newCh, setNewCh] = useState({ name: '', id: '' })

  useEffect(() => {
    setChannels(state.channels || [])
  }, [state.channels])

  function saveSettings() {
    localStorage.setItem('gh_token', token)
    localStorage.setItem('gh_owner', owner)
    localStorage.setItem('gh_repo', repo)
    localStorage.setItem('gh_branch', branch)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    if (token && owner && repo) reload()
  }

  async function testConnection() {
    if (!token || !owner || !repo) return
    // Save temp so github.js picks them up
    localStorage.setItem('gh_token', token)
    localStorage.setItem('gh_owner', owner)
    localStorage.setItem('gh_repo', repo)
    localStorage.setItem('gh_branch', branch)
    setTestStatus('loading')
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      })
      if (res.ok) {
        const data = await res.json()
        setTestStatus('ok')
        setTestMsg(`Repozitorij najden: ${data.full_name}`)
      } else {
        setTestStatus('error')
        setTestMsg(`Napaka ${res.status}: ${res.statusText}`)
      }
    } catch (e) {
      setTestStatus('error')
      setTestMsg(e.message)
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      {/* GitHub config */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800">GitHub konfiguracija</h2>
        <p className="text-xs text-gray-500">
          Podatki se shranjujejo v GitHub repozitorij. Potrebuješ Personal Access Token z
          dovoljenjem <code className="bg-gray-100 px-1 rounded">repo</code>.
        </p>

        <div>
          <label className="label">Personal Access Token</label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              className="input pr-10 font-mono"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_..."
            />
            <button
              onClick={() => setShowToken((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Lastnik repozitorija</label>
            <input className="input" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="username" />
          </div>
          <div>
            <label className="label">Ime repozitorija</label>
            <input className="input" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="eva-zaloga" />
          </div>
          <div>
            <label className="label">Veja (branch)</label>
            <input className="input" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" />
          </div>
        </div>

        {/* Test connection */}
        <div className="flex items-center gap-3">
          <button onClick={testConnection} disabled={!token || !owner || !repo} className="btn-secondary disabled:opacity-50">
            {testStatus === 'loading' ? <Loader size={15} className="animate-spin" /> : null}
            Testiraj povezavo
          </button>
          {testStatus === 'ok' && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle size={14} /> {testMsg}
            </span>
          )}
          {testStatus === 'error' && (
            <span className="flex items-center gap-1 text-xs text-red-600">
              <XCircle size={14} /> {testMsg}
            </span>
          )}
        </div>

        <div className="flex justify-end">
          <button onClick={saveSettings} className="btn-primary">
            <Save size={15} />
            {saved ? 'Shranjeno!' : 'Shrani nastavitve'}
          </button>
        </div>
      </div>

      {/* Shopify Cloudflare Worker info */}
      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">Shopify integracija</h2>
        <p className="text-xs text-gray-500">
          Za avtomatsko sinhronizacijo zaloge iz Shopify postavi Cloudflare Worker.
          Worker sprejme Shopify webhook in posodobi <code className="bg-gray-100 px-1 rounded">data/inventory.json</code> v GitHubu.
        </p>
        <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-600 space-y-1">
          <p># Webhook URL (Cloudflare Worker):</p>
          <p className="text-brand-700">https://your-worker.workers.dev/shopify-webhook</p>
          <p className="mt-2"># Nastavi v Shopify Admin:</p>
          <p>Settings → Notifications → Webhooks</p>
          <p>Topic: inventory_levels/update</p>
        </div>
        <p className="text-xs text-gray-400">
          Worker koda je v mapi <code className="bg-gray-100 px-1 rounded">cloudflare-worker/</code> tega repozitorija.
        </p>
      </div>

      {/* Sales channels */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800">Prodajni kanali</h2>
        <div className="space-y-2">
          {channels.map((ch, idx) => (
            <div key={ch.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${ch.active ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm font-medium text-gray-700 flex-1">{ch.name}</span>
              <button
                onClick={() => {
                  const next = channels.map((c, i) => i === idx ? { ...c, active: !c.active } : c)
                  setChannels(next)
                }}
                className={`text-xs ${ch.active ? 'text-green-600' : 'text-gray-400'} hover:underline`}
              >
                {ch.active ? 'Aktiven' : 'Neaktiven'}
              </button>
              <button
                onClick={() => setChannels(channels.filter((_, i) => i !== idx))}
                className="text-gray-300 hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            className="input flex-1"
            placeholder="Ime kanala (npr. Instagram Shop)"
            value={newCh.name}
            onChange={(e) => setNewCh((c) => ({ ...c, name: e.target.value, id: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
          />
          <button
            onClick={() => {
              if (!newCh.name) return
              setChannels((c) => [...c, { ...newCh, active: false, lastSync: null }])
              setNewCh({ name: '', id: '' })
            }}
            className="btn-secondary"
          >
            <Plus size={15} /> Dodaj
          </button>
        </div>
        <p className="text-xs text-gray-400">Skupaj {channels.length}/3 kanalov (Shopify + 2 dodatna)</p>
      </div>
    </div>
  )
}

import { setCache, getCache } from './cache.js'

const BASE = 'https://api.github.com'

export function getConfig() {
  return {
    token: localStorage.getItem('gh_token') || '',
    owner: localStorage.getItem('gh_owner') || '',
    repo: localStorage.getItem('gh_repo') || '',
    branch: localStorage.getItem('gh_branch') || 'main',
  }
}

function headers() {
  const { token } = getConfig()
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
}

export function isConfigured() {
  const { token, owner, repo } = getConfig()
  return !!(token && owner && repo)
}

// Retry with exponential backoff
async function fetchWithRetry(url, options, maxAttempts = 3) {
  let lastError
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, options)
      return res
    } catch (e) {
      lastError = e
      if (attempt < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)))
      }
    }
  }
  throw lastError
}

export async function readFile(path) {
  const { owner, repo, branch } = getConfig()
  const url = `${BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
  const res = await fetchWithRetry(url, { headers: headers() })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub read ${res.status}: ${res.statusText}`)
  const data = await res.json()
  const content = atob(data.content.replace(/\n/g, ''))
  return { data: JSON.parse(content), sha: data.sha }
}

export async function writeFile(path, content, sha = null) {
  const { owner, repo, branch } = getConfig()
  const url = `${BASE}/repos/${owner}/${repo}/contents/${path}`
  const body = {
    message: `update ${path}`,
    content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
    branch,
    ...(sha ? { sha } : {}),
  }
  const res = await fetchWithRetry(url, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body),
  })

  // SHA conflict: file was changed externally — re-fetch and retry once
  if (res.status === 409 || res.status === 422) {
    const fresh = await readFile(path)
    if (!fresh) throw new Error('Datoteka ne obstaja več')
    const body2 = { ...body, sha: fresh.sha }
    const res2 = await fetchWithRetry(url, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(body2),
    })
    if (!res2.ok) throw new Error(`GitHub write ${res2.status} (po retry)`)
    return res2.json()
  }

  if (!res.ok) throw new Error(`GitHub write ${res.status}: ${res.statusText}`)
  return res.json()
}

// Write a daily backup snapshot — one per day, never overwrites existing
async function writeDailyBackup(allData) {
  const today = new Date().toISOString().slice(0, 10)
  const path = `data/backups/${today}.json`
  try {
    const existing = await readFile(path)
    if (existing) return // already backed up today
    await writeFile(path, { ...allData, backedUpAt: new Date().toISOString() })
  } catch {
    // Backup failure must never block the main operation
  }
}

const DEFAULTS = {
  inventory: [],
  production: [],
  purchases: [],
  channels: [
    { id: 'shopify', name: 'Shopify', active: false, lastSync: null },
    { id: 'faire', name: 'Faire', active: false, lastSync: null },
  ],
}

export async function loadData(filename) {
  try {
    const result = await readFile(`data/${filename}.json`)
    const out = result ?? { data: DEFAULTS[filename] ?? [], sha: null }
    setCache(filename, out.data, out.sha)
    return out
  } catch (e) {
    // GitHub unreachable — try local cache
    const cached = getCache(filename)
    if (cached) return { data: cached.data, sha: cached.sha, fromCache: true }
    return { data: DEFAULTS[filename] ?? [], sha: null, fromCache: true }
  }
}

export async function saveData(filename, content, sha, allDataForBackup = null) {
  // Validate: no negative quantities
  if (filename === 'inventory') {
    for (const item of content) {
      for (const v of item.variants || []) {
        if ((v.qty || 0) < 0) {
          throw new Error(`Negativna zaloga ni dovoljena: ${item.name} (${v.size})`)
        }
      }
      if (item.type === 'complex' && item.fabric && (item.fabric.stock || 0) < 0) {
        throw new Error(`Negativna zaloga blaga ni dovoljena: ${item.name}`)
      }
    }
  }

  const result = await writeFile(`data/${filename}.json`, content, sha)
  const newSha = result.content.sha
  setCache(filename, content, newSha)

  // Trigger daily backup asynchronously — don't await so it doesn't slow down saves
  if (allDataForBackup) {
    writeDailyBackup(allDataForBackup).catch(() => {})
  }

  return result
}

export async function loadBackupList() {
  const { owner, repo, branch } = getConfig()
  try {
    const res = await fetchWithRetry(
      `${BASE}/repos/${owner}/${repo}/contents/data/backups?ref=${branch}`,
      { headers: headers() }
    )
    if (!res.ok) return []
    const files = await res.json()
    return Array.isArray(files)
      ? files
          .filter(f => f.name.endsWith('.json'))
          .sort((a, b) => b.name.localeCompare(a.name))
          .slice(0, 30)
      : []
  } catch {
    return []
  }
}

export async function loadBackup(path) {
  const result = await readFile(path)
  return result?.data ?? null
}

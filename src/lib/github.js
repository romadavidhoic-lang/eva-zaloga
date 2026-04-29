const BASE = 'https://api.github.com'

function getConfig() {
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

export async function readFile(path) {
  const { owner, repo, branch } = getConfig()
  const url = `${BASE}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`
  const res = await fetch(url, { headers: headers() })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub read failed: ${res.status}`)
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
  const res = await fetch(url, { method: 'PUT', headers: headers(), body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`GitHub write failed: ${res.status}`)
  return res.json()
}

// Generic CRUD helpers for each data file
export async function loadData(filename) {
  const result = await readFile(`data/${filename}.json`)
  return result ? result : { data: getDefaults(filename), sha: null }
}

export async function saveData(filename, content, sha) {
  return writeFile(`data/${filename}.json`, content, sha)
}

function getDefaults(filename) {
  const defaults = {
    inventory: [],
    production: [],
    purchases: [],
    channels: [
      { id: 'shopify', name: 'Shopify', active: false, lastSync: null },
    ],
    settings: { shopifyWebhookSecret: '', taxRate: 22 },
  }
  return defaults[filename] ?? []
}

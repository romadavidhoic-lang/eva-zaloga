// localStorage cache — fallback ko GitHub ni dosegljiv

const PREFIX = 'eva_'

export function setCache(key, data, sha) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({
      data,
      sha,
      savedAt: new Date().toISOString(),
    }))
  } catch (e) {
    // localStorage full — silently ignore
  }
}

export function getCache(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearCache(key) {
  localStorage.removeItem(PREFIX + key)
}

export function getCacheAge(key) {
  const cached = getCache(key)
  if (!cached?.savedAt) return null
  const ms = Date.now() - new Date(cached.savedAt).getTime()
  const minutes = Math.round(ms / 60000)
  if (minutes < 1) return 'pravkar'
  if (minutes < 60) return `pred ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `pred ${hours} h`
  return `pred ${Math.round(hours / 24)} dnevi`
}

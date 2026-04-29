// Cloudflare Worker: receives Shopify inventory webhook → updates GitHub JSON
//
// Environment variables to set in Cloudflare dashboard:
//   SHOPIFY_WEBHOOK_SECRET  — from Shopify Admin > Settings > Notifications
//   GITHUB_TOKEN            — Personal Access Token with repo scope
//   GITHUB_OWNER            — your GitHub username
//   GITHUB_REPO             — repository name
//   GITHUB_BRANCH           — default: main

async function verifyShopifyHmac(request, secret) {
  const hmacHeader = request.headers.get('X-Shopify-Hmac-Sha256')
  if (!hmacHeader) return false
  const body = await request.clone().arrayBuffer()
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
  )
  const sig = Uint8Array.from(atob(hmacHeader), (c) => c.charCodeAt(0))
  return crypto.subtle.verify('HMAC', key, sig, body)
}

async function getFile(owner, repo, branch, path, token) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } },
  )
  if (res.status === 404) return { data: [], sha: null }
  const json = await res.json()
  const content = atob(json.content.replace(/\n/g, ''))
  return { data: JSON.parse(content), sha: json.sha }
}

async function putFile(owner, repo, branch, path, token, content, sha) {
  const body = {
    message: 'shopify sync: update inventory',
    content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
    branch,
    ...(sha ? { sha } : {}),
  }
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) throw new Error(`GitHub write ${res.status}: ${await res.text()}`)
  return res.json()
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })

    const valid = await verifyShopifyHmac(request, env.SHOPIFY_WEBHOOK_SECRET)
    if (!valid) return new Response('Unauthorized', { status: 401 })

    const payload = await request.json()
    // payload.inventory_item_id, payload.location_id, payload.available
    // We match by Shopify variant ID stored in inventory.json

    const { owner, repo, branch, token } = {
      owner: env.GITHUB_OWNER,
      repo: env.GITHUB_REPO,
      branch: env.GITHUB_BRANCH || 'main',
      token: env.GITHUB_TOKEN,
    }

    const { data: inventory, sha } = await getFile(owner, repo, branch, 'data/inventory.json', token)

    let changed = false
    for (const item of inventory) {
      for (const variant of item.variants || []) {
        if (String(variant.shopifyInventoryItemId) === String(payload.inventory_item_id)) {
          variant.qty = payload.available
          changed = true
        }
      }
    }

    if (changed) {
      await putFile(owner, repo, branch, 'data/inventory.json', token, inventory, sha)
    }

    // Log sync event
    const { data: channels, sha: chSha } = await getFile(owner, repo, branch, 'data/channels.json', token)
    const updatedChannels = channels.map((ch) =>
      ch.id === 'shopify' ? { ...ch, lastSync: new Date().toISOString(), active: true } : ch,
    )
    await putFile(owner, repo, branch, 'data/channels.json', token, updatedChannels, chSha)

    return new Response(JSON.stringify({ ok: true, changed }), {
      headers: { 'Content-Type': 'application/json' },
    })
  },
}

import { net } from 'electron'

export async function searchSkills({ query, owner }) {
  const keyword = String(query || '').trim()
  if (keyword.length < 2) return []
  const params = new URLSearchParams({ q: keyword, limit: '20' })
  if (owner) params.set('owner', owner)
  const response = await net.fetch(`https://skills.sh/api/search?${params.toString()}`)
  if (!response.ok) throw new Error(`skills.sh 返回 ${response.status}`)
  const data = await response.json()
  return (data.skills || []).map((item) => ({
    name: item.name,
    slug: item.id,
    source: item.source || '',
    skillId: item.skillId || item.name,
    installs: item.installs || 0
  }))
}

export async function checkHttpReachable() {
  try {
    const response = await net.fetch('https://github.com', { method: 'HEAD' })
    return { ok: response.ok || response.status < 500, status: response.status }
  } catch (error) {
    return { ok: false, status: 0, detail: String(error && error.message) }
  }
}

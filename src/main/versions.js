import { net } from 'electron'
import { getInstalledCliVersion } from './cli.js'

const REGISTRY_URLS = [
  'https://registry.npmmirror.com/skills/latest',
  'https://registry.npmjs.org/skills/latest'
]

function compareVersions(a, b) {
  const left = String(a).split('.').map((part) => parseInt(part, 10) || 0)
  const right = String(b).split('.').map((part) => parseInt(part, 10) || 0)
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] || 0) - (right[i] || 0)
    if (diff !== 0) return diff
  }
  return 0
}

async function fetchLatestVersion() {
  for (const url of REGISTRY_URLS) {
    try {
      const response = await net.fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!response.ok) continue
      const data = await response.json()
      if (data && data.version) return { version: data.version, registry: url }
    } catch {
      /* try next registry */
    }
  }
  return { version: '', registry: '' }
}

export async function checkCliUpdate(cliPath) {
  const current = getInstalledCliVersion(cliPath)
  const { version: latest, registry } = await fetchLatestVersion()
  return {
    current,
    latest,
    registry,
    hasUpdate: Boolean(current && latest && compareVersions(latest, current) > 0)
  }
}

const APP_REPO = 'humyue/skills-desktop'

export async function checkAppUpdate(currentVersion) {
  try {
    const response = await net.fetch(`https://api.github.com/repos/${APP_REPO}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'skills-desktop'
      },
      signal: AbortSignal.timeout(8000)
    })
    if (!response.ok) return { hasUpdate: false, current: currentVersion }
    const data = await response.json()
    const latest = String(data.tag_name || '').replace(/^v/i, '')
    return {
      current: currentVersion,
      latest,
      url: data.html_url || `https://github.com/${APP_REPO}/releases/latest`,
      hasUpdate: Boolean(latest) && compareVersions(latest, currentVersion) > 0
    }
  } catch {
    return { hasUpdate: false, current: currentVersion }
  }
}

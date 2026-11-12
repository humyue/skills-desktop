import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const DEFAULTS = {
  defaultAgents: [],
  theme: 'light',
  recentProjects: []
}

let cache = null

function settingsFile() {
  return join(app.getPath('userData'), 'settings.json')
}

export function getSettings() {
  if (cache) return cache
  try {
    cache = { ...DEFAULTS, ...JSON.parse(readFileSync(settingsFile(), 'utf8')) }
  } catch {
    cache = { ...DEFAULTS }
  }
  return cache
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch }
  cache = next
  const file = settingsFile()
  if (!existsSync(dirname(file))) mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(next, null, 2), 'utf8')
  return next
}

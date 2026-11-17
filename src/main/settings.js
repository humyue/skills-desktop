import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createWorkspaceRecord, isDriveRoot, normalizePath } from './workspaces.js'

const DEFAULTS = {
  schemaVersion: 2,
  defaultAgents: [],
  theme: 'light',
  workspaces: [],
  activeScope: 'global'
}

let cache = null

function settingsFile() {
  return join(app.getPath('userData'), 'settings.json')
}

// 1.x 只有 recentProjects，升级时一次性转成工作区记录
function migrate(raw) {
  const base = { ...DEFAULTS, ...(raw || {}) }
  if (!Array.isArray(base.workspaces)) base.workspaces = []
  if (Number(raw?.schemaVersion || 1) < 2) {
    const seen = new Set(base.workspaces.map((item) => normalizePath(item.path)))
    for (const path of raw?.recentProjects || []) {
      const key = normalizePath(path)
      if (!key || seen.has(key) || isDriveRoot(path)) continue
      seen.add(key)
      base.workspaces.push(createWorkspaceRecord(path))
    }
    base.schemaVersion = 2
  }
  if (!Array.isArray(base.workspaces)) base.workspaces = []
  // 只保留有路径的记录；盘符根目录由用户主动选择时仍然有效，不再无条件剔除
  base.workspaces = base.workspaces.filter((item) => item && item.path)
  if (typeof base.activeScope !== 'string') base.activeScope = 'global'
  return base
}

export function getSettings() {
  if (cache) return cache
  try {
    cache = migrate(JSON.parse(readFileSync(settingsFile(), 'utf8')))
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

import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { getSettings, saveSettings } from './settings.js'
import { detectProjectAgents } from './agents.js'

// 路径比较只在 Windows 上使用：忽略大小写与末尾分隔符
export function normalizePath(value) {
  return String(value || '')
    .trim()
    .replace(/\//g, '\\')
    .replace(/\\+$/, '')
    .toLowerCase()
}

export function isDriveRoot(dir) {
  const value = resolve(dir)
  return dirname(value) === value
}

export function createWorkspaceRecord(dir) {
  const path = resolve(dir)
  const now = new Date().toISOString()
  return {
    id: `ws_${randomUUID()}`,
    name: basename(path) || path,
    path,
    addedAt: now,
    lastOpenedAt: now
  }
}

function enrich(record) {
  const exists = existsSync(record.path)
  return {
    ...record,
    exists,
    agents: exists ? detectProjectAgents(record.path) : []
  }
}

function workspaceKey(id) {
  return `ws:${id}`
}

export function listWorkspaces() {
  // 保持记录时的顺序：切换工作区只更新 lastOpenedAt，不参与排序
  return getSettings().workspaces.map(enrich)
}

export function getWorkspace(id) {
  const record = getSettings().workspaces.find((item) => item.id === id)
  return record ? enrich(record) : null
}

export function addWorkspace(dir) {
  if (!dir) throw new Error('请选择项目目录')
  const path = resolve(dir)
  if (!existsSync(path)) throw new Error(`目录不存在：${path}`)

  const settings = getSettings()
  const key = normalizePath(path)
  const existing = settings.workspaces.find((item) => normalizePath(item.path) === key)
  if (existing) {
    touchWorkspace(existing.id)
    return { workspace: getWorkspace(existing.id), created: false }
  }

  const record = createWorkspaceRecord(path)
  saveSettings({ workspaces: [...settings.workspaces, record] })
  return { workspace: getWorkspace(record.id), created: true }
}

export function removeWorkspace(id) {
  const settings = getSettings()
  const workspaces = settings.workspaces.filter((item) => item.id !== id)
  const patch = { workspaces }
  if (settings.activeScope === id) patch.activeScope = 'global'
  saveSettings(patch)
  return listWorkspaces()
}

export function touchWorkspace(id) {
  const settings = getSettings()
  const now = new Date().toISOString()
  const workspaces = settings.workspaces.map((item) =>
    item.id === id ? { ...item, lastOpenedAt: now } : item
  )
  saveSettings({ workspaces })
  return getWorkspace(id)
}

export function scopeKey(scopeId) {
  return scopeId === 'global' ? 'global' : workspaceKey(scopeId)
}

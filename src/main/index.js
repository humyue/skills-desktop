import { app, BrowserWindow, clipboard, dialog, ipcMain, screen, shell } from 'electron'
import { join } from 'node:path'
import { getSettings, saveSettings } from './settings.js'
import { listAgents } from './agents.js'
import { getInstalledCliVersion, installSkillsPackage, resolveCliPath, testGitAccess } from './cli.js'
import { checkCliUpdate } from './versions.js'
import {
  initSkill,
  installSkills,
  listSkills,
  previewRepo,
  readSkill,
  removeSkills,
  updateSkills
} from './skills.js'
import { checkHttpReachable, searchSkills } from './search.js'

let mainWindow = null
const allowedPaths = new Set()

function requireCliPath() {
  const resolved = resolveCliPath(getSettings().cliPath)
  if (!resolved) throw new Error('未找到 skills CLI，请在设置页指定 bin/cli.mjs 路径')
  return resolved
}

function logEmitter(event) {
  return (stream, line) => {
    if (!event.sender.isDestroyed()) event.sender.send('job:log', { stream, line })
  }
}

function createWindow() {
  const workArea = screen.getPrimaryDisplay().workAreaSize
  const width = Math.min(1440, workArea.width - 64)
  const height = Math.min(900, workArea.height - 64)

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: Math.min(1024, width),
    minHeight: Math.min(680, height),
    backgroundColor: '#F7F7F8',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`)
  })
  mainWindow.webContents.on('did-fail-load', (_event, code, description) => {
    console.error('[renderer] load failed', code, description)
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpc() {
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (_event, patch) => saveSettings(patch || {}))
  ipcMain.handle('agents:list', () => listAgents())

  ipcMain.handle('skills:list', async (_event, payload = {}) => {
    const settings = getSettings()
    const rows = await listSkills({
      scope: payload.scope || 'global',
      projectPath: payload.projectPath,
      cliPath: requireCliPath(),
      proxy: settings.proxy
    })
    allowedPaths.clear()
    for (const row of rows) if (row && row.path) allowedPaths.add(row.path)
    return rows
  })

  ipcMain.handle('skills:detail', (_event, payload = {}) => {
    if (!payload.path) {
      throw new Error('该技能在清单中没有目录路径（status: missing），可能已被删除')
    }
    if (!allowedPaths.has(payload.path)) {
      throw new Error('未授权的路径，请重新刷新技能列表')
    }
    return readSkill(payload.path)
  })

  ipcMain.handle('skills:previewRepo', async (_event, payload = {}) => {
    const settings = getSettings()
    return previewRepo({
      source: payload.source,
      cliPath: requireCliPath(),
      proxy: settings.proxy
    })
  })

  ipcMain.handle('skills:install', async (event, payload = {}) => {
    const settings = getSettings()
    return installSkills({
      ...payload,
      cliPath: requireCliPath(),
      proxy: settings.proxy,
      onLog: logEmitter(event)
    })
  })

  ipcMain.handle('skills:remove', async (event, payload = {}) => {
    const settings = getSettings()
    return removeSkills({
      ...payload,
      cliPath: requireCliPath(),
      proxy: settings.proxy,
      onLog: logEmitter(event)
    })
  })

  ipcMain.handle('skills:update', async (event, payload = {}) => {
    const settings = getSettings()
    return updateSkills({
      ...payload,
      cliPath: requireCliPath(),
      proxy: settings.proxy,
      onLog: logEmitter(event)
    })
  })

  ipcMain.handle('skills:init', async (_event, payload = {}) => {
    return initSkill({ ...payload, cliPath: requireCliPath() })
  })

  ipcMain.handle('cli:checkUpdate', () => checkCliUpdate(requireCliPath()))

  ipcMain.handle('cli:version', () => getInstalledCliVersion(requireCliPath()))

  ipcMain.handle('cli:update', async (event) => {
    const result = await installSkillsPackage(logEmitter(event))
    const current = getInstalledCliVersion(resolveCliPath(getSettings().cliPath))
    return { ...result, current }
  })

  ipcMain.handle('clipboard:write', (_event, text) => {
    clipboard.writeText(String(text || ''))
    return true
  })

  ipcMain.handle('search:skills', (_event, payload = {}) => searchSkills(payload))

  ipcMain.handle('net:test', async () => {
    const settings = getSettings()
    const http = await checkHttpReachable()
    const git = testGitAccess(settings.proxy)
    const cli = resolveCliPath(settings.cliPath)
    return { http, git, cli }
  })

  ipcMain.handle('dialog:pickDir', async (_event, payload = {}) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: payload.title || '选择目录',
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('shell:openPath', async (_event, payload = {}) => {
    if (!payload.path) return ''
    return shell.openPath(payload.path)
  })
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

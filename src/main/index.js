import { app, BrowserWindow, dialog, ipcMain, screen, shell } from 'electron'
import { join } from 'node:path'
import { getSettings, saveSettings } from './settings.js'
import { listAgents } from './agents.js'
import { getCliInfo, resolveCliPath, testGitAccess } from './cli.js'
import { checkCliUpdate } from './versions.js'
import { installSkills, listSkills, previewRepo, readSkill, removeSkills, updateSkills } from './skills.js'
import { checkHttpReachable, searchSkills } from './search.js'

let mainWindow = null
const allowedPaths = new Set()

function requireCliPath() {
  const resolved = resolveCliPath()
  if (!resolved) throw new Error('内置的 skills CLI 缺失，请重新安装应用')
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
    const rows = await listSkills({
      scope: payload.scope || 'global',
      projectPath: payload.projectPath,
      cliPath: requireCliPath()
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
    return previewRepo({
      source: payload.source,
      cliPath: requireCliPath()
    })
  })

  ipcMain.handle('skills:install', async (event, payload = {}) => {
    return installSkills({
      ...payload,
      cliPath: requireCliPath(),
      onLog: logEmitter(event)
    })
  })

  ipcMain.handle('skills:remove', async (event, payload = {}) => {
    return removeSkills({
      ...payload,
      cliPath: requireCliPath(),
      onLog: logEmitter(event)
    })
  })

  ipcMain.handle('skills:update', async (event, payload = {}) => {
    return updateSkills({
      ...payload,
      cliPath: requireCliPath(),
      onLog: logEmitter(event)
    })
  })

  ipcMain.handle('cli:checkUpdate', () => checkCliUpdate(requireCliPath()))

  ipcMain.handle('cli:info', () => getCliInfo())

  ipcMain.handle('search:skills', (_event, payload = {}) => searchSkills(payload))

  ipcMain.handle('net:test', async () => {
    const http = await checkHttpReachable()
    const git = await testGitAccess()
    const cli = resolveCliPath()
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

import { contextBridge, ipcRenderer } from 'electron'

const api = {
  listSkills: (payload) => ipcRenderer.invoke('skills:list', payload),
  skillDetail: (payload) => ipcRenderer.invoke('skills:detail', payload),
  previewRepo: (payload) => ipcRenderer.invoke('skills:previewRepo', payload),
  installSkills: (payload) => ipcRenderer.invoke('skills:install', payload),
  removeSkills: (payload) => ipcRenderer.invoke('skills:remove', payload),
  updateSkills: (payload) => ipcRenderer.invoke('skills:update', payload),
  initSkill: (payload) => ipcRenderer.invoke('skills:init', payload),
  searchSkills: (payload) => ipcRenderer.invoke('search:skills', payload),
  testNetwork: () => ipcRenderer.invoke('net:test'),
  checkCliUpdate: () => ipcRenderer.invoke('cli:checkUpdate'),
  cliVersion: () => ipcRenderer.invoke('cli:version'),
  updateCli: () => ipcRenderer.invoke('cli:update'),
  copyText: (text) => ipcRenderer.invoke('clipboard:write', text),
  listAgents: () => ipcRenderer.invoke('agents:list'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  pickDirectory: (payload) => ipcRenderer.invoke('dialog:pickDir', payload),
  openPath: (path) => ipcRenderer.invoke('shell:openPath', { path }),
  onJobLog: (callback) => {
    const handler = (_event, payload) => callback(payload)
    ipcRenderer.on('job:log', handler)
    return () => ipcRenderer.removeListener('job:log', handler)
  }
}

contextBridge.exposeInMainWorld('api', api)

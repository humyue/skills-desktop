import { useCallback, useEffect, useState } from 'react'
import Installed from './pages/Installed'
import Install from './pages/Install'
import SettingsPage from './pages/SettingsPage'
import LogBar from './components/LogBar'

const NAV = [
  { id: 'installed', label: '技能库' },
  { id: 'install', label: '安装技能' },
  { id: 'settings', label: '设置' }
]

export default function App() {
  const [page, setPage] = useState('installed')
  const [scope, setScope] = useState('global')
  const [projectPath, setProjectPath] = useState('')
  const [settings, setSettings] = useState({ theme: 'light', recentProjects: [] })
  const [skills, setSkills] = useState([])
  const [selectedName, setSelectedName] = useState('')
  const [logs, setLogs] = useState([])
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    window.api.getSettings().then(setSettings).catch(() => {})
  }, [])

  useEffect(() => {
    const off = window.api.onJobLog(({ stream, line }) => {
      setLogs((prev) => [...prev, { stream, line }])
    })
    return off
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme === 'dark' ? 'dark' : 'light'
  }, [settings.theme])

  const refresh = useCallback(async () => {
    setError('')
    try {
      const rows = await window.api.listSkills({
        scope,
        projectPath: scope === 'project' ? projectPath : undefined
      })
      setSkills(rows)
      setSelectedName((prev) => (rows.some((row) => row.name === prev) ? prev : rows[0]?.name || ''))
    } catch (err) {
      setSkills([])
      setSelectedName('')
      setError(err.message)
    }
  }, [scope, projectPath])

  useEffect(() => {
    refresh()
  }, [refresh])

  const runJob = useCallback(
    async (executor, { successMessage } = {}) => {
      setLogs([])
      setExpanded(true)
      setBusy(true)
      setError('')
      setNotice('')
      try {
        const result = await executor()
        if (result && typeof result.code === 'number' && result.code !== 0) {
          setError(`命令退出码 ${result.code}，请查看下方日志`)
        } else {
          if (successMessage) setNotice(successMessage)
          await refresh()
        }
        return result
      } catch (err) {
        setError(err.message)
        return { code: -1 }
      } finally {
        setBusy(false)
      }
    },
    [refresh]
  )

  const pickProject = useCallback(async () => {
    const dir = await window.api.pickDirectory({ title: '选择项目目录' })
    if (!dir) return null
    setProjectPath(dir)
    const recent = [dir, ...(settings.recentProjects || []).filter((item) => item !== dir)].slice(0, 5)
    const next = await window.api.saveSettings({ recentProjects: recent })
    setSettings(next)
    return dir
  }, [settings.recentProjects])

  const changeScope = useCallback(
    async (next) => {
      if (next === 'project' && !projectPath) {
        const dir = await pickProject()
        if (!dir) return
      }
      setScope(next)
    },
    [projectPath, pickProject]
  )

  const updateTheme = useCallback(
    async (theme) => {
      const next = await window.api.saveSettings({ theme })
      setSettings(next)
    },
    []
  )

  const handleRemove = useCallback(
    async (skill) => {
      const ok = window.confirm(`确认卸载 ${skill.name}？\n将影响 Agent：${(skill.agents || []).join('、') || '全部'}`)
      if (!ok) return
      await runJob(() => window.api.removeSkills({ names: [skill.name], scope, projectPath }), {
        successMessage: `已卸载 ${skill.name}`
      })
    },
    [runJob, scope, projectPath]
  )

  const handleUpdate = useCallback(async () => {
    await runJob(() => window.api.updateSkills({ scope, projectPath }), { successMessage: '更新完成' })
  }, [runJob, scope, projectPath])

  const handleOpen = useCallback((path) => {
    if (path) window.api.openPath(path)
  }, [])

  const saveSettings = useCallback(async (patch) => {
    const next = await window.api.saveSettings(patch)
    setSettings(next)
  }, [])

  return (
    <div className="app">
      <header className="titlebar">
        <div>
          <div className="brand">Skills Manager</div>
          <div className="brand-sub">skills CLI 可视化客户端</div>
        </div>
        <div className="titlebar-right">
          {page === 'installed' && (
            <div className="segmented">
              <button className={scope === 'global' ? 'active' : ''} onClick={() => changeScope('global')}>
                全局
              </button>
              <button className={scope === 'project' ? 'active' : ''} onClick={() => changeScope('project')}>
                项目
              </button>
            </div>
          )}
          <button
            className="btn ghost"
            onClick={() => updateTheme(settings.theme === 'dark' ? 'light' : 'dark')}
          >
            {settings.theme === 'dark' ? '浅色主题' : '深色主题'}
          </button>
        </div>
      </header>

      <div className="shell">
        <nav className="side">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`nav-btn ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              {item.label}
            </button>
          ))}
          <div className="side-foot">已装 {skills.length} 个</div>
        </nav>

        <section className="content">
          {page === 'installed' && (
            <Installed
              skills={skills}
              selectedName={selectedName}
              onSelect={setSelectedName}
              scope={scope}
              projectPath={projectPath}
              error={error}
              busy={busy}
              onRemove={handleRemove}
              onUpdate={handleUpdate}
              onOpen={handleOpen}
            />
          )}
          {page === 'install' && (
            <Install
              scope={scope}
              onScopeChange={changeScope}
              projectPath={projectPath}
              onPickProject={pickProject}
              runJob={runJob}
              busy={busy}
              onDone={() => setPage('installed')}
            />
          )}
          {page === 'settings' && <SettingsPage settings={settings} onSave={saveSettings} />}
        </section>
      </div>

      <LogBar
        logs={logs}
        expanded={expanded}
        setExpanded={setExpanded}
        busy={busy}
        notice={notice}
        error={error}
      />
    </div>
  )
}

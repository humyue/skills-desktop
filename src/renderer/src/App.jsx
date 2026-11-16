import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SkillsPage from './pages/SkillsPage'
import Install from './pages/Install'
import SettingsPage from './pages/SettingsPage'
import LogBar from './components/LogBar'
import ScopeTree from './components/ScopeTree'
import DetailCard, { skillAgentPath } from './components/DetailCard'
import SkillPreview from './components/SkillPreview'
import ConfirmDialog from './components/ConfirmDialog'
import Toast from './components/Toast'
import { groupByAgent } from './components/AgentGroups'

// IPC 抛出的错误会被 Electron 包一层前缀，展示时去掉
function cleanErrorMessage(message) {
  return String(message || '').replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/, '')
}

export default function App() {
  const [page, setPage] = useState('skills')
  const [settings, setSettings] = useState({ theme: 'light', activeScope: 'global' })
  const [workspaces, setWorkspaces] = useState([])
  const [agentDirs, setAgentDirs] = useState([])
  const [activeScope, setActiveScope] = useState('global')
  const [cache, setCache] = useState({})
  const [skippedMap, setSkippedMap] = useState({})
  const [scopeErrors, setScopeErrors] = useState({})
  const [loading, setLoading] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState({ name: '', agent: '' })
  const [collapsed, setCollapsed] = useState([])
  const [preview, setPreview] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [toast, setToast] = useState('')
  const [logs, setLogs] = useState([])
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [updateInfo, setUpdateInfo] = useState(null)

  const workspacesRef = useRef(workspaces)
  const toastTimer = useRef(null)
  workspacesRef.current = workspaces

  const activeWorkspace = workspaces.find((item) => item.id === activeScope) || null
  const skills = cache[activeScope] || []
  // 作用域里的 Agent 以技能清单为准：多个 Agent 共用同一目录时不会被重复计入
  const scopeAgents = useMemo(
    () => [...new Set(skills.flatMap((skill) => skill.agents || []))].sort((a, b) => a.localeCompare(b)),
    [skills]
  )
  const visibleSkills = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return keyword ? skills.filter((skill) => skill.name.toLowerCase().includes(keyword)) : skills
  }, [skills, query])
  // 默认选中第一个分组里的第一条，保证列表顶部有可见的选中态
  const defaultSkill = useMemo(() => groupByAgent(skills)[0]?.skills[0] || skills[0] || null, [skills])
  const selectedSkill = skills.find((skill) => skill.name === selected.name) || defaultSkill
  const selectedAgent =
    (selected.name ? selected.agent : '') || selectedSkill?.agents?.[0] || scopeAgents[0] || ''
  const collapsedKeys = query.trim()
    ? []
    : collapsed
        .filter((key) => key.startsWith(`${activeScope}|`))
        .map((key) => key.slice(activeScope.length + 1))
  const counts = useMemo(() => {
    const map = { global: cache.global?.length }
    for (const item of workspaces) if (cache[item.id]) map[item.id] = cache[item.id].length
    return map
  }, [cache, workspaces])

  const showToast = useCallback((text) => {
    setToast(text)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2400)
  }, [])

  const loadScope = useCallback(async (scopeId, workspaceOverride) => {
    const workspace =
      workspaceOverride || workspacesRef.current.find((item) => item.id === scopeId)
    if (scopeId !== 'global' && (!workspace || !workspace.exists)) {
      setCache((prev) => ({ ...prev, [scopeId]: [] }))
      return
    }
    setLoading(scopeId)
    setScopeErrors((prev) => ({ ...prev, [scopeId]: '' }))
    try {
      const result = await window.api.listSkills({
        scope: scopeId === 'global' ? 'global' : 'project',
        workspacePath: workspace?.path
      })
      setCache((prev) => ({ ...prev, [scopeId]: result.rows || [] }))
      setSkippedMap((prev) => ({ ...prev, [scopeId]: result.skipped || 0 }))
    } catch (err) {
      setCache((prev) => ({ ...prev, [scopeId]: [] }))
      setSkippedMap((prev) => ({ ...prev, [scopeId]: 0 }))
      setScopeErrors((prev) => ({ ...prev, [scopeId]: cleanErrorMessage(err.message) }))
    } finally {
      setLoading('')
    }
  }, [])

  const refreshWorkspaces = useCallback(async () => {
    const list = await window.api.listWorkspaces()
    setWorkspaces(list)
    return list
  }, [])

  // 启动：读设置、工作区、Agent 目录，再加载当前作用域
  useEffect(() => {
    let alive = true
    ;(async () => {
      const [saved, list, dirs] = await Promise.all([
        window.api.getSettings(),
        window.api.listWorkspaces(),
        window.api.listAgentDirs()
      ])
      if (!alive) return
      setSettings(saved)
      setWorkspaces(list)
      setAgentDirs(dirs)
      const scope =
        saved.activeScope === 'global' || list.some((item) => item.id === saved.activeScope)
          ? saved.activeScope
          : 'global'
      setActiveScope(scope)
      if (scope !== 'global') {
        await window.api.saveSettings({ activeScope: scope })
      }
      await loadScope(scope, list.find((item) => item.id === scope))
      refreshWorkspaces()
    })().catch((err) => setError(cleanErrorMessage(err.message)))
    return () => {
      alive = false
    }
  }, [loadScope, refreshWorkspaces])

  useEffect(() => {
    window.api
      .checkAppUpdate()
      .then((info) => {
        if (info && info.hasUpdate) setUpdateInfo(info)
      })
      .catch(() => {})
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
          if (successMessage) {
            setNotice(successMessage)
            showToast(successMessage)
          }
          await loadScope(activeScope)
        }
        return result
      } catch (err) {
        setError(cleanErrorMessage(err.message))
        return { code: -1 }
      } finally {
        setBusy(false)
      }
    },
    [activeScope, loadScope, showToast]
  )

  const selectScope = useCallback(
    (scopeId) => {
      setActiveScope(scopeId)
      setQuery('')
      setSelected({ name: '', agent: '' })
      window.api.saveSettings({ activeScope: scopeId }).catch(() => {})
      if (scopeId !== 'global') {
        window.api
          .touchWorkspace({ id: scopeId })
          .then(() => refreshWorkspaces())
          .catch(() => {})
      }
      if (!cache[scopeId]) loadScope(scopeId)
    },
    [cache, loadScope, refreshWorkspaces]
  )

  const addWorkspace = useCallback(async () => {
    try {
      const dir = await window.api.pickDirectory({ title: '选择项目目录' })
      if (!dir) return
      const { workspace, created } = await window.api.addWorkspace({ path: dir })
      const list = await refreshWorkspaces()
      setActiveScope(workspace.id)
      setSelected({ name: '', agent: '' })
      await window.api.saveSettings({ activeScope: workspace.id })
      if (!list.some((item) => item.id === workspace.id)) {
        await loadScope('global')
      } else {
        await loadScope(workspace.id, workspace)
      }
      showToast(created ? `已记录工作区 ${workspace.name}` : `工作区 ${workspace.name} 已在列表里`)
    } catch (err) {
      setError(cleanErrorMessage(err.message))
    }
  }, [loadScope, refreshWorkspaces, showToast])

  const requestRemoveWorkspace = useCallback((workspace) => {
    setDialog({
      action: 'removeWorkspace',
      workspace,
      title: `从列表移除 ${workspace.name}`,
      sub: workspace.path,
      warning: '只移除这条记录，不会删除磁盘上的任何文件；该工作区里的技能仍然留在原目录。',
      confirmText: '移除'
    })
  }, [])

  const requestUninstall = useCallback(
    (skill) => {
      if (!skill || !skill.path) return
      const rows = (skill.agents || []).map((agent) => ({
        label: agent,
        path: skillAgentPath(skill, agent, activeScope === 'global' ? 'global' : 'project', activeWorkspace, agentDirs)
      }))
      setDialog({
        action: 'uninstall',
        skill,
        title: `卸载 ${skill.name}`,
        sub: `${activeWorkspace ? `工作区 ${activeWorkspace.name}` : '全局作用域'} · 只影响这一个技能`,
        rows,
        warning: `将删除以上 ${rows.length} 处目录；${
          activeWorkspace ? '全局作用域与其他工作区' : '各工作区'
        }里的同名技能不受影响。`,
        confirmText: '卸载',
        danger: true
      })
    },
    [activeScope, activeWorkspace, agentDirs]
  )

  const confirmDialog = useCallback(async () => {
    const current = dialog
    if (!current) return
    setDialog(null)
    if (current.action === 'uninstall') {
      await runJob(
        () =>
          window.api.removeSkills({
            names: [current.skill.name],
            scope: activeWorkspace ? 'project' : 'global',
            workspacePath: activeWorkspace?.path
          }),
        { successMessage: `已卸载 ${current.skill.name}` }
      )
      return
    }
    if (current.action === 'removeWorkspace') {
      try {
        const list = await window.api.removeWorkspace({ id: current.workspace.id })
        setWorkspaces(list)
        if (activeScope === current.workspace.id) {
          setActiveScope('global')
          setSelected({ name: '', agent: '' })
          loadScope('global')
        }
        showToast('已从列表移除')
      } catch (err) {
        setError(cleanErrorMessage(err.message))
      }
    }
  }, [dialog, activeScope, activeWorkspace, loadScope, runJob, showToast])

  const handleUpdate = useCallback(
    async (skill) => {
      if (!skill) return
      await runJob(
        () =>
          window.api.updateSkills({
            names: [skill.name],
            scope: activeWorkspace ? 'project' : 'global',
            workspacePath: activeWorkspace?.path
          }),
        { successMessage: `已更新 ${skill.name}` }
      )
    },
    [activeWorkspace, runJob]
  )

  const openPreview = useCallback(async (skill) => {
    if (!skill || !skill.path) return
    setPreview({ skill, loading: true, data: null, error: '' })
    try {
      const data = await window.api.skillDetail({ path: skill.path })
      setPreview({ skill, loading: false, data, error: '' })
    } catch (err) {
      setPreview({ skill, loading: false, data: null, error: cleanErrorMessage(err.message) })
    }
  }, [])

  const toggleAgent = useCallback(
    (agent) => {
      const key = `${activeScope}|${agent}`
      setCollapsed((prev) =>
        prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
      )
    },
    [activeScope]
  )

  const toggleAll = useCallback(() => {
    const groups = [...new Set(visibleSkills.flatMap((skill) => skill.agents || []))]
    const keys = groups.map((agent) => `${activeScope}|${agent}`)
    const allCollapsed = keys.length > 0 && keys.every((key) => collapsed.includes(key))
    setCollapsed((prev) =>
      allCollapsed
        ? prev.filter((key) => !keys.includes(key))
        : [...new Set([...prev, ...keys])]
    )
  }, [activeScope, collapsed, visibleSkills])

  const toggleTheme = useCallback(async () => {
    const next = await window.api.saveSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
    setSettings(next)
  }, [settings.theme])

  const updateSettings = useCallback(async (patch) => {
    const next = await window.api.saveSettings(patch)
    setSettings(next)
  }, [])

  return (
    <div className="app">
      <header className="titlebar">
        <div>
          <div className="brand">Skills Manager</div>
          <div className="brand-sub">本地技能档案</div>
        </div>
        <span className="rule" />
        <div className="crumb">
          作用域 <b>{activeWorkspace ? `项目 · ${activeWorkspace.name}` : '全局'}</b>
        </div>

        <div className="titlebar-right">
          {page === 'skills' && (
            <div className="search">
              <input
                placeholder="按技能名检索"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoComplete="off"
              />
            </div>
          )}
          {page !== 'skills' && (
            <button className="btn ghost" onClick={() => setPage('skills')}>
              返回技能库
            </button>
          )}
          {page === 'skills' && (
            <>
              <button className="btn ghost" onClick={() => loadScope(activeScope)} disabled={Boolean(loading)}>
                刷新
              </button>
              <button className="btn ghost" onClick={() => setPage('settings')}>
                设置
              </button>
            </>
          )}
          <button className="btn ghost" onClick={toggleTheme}>
            {settings.theme === 'dark' ? '浅色' : '深色'}
          </button>
          {page === 'skills' && (
            <button
              className="btn primary"
              onClick={() => setPage('install')}
              disabled={Boolean(activeWorkspace && !activeWorkspace.exists)}
            >
              安装技能
            </button>
          )}
        </div>
      </header>

      {updateInfo && (
        <div className="update-bar">
          <span>
            发现新版本 v{updateInfo.latest}
            {updateInfo.current ? `（当前 v${updateInfo.current}）` : ''}
          </span>
          <div className="inline">
            <button className="btn primary" onClick={() => window.api.openExternal(updateInfo.url)}>
              前往下载
            </button>
            <button className="btn ghost" onClick={() => setUpdateInfo(null)}>
              忽略
            </button>
          </div>
        </div>
      )}

      <div className="shell">
        <ScopeTree
          workspaces={workspaces}
          activeScope={activeScope}
          counts={counts}
          onSelect={selectScope}
          onAdd={addWorkspace}
          onRemove={requestRemoveWorkspace}
        />

        {page === 'skills' ? (
          <>
            <SkillsPage
              workspace={activeWorkspace}
              skills={skills}
              visibleSkills={visibleSkills}
              agents={scopeAgents}
              query={query}
              skipped={skippedMap[activeScope] || 0}
              collapsedKeys={collapsedKeys}
              onToggle={toggleAgent}
              onToggleAll={toggleAll}
              selected={{ name: selectedSkill?.name || '', agent: selectedAgent }}
              onSelect={(skill, agent) => setSelected({ name: skill.name, agent })}
              onUninstall={requestUninstall}
              onInstall={() => setPage('install')}
              onRefresh={() => loadScope(activeScope)}
              loading={loading === activeScope}
              error={scopeErrors[activeScope] || ''}
              busy={busy}
            />
            <DetailCard
              skill={selectedSkill}
              scope={activeScope === 'global' ? 'global' : 'project'}
              workspace={activeWorkspace}
              agentDirs={agentDirs}
              busy={busy}
              onPreview={openPreview}
              onUpdate={handleUpdate}
              onUninstall={requestUninstall}
              onOpen={(path) => path && window.api.openPath(path)}
              onRemoveWorkspace={requestRemoveWorkspace}
            />
          </>
        ) : (
          <section className="wide-pane">
            {page === 'install' ? (
              <Install
                isGlobal={!activeWorkspace}
                scopeLabel={activeWorkspace ? activeWorkspace.name : '全局'}
                scopePath={activeWorkspace?.path || '~/.claude/skills 等'}
                workspaceAgents={activeWorkspace?.agents || []}
                workspacePath={activeWorkspace?.path}
                runJob={runJob}
                busy={busy}
                onDone={() => setPage('skills')}
              />
            ) : (
              <SettingsPage settings={settings} onSave={updateSettings} />
            )}
          </section>
        )}
      </div>

      <LogBar
        logs={logs}
        expanded={expanded}
        setExpanded={setExpanded}
        busy={busy}
        notice={notice}
        error={error}
      />

      <SkillPreview
        state={preview}
        workspace={activeWorkspace}
        onClose={() => setPreview(null)}
        onOpenDir={(path) => path && window.api.openPath(path)}
      />
      <ConfirmDialog dialog={dialog} busy={busy} onCancel={() => setDialog(null)} onConfirm={confirmDialog} />
      <Toast text={toast} />
    </div>
  )
}

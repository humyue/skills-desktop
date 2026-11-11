import { useCallback, useEffect, useState } from 'react'

function formatInstalls(count) {
  if (!count || count <= 0) return '0'
  if (count >= 1000000) return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(count)
}

export default function Install({ scope, onScopeChange, projectPath, onPickProject, runJob, busy, onDone }) {
  const [tab, setTab] = useState('repo')
  const [source, setSource] = useState('')
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [checked, setChecked] = useState([])
  const [agents, setAgents] = useState([])
  const [selectedAgents, setSelectedAgents] = useState([])
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [showAllAgents, setShowAllAgents] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([window.api.listAgents(), window.api.getSettings()]).then(([list, settings]) => {
      if (!alive) return
      setAgents(list)
      const preferred =
        settings.defaultAgents && settings.defaultAgents.length > 0
          ? list.filter((agent) => settings.defaultAgents.includes(agent.id))
          : list.filter((agent) => agent.detected)
      setSelectedAgents(preferred.map((agent) => agent.id))
    })
    return () => {
      alive = false
    }
  }, [])

  const loadPreview = useCallback(async (rawSource, preselect) => {
    const value = String(rawSource || '').trim()
    if (!value) return
    setPreviewLoading(true)
    setPreviewError('')
    setPreview(null)
    setChecked([])
    try {
      const result = await window.api.previewRepo({ source: value })
      setPreview(result)
      const names = result.skills.map((item) => item.name)
      const initial = preselect ? preselect.filter((name) => names.includes(name)) : names
      setChecked(initial.length > 0 ? initial : names)
      if (result.skills.length === 0) {
        setPreviewError('未在来源中发现技能，请检查仓库地址、网络或代理设置')
      }
    } catch (error) {
      setPreviewError(error.message)
    } finally {
      setPreviewLoading(false)
    }
  }, [])

  const toggleSkill = (name) => {
    setChecked((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]))
  }

  const toggleAgent = (id) => {
    setSelectedAgents((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const doSearch = async () => {
    if (query.trim().length < 2) {
      setSearchError('请输入至少 2 个字符')
      return
    }
    setSearching(true)
    setSearchError('')
    setResults([])
    try {
      const list = await window.api.searchSkills({ query: query.trim() })
      setResults(list)
      if (list.length === 0) setSearchError('没有匹配的技能')
    } catch (error) {
      setSearchError(`无法连接 skills.sh：${error.message}`)
    } finally {
      setSearching(false)
    }
  }

  const pickResult = async (item) => {
    setTab('repo')
    setSource(item.source)
    await loadPreview(item.source, [item.skillId])
  }

  const install = async () => {
    const result = await runJob(
      () =>
        window.api.installSkills({
          source: source.trim(),
          skills: checked,
          agents: selectedAgents,
          scope,
          projectPath
        }),
      { successMessage: `已安装 ${checked.length} 个技能` }
    )
    if (result && result.code === 0) onDone()
  }

  const step1 = preview ? 'done' : 'now'
  const step2 = preview ? (checked.length > 0 ? 'done' : 'now') : ''
  const step3 = preview && checked.length > 0 ? 'now' : ''
  const canInstall = Boolean(preview) && checked.length > 0 && selectedAgents.length > 0 && !busy
  const visibleAgents = showAllAgents
    ? agents
    : agents.filter((agent) => agent.detected || selectedAgents.includes(agent.id))

  return (
    <div className="split">
      <div className="pane bordered">
        <div className="tabs">
          <button className={`tab ${tab === 'repo' ? 'active' : ''}`} onClick={() => setTab('repo')}>
            仓库 / 本地路径
          </button>
          <button className={`tab ${tab === 'search' ? 'active' : ''}`} onClick={() => setTab('search')}>
            搜索 skills.sh
          </button>
        </div>

        <div className="steps">
          <span className={`step ${step1}`}>
            <span className="step-num">1</span>选择来源
          </span>
          <span className="step-sep">›</span>
          <span className={`step ${step2}`}>
            <span className="step-num">2</span>挑选技能
          </span>
          <span className="step-sep">›</span>
          <span className={`step ${step3}`}>
            <span className="step-num">3</span>目标与作用域
          </span>
        </div>

        {tab === 'repo' ? (
          <>
            <div className="pane-head">
              <input
                className="input"
                placeholder="owner/repo、GitHub URL 或本地绝对路径"
                value={source}
                onChange={(event) => setSource(event.target.value)}
              />
              <button className="btn" disabled={previewLoading || !source.trim()} onClick={() => loadPreview(source)}>
                {previewLoading ? '预览中…' : '预览技能'}
              </button>
              <button
                className="btn ghost"
                onClick={async () => {
                  const dir = await window.api.pickDirectory({ title: '选择本地技能目录' })
                  if (dir) {
                    setSource(dir)
                    loadPreview(dir)
                  }
                }}
              >
                选本地目录
              </button>
            </div>

            {previewError && <div className="error-text">{previewError}</div>}

            <div className="list">
              {!preview && !previewLoading && (
                <div className="empty">填写来源后点「预览技能」，可看到仓库里的全部技能</div>
              )}
              {preview && preview.skills.length === 0 && <div className="empty">没有可安装的技能</div>}
              {preview &&
                preview.skills.map((skill) => (
                  <label key={skill.name} className="opt">
                    <input
                      type="checkbox"
                      checked={checked.includes(skill.name)}
                      onChange={() => toggleSkill(skill.name)}
                    />
                    <span className="opt-name">{skill.name}</span>
                    <span className="opt-desc">{skill.description}</span>
                  </label>
                ))}
            </div>
          </>
        ) : (
          <>
            <div className="pane-head">
              <input
                className="input"
                placeholder="搜索 skills.sh，例如 react"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') doSearch()
                }}
              />
              <button className="btn" onClick={doSearch} disabled={searching}>
                {searching ? '搜索中…' : '搜索'}
              </button>
            </div>

            {searchError && <div className="error-text">{searchError}</div>}

            <div className="list">
              {results.length === 0 && !searching && !searchError && (
                <div className="empty">输入关键词搜索 skills.sh 上的技能</div>
              )}
              {results.map((item) => (
                <div key={item.slug} className="result-row">
                  <div style={{ minWidth: 0 }}>
                    <div className="row-name">{item.name}</div>
                    <div className="row-meta">{item.source}</div>
                  </div>
                  <div className="inline">
                    <span className="tag">{formatInstalls(item.installs)}</span>
                    <button className="btn primary" onClick={() => pickResult(item)}>
                      安装
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <aside className="pane summary">
        <div className="summary-block">
          <span className="label">来源</span>
          <span className="mono" style={{ wordBreak: 'break-all' }}>
            {source.trim() || '未填写'}
          </span>
        </div>

        <div className="summary-block">
          <span className="label">已选技能</span>
          <span className="hint">
            {checked.length} 个{checked.length > 0 ? `：${checked.join('、')}` : ''}
          </span>
        </div>

        <div className="summary-block">
          <span className="label">安装到 Agent</span>
          <div className="chips">
            {visibleAgents.map((agent) => (
              <button
                key={agent.id}
                className={`chip ${selectedAgents.includes(agent.id) ? 'on' : agent.detected ? '' : 'off'}`}
                onClick={() => toggleAgent(agent.id)}
              >
                {agent.displayName}
                {agent.detected ? '' : ' · 未检测到'}
              </button>
            ))}
            <button className="chip" onClick={() => setShowAllAgents((prev) => !prev)}>
              {showAllAgents ? '收起' : `全部 ${agents.length} 个`}
            </button>
          </div>
          <span className="hint">默认勾选本机已检测到的 Agent</span>
        </div>

        <div className="summary-block">
          <span className="label">作用域</span>
          <div className="segmented">
            <button className={scope === 'global' ? 'active' : ''} onClick={() => onScopeChange('global')}>
              全局
            </button>
            <button className={scope === 'project' ? 'active' : ''} onClick={() => onScopeChange('project')}>
              项目
            </button>
          </div>
          {scope === 'project' && (
            <div className="inline">
              <span className="hint" style={{ wordBreak: 'break-all' }}>
                {projectPath || '未选择项目目录'}
              </span>
              <button className="btn ghost" onClick={onPickProject}>
                选择目录
              </button>
            </div>
          )}
        </div>

        <div className="summary-block">
          <span className="label">安装方式</span>
          <span className="hint">复制到各 Agent（Windows 未开开发者模式，不使用符号链接）</span>
        </div>

        <div className="actions">
          <button className="btn" onClick={() => { setPreview(null); setChecked([]); setPreviewError('') }} disabled={busy}>
            清空
          </button>
          <button className="btn primary" onClick={install} disabled={!canInstall}>
            {busy ? '安装中…' : '开始安装'}
          </button>
        </div>
      </aside>
    </div>
  )
}

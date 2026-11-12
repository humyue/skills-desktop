import { useMemo, useState } from 'react'
import DetailPanel from '../components/DetailPanel'

export default function Installed({
  skills,
  selectedName,
  onSelect,
  error,
  busy,
  onRemove,
  onUpdate,
  onOpen,
  onRefresh
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return skills
    return skills.filter((skill) => (skill.name || '').toLowerCase().includes(keyword))
  }, [skills, query])

  const selected = skills.find((skill) => skill.name === selectedName) || null

  return (
    <div className="split">
      <div className="pane bordered">
        <div className="pane-head">
          <input
            className="input"
            placeholder="搜索技能名称…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span className="pane-meta">
            {filtered.length} / {skills.length} 个
          </span>
          <button className="btn ghost" onClick={onRefresh} disabled={busy}>
            刷新
          </button>
        </div>

        {error && <div className="error-text">{error}</div>}

        <div className="list">
          {!error && filtered.length === 0 && (
            <div className="empty">{skills.length === 0 ? '当前作用域下没有已安装技能' : '没有匹配的技能'}</div>
          )}
          {filtered.map((skill) => (
            <button
              key={`${skill.name}-${skill.path || 'missing'}`}
              className={`row ${skill.name === selectedName ? 'active' : ''} ${skill.path ? '' : 'missing'}`}
              onClick={() => onSelect(skill.name)}
            >
              <div style={{ minWidth: 0 }}>
                <div className="row-name">{skill.name}</div>
                <div className="row-meta">
                  {(skill.agents || []).join(' · ') || (skill.path ? '未知 Agent' : '记录存在但目录缺失')}
                </div>
              </div>
              {skill.path ? (
                <span className={`tag ${skill.name === selectedName ? 'brand' : ''}`}>
                  {skill.scope === 'global' ? '全局' : '项目'}
                </span>
              ) : (
                <span className="tag status-bad">文件缺失</span>
              )}
            </button>
          ))}
        </div>

        <div className="pane-foot">
          <button className="btn" onClick={onUpdate} disabled={busy}>
            更新已装技能
          </button>
          <span className="pane-meta">全局作用域</span>
        </div>
      </div>

      <DetailPanel skill={selected} onRemove={onRemove} onOpen={onOpen} busy={busy} />
    </div>
  )
}

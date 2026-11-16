import { useMemo } from 'react'
import AgentGroups, { groupByAgent } from '../components/AgentGroups'

export default function SkillsPage({
  workspace,
  skills,
  visibleSkills,
  agents,
  query,
  skipped,
  collapsedKeys,
  onToggle,
  onToggleAll,
  selected,
  onSelect,
  onUninstall,
  onInstall,
  onRefresh,
  loading,
  error,
  busy
}) {
  const groups = useMemo(() => groupByAgent(visibleSkills), [visibleSkills])
  const allCollapsed = groups.length > 0 && groups.every((group) => collapsedKeys.includes(group.agent))
  const scopeMissing = Boolean(workspace && !workspace.exists)

  const subtitle = workspace
    ? `${skills.length} 项技能 · ${agents.length} 个 Agent · 最近打开 ${formatTime(workspace.lastOpenedAt)}`
    : `${skills.length} 项技能 · ${agents.length} 个 Agent`

  let body = null
  if (scopeMissing) {
    body = (
      <>
        <div className="notice">
          <b>目录不存在</b>
          <span>{workspace.path} 已被移动或删除，无法查看、安装或卸载。</span>
          <span className="grow" />
          <button className="btn" onClick={onRefresh}>
            重新检查
          </button>
        </div>
        <div className="sections blank-mode">
          <div className="blank">
            <h2>这个工作区已经失效</h2>
            <p>移除这条记录，或重新记录一个存在的目录。移除不会删除磁盘上的任何文件。</p>
          </div>
        </div>
      </>
    )
  } else if (!loading && visibleSkills.length === 0) {
    body = (
      <div className="sections blank-mode">
        <div className="blank">
          {query ? (
            <>
              <h2>没有匹配的技能</h2>
              <p>换个关键词，或清空搜索框。</p>
            </>
          ) : (
            <>
              <div className="file-no">EMPTY · 0 项</div>
              <h2>{workspace ? '这个档案夹还是空的' : '全局作用域下没有技能'}</h2>
              <p>{workspace ? '安装技能后，会按 Agent 分组归入这个工作区。' : '可以用右上角安装技能，装到全局。'}</p>
              <button className="btn primary" onClick={onInstall}>
                安装技能
              </button>
            </>
          )}
        </div>
      </div>
    )
  } else {
    body = (
      <div className="sections">
        {error && <div className="error-text" style={{ paddingLeft: 0 }}>{error}</div>}
        {loading && visibleSkills.length === 0 && <div className="empty">读取中…</div>}
        {groups.length > 0 && (
          <AgentGroups
            groups={groups}
            totalUnique={visibleSkills.length}
            agents={agents}
            collapsedKeys={collapsedKeys}
            onToggle={onToggle}
            selected={selected}
            onSelect={onSelect}
            onUninstall={onUninstall}
          />
        )}
      </div>
    )
  }

  return (
    <main className="content">
      <div className="main-head">
        <h1>{workspace ? workspace.name : '全局技能'}</h1>
        <span className="sub">{subtitle}</span>
        <span className="grow" />
        {groups.length > 1 && (
          <button className="head-link" onClick={onToggleAll}>
            {allCollapsed ? '展开全部 Agent' : '折叠全部 Agent'}
          </button>
        )}
      </div>
      {skipped > 0 && (
        <div className="hint" style={{ padding: '8px 24px 0' }}>
          另有 {skipped} 个技能目录缺少 SKILL.md 的 name / description，已被 CLI 跳过
        </div>
      )}
      {body}
    </main>
  )
}

function formatTime(value) {
  if (!value) return '—'
  const time = new Date(value)
  if (Number.isNaN(time.getTime())) return '—'
  const diff = Date.now() - time.getTime()
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} 小时前`
  return `${time.getMonth() + 1} 月 ${time.getDate()} 日`
}

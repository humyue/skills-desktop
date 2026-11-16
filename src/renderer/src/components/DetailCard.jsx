export function skillAgentPath(skill, agentName, scope, workspace, agentDirs) {
  const agent = agentDirs.find((item) => item.displayName === agentName)
  if (!agent) return '未知目录'
  if (scope === 'global') return `${agent.globalDir}\\${skill.name}`
  if (!workspace) return '未选择工作区'
  return `${workspace.path}\\${agent.projectDir}\\${skill.name}`
}

export default function DetailCard({
  skill,
  scope,
  workspace,
  agentDirs,
  busy,
  onPreview,
  onUninstall,
  onUpdate,
  onOpen,
  onRemoveWorkspace
}) {
  if (workspace && !workspace.exists) {
    return (
      <aside className="card-col">
        <div className="dossier">
          <div className="file-no">FILE · PROJECT / {workspace.name.toUpperCase()}</div>
          <h2>目录已失效</h2>
          <span className="kind project">无法读取</span>
          <dl>
            <dt>记录路径</dt>
            <dd className="path">{workspace.path}</dd>
          </dl>
          <div className="note">这个目录已被移动或删除。可以移除这条记录，或者重新记录一次新路径。</div>
          <div className="acts">
            <button className="btn" onClick={() => onRemoveWorkspace(workspace)}>
              移除记录
            </button>
          </div>
        </div>
        <div className="card-foot">移除只删记录，不动磁盘文件。</div>
      </aside>
    )
  }

  if (!skill) {
    return (
      <aside className="card-col">
        <div className="dossier">
          <div className="file-no">FILE · {workspace ? 'PROJECT' : 'GLOBAL'}</div>
          <h2>还没有技能</h2>
          <span className={`kind ${workspace ? 'project' : ''}`}>{workspace ? '项目技能' : '全局技能'}</span>
          <div className="note">安装后，这里会显示技能装入的 Agent、来源与目录。</div>
        </div>
      </aside>
    )
  }

  const missing = !skill.path
  const agents = skill.agents || []

  return (
    <aside className="card-col">
      <div className="dossier">
        <div className="file-no">
          FILE · {workspace ? `PROJECT / ${workspace.name.toUpperCase()}` : 'GLOBAL'}
        </div>
        <h2>{skill.name}</h2>
        <span className={`kind ${workspace ? 'project' : ''}`}>{workspace ? '项目技能' : '全局技能'}</span>

        <dl>
          <dt>装入</dt>
          <dd>
            {agents.map((agent) => (
              <div key={agent} className="agent-line">
                <b>{agent}</b>
                <span className="p">{skillAgentPath(skill, agent, scope, workspace, agentDirs)}</span>
              </div>
            ))}
            {agents.length === 0 && <span className="hint">未知 Agent</span>}
          </dd>
          <dt>来源</dt>
          <dd>{skill.source || '本地导入（未跟踪）'}</dd>
          <dt>状态</dt>
          <dd>{missing ? '目录缺失，记录仍在' : skill.status === 'tracked' ? '可更新 · 已跟踪' : '已安装 · 无更新源'}</dd>
        </dl>

        <div className="note">
          {workspace
            ? '项目技能只在当前工作区生效。卸载只移除这个技能，不动同工作区的其他技能。'
            : '同一个技能可能同时装进多个 Agent 目录，两处文件互不同步。'}
        </div>

        <div className="acts">
          <button className="btn primary" onClick={() => onPreview(skill)} disabled={missing}>
            预览 SKILL.md
          </button>
          <button
            className="btn"
            onClick={() => onUpdate(skill)}
            disabled={busy || missing || skill.status !== 'tracked'}
            title={skill.status === 'tracked' ? '从原仓库拉取最新版本' : '本地导入的技能没有更新源'}
          >
            更新
          </button>
        </div>
        <div className="acts row2">
          <button className="btn" onClick={() => onOpen(skill.path)} disabled={!skill.path}>
            打开目录
          </button>
          <button className="btn danger" onClick={() => onUninstall(skill)} disabled={busy || missing}>
            卸载此技能
          </button>
        </div>
      </div>
      <div className="card-foot">档案卡随选中变化。移除工作区不会删除磁盘文件。</div>
    </aside>
  )
}

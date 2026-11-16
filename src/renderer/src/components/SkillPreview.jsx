import MarkdownView from './MarkdownView'

export default function SkillPreview({ state, scope, workspace, onClose, onOpenDir }) {
  if (!state) return null
  const { skill, loading, data, error } = state
  const frontmatter = data?.frontmatter || {}

  return (
    <div
      className="scrim on"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="md-modal">
        <div className="md-head">
          <div style={{ minWidth: 0 }}>
            <div className="file-no">
              SKILL.md · {skill.status === 'tracked' ? 'TRACKED' : 'UNTRACKED'}
            </div>
            <h2>{skill.name}</h2>
            <div className="path">{skill.path ? `${skill.path}\\SKILL.md` : '目录缺失'}</div>
          </div>
          <button className="x" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="md-body">
          <dl className="md-front">
            <dt>description</dt>
            <dd>{frontmatter.description || skill.description || '无描述'}</dd>
            <dt>装入</dt>
            <dd>{(skill.agents || []).join('、') || '未知'}</dd>
            <dt>作用域</dt>
            <dd>{workspace ? `项目 · ${workspace.name}` : '全局'}</dd>
            <dt>来源</dt>
            <dd>{skill.source || '本地导入（未跟踪）'}</dd>
          </dl>

          {loading && <div className="hint">加载中…</div>}
          {error && <div className="error-text" style={{ padding: 0 }}>{error}</div>}
          {data && (
            <div className="md-doc">
              <MarkdownView markdown={data.body} />
            </div>
          )}
        </div>

        <div className="md-foot">
          <button className="btn" onClick={() => onOpenDir(skill.path)} disabled={!skill.path}>
            打开目录
          </button>
          <button className="btn primary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

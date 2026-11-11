import { useEffect, useState } from 'react'
import MarkdownView from './MarkdownView'

export default function DetailPanel({ skill, onRemove, onOpen, busy }) {
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setDetail(null)
    setError('')
    if (!skill || !skill.path) return
    window.api
      .skillDetail({ path: skill.path })
      .then(setDetail)
      .catch((err) => setError(err.message))
  }, [skill?.path])

  if (!skill) {
    return (
      <div className="pane detail">
        <div className="empty">在左侧选择一个技能查看详情</div>
      </div>
    )
  }

  const missing = !skill.path

  return (
    <div className="pane detail">
      <div className="detail-name">{skill.name}</div>
      <dl className="kv">
        <dt>作用域</dt>
        <dd>{skill.scope === 'global' ? '全局' : '项目'}</dd>
        <dt>Agent</dt>
        <dd>{(skill.agents || []).join('、') || '未知'}</dd>
        <dt>来源</dt>
        <dd>{skill.source || '未知（未通过 CLI 安装）'}</dd>
        <dt>路径</dt>
        <dd className="mono">{skill.path || '—'}</dd>
        <dt>状态</dt>
        <dd>{skill.status || (missing ? 'missing' : 'installed')}</dd>
      </dl>

      <div className="section-label">技能说明</div>
      {missing && (
        <div className="hint">
          该技能只是清单里的记录（status: missing），磁盘上已找不到对应目录，可能是被手动删除或 Agent
          目录变更。可以点下方「卸载」清理这条记录，或重新安装一次。
        </div>
      )}
      {error && <div className="error-text" style={{ padding: 0 }}>{error}</div>}
      {detail ? (
        <>
          <div className="hint">{detail.frontmatter?.description || '无描述'}</div>
          <MarkdownView markdown={detail.body} />
        </>
      ) : (
        !error && !missing && <div className="hint">加载中…</div>
      )}

      <div className="actions">
        <button
          className="btn primary"
          onClick={() => onOpen(`${skill.path}/SKILL.md`)}
          disabled={missing}
        >
          打开 SKILL.md
        </button>
        <button className="btn" onClick={() => onOpen(skill.path)} disabled={missing}>
          打开目录
        </button>
        <button className="btn danger" onClick={() => onRemove(skill)} disabled={busy}>
          卸载
        </button>
      </div>
    </div>
  )
}

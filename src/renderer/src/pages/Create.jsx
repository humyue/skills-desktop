import { useState } from 'react'

export default function Create() {
  const [name, setName] = useState('')
  const [dir, setDir] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  const create = async () => {
    setError('')
    setMessage('')
    setWorking(true)
    try {
      const result = await window.api.initSkill({ name: name.trim(), dir })
      setMessage(`已生成 ${result.path}`)
      window.api.openPath(result.path)
    } catch (err) {
      setError(err.message)
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="form">
      <div className="field">
        <label>技能名称</label>
        <input
          className="input"
          placeholder="例如 my-skill（小写字母、数字、连字符）"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <span className="hint">会在所选目录下创建 &lt;名称&gt;/SKILL.md 模板</span>
      </div>

      <div className="field">
        <label>创建位置</label>
        <div className="field-row">
          <input className="input" placeholder="选择一个目录" value={dir} readOnly />
          <button
            className="btn"
            onClick={async () => {
              const picked = await window.api.pickDirectory({ title: '选择技能创建位置' })
              if (picked) setDir(picked)
            }}
          >
            选择目录
          </button>
        </div>
      </div>

      {error && <div className="error-text" style={{ padding: 0 }}>{error}</div>}
      {message && <div className="hint">{message}</div>}

      <div className="inline">
        <button className="btn primary" onClick={create} disabled={working || !name.trim() || !dir}>
          {working ? '创建中…' : '创建 SKILL.md'}
        </button>
      </div>
    </div>
  )
}

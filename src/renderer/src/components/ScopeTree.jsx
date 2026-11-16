export default function ScopeTree({ workspaces, activeScope, counts, onSelect, onAdd, onRemove }) {
  return (
    <aside className="tree">
      <div className="tree-scroll">
        <div className="tree-sec">
          <div className="sec-head">
            <span className="cap">作用域</span>
          </div>
          <button
            className={`node global ${activeScope === 'global' ? 'on' : ''}`}
            onClick={() => onSelect('global')}
          >
            <span className="nm">全局</span>
            <span className="cnt">{counts.global ?? '—'}</span>
          </button>
        </div>

        <div className="tree-sec">
          <div className="sec-head">
            <span className="cap">项目</span>
            <span className="n">{workspaces.length} 个工作区</span>
            <button className="link-btn add" onClick={onAdd}>
              + 记录
            </button>
          </div>

          {workspaces.length === 0 && (
            <div className="hint" style={{ padding: '4px 14px 12px', lineHeight: '17px' }}>
              还没有记录工作区。选一个项目目录，就能把技能装到它自己的 Agent 目录里。
            </div>
          )}

          {workspaces.map((ws, index) => (
            <button
              key={ws.id}
              className={`drawer ${activeScope === ws.id ? 'on' : ''} ${ws.exists ? '' : 'missing'}`}
              onClick={() => onSelect(ws.id)}
            >
              <span className="no">{String(index + 1).padStart(2, '0')}</span>
              <span>
                <span className="nm">{ws.name}</span>
                <span className="path">{ws.path}</span>
                <span className="meta">
                  {ws.exists
                    ? `${counts[ws.id] != null ? `${counts[ws.id]} 项技能` : '未加载'}`
                    : '目录缺失 · 只能移除记录'}
                </span>
              </span>
              {!ws.exists && <span className="stamp">缺失</span>}
              <span
                className="del"
                title="从列表移除"
                onClick={(event) => {
                  event.stopPropagation()
                  onRemove(ws)
                }}
              >
                <svg viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M1 1l8 8M9 1l-8 8" />
                </svg>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="tree-foot">
        工作区来自你选择过的项目目录，只保存在本机；移除只删记录，不动磁盘文件。
      </div>
    </aside>
  )
}

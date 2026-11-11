import { useEffect, useRef } from 'react'

export default function LogBar({ logs, expanded, setExpanded, busy, notice, error }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [logs, expanded])

  const last = logs[logs.length - 1]
  const status = busy ? '执行中' : error ? '失败' : notice ? '完成' : ''
  const statusClass = error ? 'status-bad' : busy ? '' : 'status-ok'
  const summary = error || (last && last.line) || notice || '暂无日志'

  return (
    <div className="logbar">
      <div className="logbar-head">
        <span className="logbar-title">运行日志</span>
        <span className="logbar-line">{summary}</span>
        {status && <span className={`tag ${statusClass}`}>{status}</span>}
        <button className="logbar-toggle" onClick={() => setExpanded(!expanded)}>
          {expanded ? '收起 ⌄' : '展开 ⌃'}
        </button>
      </div>
      {expanded && (
        <div className="logs" ref={scrollRef}>
          {logs.length === 0 && <div className="logline">等待命令执行…</div>}
          {logs.map((item, index) => (
            <div key={index} className={`logline ${item.stream === 'stderr' ? 'stderr' : ''}`}>
              {item.line}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

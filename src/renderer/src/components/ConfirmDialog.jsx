export default function ConfirmDialog({ dialog, busy, onCancel, onConfirm }) {
  if (!dialog) return null

  return (
    <div
      className="scrim on"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div className="modal">
        <h2>{dialog.title}</h2>
        {dialog.sub && <div className="sub">{dialog.sub}</div>}
        {dialog.rows && dialog.rows.length > 0 && (
          <div className="rows">
            {dialog.rows.map((row) => (
              <div key={`${row.label}-${row.path}`} className="r">
                <b>{row.label}</b>
                {row.path && <span className="p">{row.path}</span>}
              </div>
            ))}
          </div>
        )}
        {dialog.warning && <div className="warn">{dialog.warning}</div>}
        <div className="acts">
          <button className="btn" onClick={onCancel}>
            取消
          </button>
          <button
            className={`btn ${dialog.danger ? 'danger' : 'primary'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {dialog.confirmText || '确认'}
          </button>
        </div>
      </div>
    </div>
  )
}

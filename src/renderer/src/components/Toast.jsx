export default function Toast({ text }) {
  return <div className={`toast ${text ? 'on' : ''}`}>{text || ''}</div>
}

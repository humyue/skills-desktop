import { useEffect, useState } from 'react'

const SOURCE_LABEL = {
  bundled: '内置（随安装包）',
  global: '全局 npm 安装',
  missing: '未找到'
}

export default function SettingsPage({ settings, onSave }) {
  const [test, setTest] = useState(null)
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState('')
  const [cli, setCli] = useState({ path: '', version: '', source: 'missing' })
  const [versionInfo, setVersionInfo] = useState(null)
  const [checkingVersion, setCheckingVersion] = useState(false)

  useEffect(() => {
    window.api
      .cliInfo()
      .then(setCli)
      .catch(() => {})
  }, [])

  const checkVersion = async () => {
    setCheckingVersion(true)
    try {
      setVersionInfo(await window.api.checkCliUpdate())
    } catch (error) {
      setVersionInfo({ error: error.message })
    } finally {
      setCheckingVersion(false)
    }
  }

  const runTest = async () => {
    setTesting(true)
    setStatus('')
    try {
      setTest(await window.api.testNetwork())
    } catch (error) {
      setStatus(error.message)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="form">
      <div className="field">
        <label>运行环境</label>
        <div className="field-row">
          <button className="btn" onClick={runTest} disabled={testing}>
            {testing ? '检测中…' : '检测网络与依赖'}
          </button>
          {status && <span className="hint">{status}</span>}
        </div>
        {test && (
          <div className="inline">
            <span className={`tag ${test.http.ok ? 'status-ok' : 'status-bad'}`}>
              HTTP {test.http.ok ? '可达' : '不可达'}
            </span>
            <span className={`tag ${test.git.ok ? 'status-ok' : 'status-bad'}`}>
              git {test.git.ok ? '可用' : '连接 GitHub 失败'}
            </span>
            <span className={`tag ${test.cli ? '' : 'status-bad'}`}>{test.cli ? 'CLI 就绪' : 'CLI 缺失'}</span>
          </div>
        )}
        <span className="hint">
          应用不提供手动代理配置，会自动沿用系统代理（与浏览器一致）执行 git 克隆；若仍失败，请检查系统代理或改用本地路径安装。
        </span>
      </div>

      <div className="field">
        <label>skills CLI</label>
        <div className="field-row">
          <span className="mono">{cli.version ? `v${cli.version}` : '未读取到版本'}</span>
          <span className="tag">{SOURCE_LABEL[cli.source] || cli.source}</span>
          <button className="btn" onClick={checkVersion} disabled={checkingVersion}>
            {checkingVersion ? '检查中…' : '检查新版本'}
          </button>
          {versionInfo && !versionInfo.error && (
            <span className={`tag ${versionInfo.hasUpdate ? 'status-bad' : 'status-ok'}`}>
              {versionInfo.hasUpdate
                ? `官方已发布 ${versionInfo.latest}`
                : versionInfo.latest
                  ? '已是最新'
                  : '无法获取最新版本'}
            </span>
          )}
        </div>
        {cli.path && <span className="hint mono">{cli.path}</span>}
        {versionInfo?.error && <span className="hint">检查失败：{versionInfo.error}</span>}
        {versionInfo?.hasUpdate && (
          <span className="hint">CLI 随应用安装包一起发布，下载并安装新版应用即可完成升级。</span>
        )}
      </div>

      <div className="field">
        <label>界面主题</label>
        <div className="segmented">
          <button
            className={settings.theme !== 'dark' ? 'active' : ''}
            onClick={() => onSave({ theme: 'light' })}
          >
            浅色
          </button>
          <button
            className={settings.theme === 'dark' ? 'active' : ''}
            onClick={() => onSave({ theme: 'dark' })}
          >
            深色
          </button>
        </div>
      </div>
    </div>
  )
}

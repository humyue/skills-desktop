import { useEffect, useState } from 'react'

export default function SettingsPage({ settings, onSave, onRunJob }) {
  const [proxy, setProxy] = useState(settings.proxy || '')
  const [cliPath, setCliPath] = useState(settings.cliPath || '')
  const [test, setTest] = useState(null)
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState('')
  const [currentVersion, setCurrentVersion] = useState('')
  const [versionInfo, setVersionInfo] = useState(null)
  const [checkingVersion, setCheckingVersion] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setProxy(settings.proxy || '')
    setCliPath(settings.cliPath || '')
  }, [settings.proxy, settings.cliPath])

  useEffect(() => {
    window.api
      .cliVersion()
      .then(setCurrentVersion)
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

  const copyUpgradeCommand = async () => {
    await window.api.copyText('npm i -g skills@latest')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const runUpdate = async () => {
    const confirmed = window.confirm(
      '将执行全局安装命令：npm i -g skills@latest（使用 npmmirror 源）。\n安装过程中的输出会显示在下方日志。确认继续？'
    )
    if (!confirmed) return
    setUpdating(true)
    try {
      const result = await onRunJob(() => window.api.updateCli(), {
        successMessage: 'skills 已更新到最新版本'
      })
      if (result && result.code === 0) {
        setCurrentVersion(result.current || '')
        setVersionInfo(null)
      }
    } finally {
      setUpdating(false)
    }
  }

  const save = async () => {
    await onSave({ proxy: proxy.trim(), cliPath: cliPath.trim() })
    setStatus('已保存')
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
        <label>网络代理</label>
        <div className="field-row">
          <input
            className="input"
            placeholder="例如 127.0.0.1:7897，留空表示直连"
            value={proxy}
            onChange={(event) => setProxy(event.target.value)}
          />
          <button className="btn" onClick={runTest} disabled={testing}>
            {testing ? '测试中…' : '测试连通性'}
          </button>
        </div>
        <span className="hint">填写后会以 HTTP_PROXY / HTTPS_PROXY 注入到 skills 子进程，用于 git 克隆仓库</span>
      </div>

      {test && (
        <div className="inline">
          <span className={`tag ${test.http.ok ? 'status-ok' : 'status-bad'}`}>
            HTTP {test.http.ok ? '可达' : '不可达'}
          </span>
          <span className={`tag ${test.git.ok ? 'status-ok' : 'status-bad'}`}>
            git {test.git.ok ? '可用' : '连接 GitHub 失败'}
          </span>
          <span className={`tag ${test.cli ? '' : 'status-bad'}`}>{test.cli ? 'CLI 已找到' : 'CLI 未找到'}</span>
        </div>
      )}
      {test && !test.git.ok && (
        <span className="hint">git 不通时远程安装会失败，请在此填入代理后重新测试。</span>
      )}
      {test && test.cli && <span className="hint mono">{test.cli}</span>}

      <div className="field">
        <label>skills CLI 路径</label>
        <input
          className="input"
          placeholder="留空自动探测（全局 npm 目录）"
          value={cliPath}
          onChange={(event) => setCliPath(event.target.value)}
        />
        <span className="hint">自动探测顺序：此处填写 → 项目 node_modules → 全局 npm 目录</span>
      </div>

      <div className="field">
        <label>skills 包版本</label>
        <div className="field-row">
          <span className="mono">{currentVersion ? `v${currentVersion}` : '未读取到版本'}</span>
          <button className="btn" onClick={checkVersion} disabled={checkingVersion}>
            {checkingVersion ? '检查中…' : '检查更新'}
          </button>
          {versionInfo && !versionInfo.error && (
            <span className={`tag ${versionInfo.hasUpdate ? 'status-bad' : 'status-ok'}`}>
              {versionInfo.hasUpdate
                ? `可升级到 ${versionInfo.latest}`
                : versionInfo.latest
                  ? '已是最新'
                  : '无法获取最新版本'}
            </span>
          )}
        </div>
        {versionInfo?.error && <span className="hint">检查失败：{versionInfo.error}</span>}
        {versionInfo?.latest && (
          <span className="hint">
            最新版本 {versionInfo.latest}（来源 {versionInfo.registry}）
          </span>
        )}
        {versionInfo?.hasUpdate && (
          <div className="field-row">
            <input className="input mono" readOnly value="npm i -g skills@latest" />
            <button className="btn" onClick={copyUpgradeCommand}>
              {copied ? '已复制' : '复制命令'}
            </button>
            <button className="btn primary" onClick={runUpdate} disabled={updating}>
              {updating ? '更新中…' : '执行更新'}
            </button>
          </div>
        )}
        <span className="hint">
          只做版本比对与手动触发；执行更新等同在本机运行 npm i -g skills@latest（npmmirror 源），输出见下方日志
        </span>
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

      <div className="inline">
        <button className="btn primary" onClick={save}>
          保存设置
        </button>
        {status && <span className="hint">{status}</span>}
      </div>
    </div>
  )
}

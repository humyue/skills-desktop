import { app, session } from 'electron'
import { existsSync, readFileSync } from 'node:fs'
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

const ANSI_PATTERN = /\u001B\[[0-9;?]*[ -/]*[@-~]/g

export function stripAnsi(value) {
  return String(value).replace(ANSI_PATTERN, '')
}

let proxyCache = { value: '', at: 0 }

// git 等命令行工具不读 Windows 的「Internet 选项」，需要把系统代理显式注入为环境变量
async function systemProxyUrl() {
  const now = Date.now()
  if (now - proxyCache.at < 30000) return proxyCache.value
  let value = ''
  try {
    const resolved = String(await session.defaultSession.resolveProxy('https://github.com'))
    const first = resolved.split(';')[0].trim()
    const match = /^(PROXY|HTTPS|SOCKS5|SOCKS4)\s+(\S+)$/i.exec(first)
    if (match) {
      const scheme = /^SOCKS5$/i.test(match[1]) ? 'socks5' : /^SOCKS4$/i.test(match[1]) ? 'socks4' : 'http'
      value = `${scheme}://${match[2]}`
    }
  } catch {
    value = ''
  }
  proxyCache = { value, at: now }
  return value
}

function readNpmRoot() {
  try {
    const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
    return execFileSync(cmd, ['root', '-g'], { encoding: 'utf8', timeout: 15000 }).trim()
  } catch {
    return ''
  }
}

export function getInstalledCliVersion(cliPath) {
  try {
    const pkg = JSON.parse(readFileSync(join(dirname(cliPath), '..', 'package.json'), 'utf8'))
    return pkg.version || ''
  } catch {
    return ''
  }
}

const CLI_REL = ['node_modules', 'skills', 'bin', 'cli.mjs']

// 安装包内置的 skills CLI：打包后位于 app.asar.unpacked，开发时位于项目根目录
function bundledCliCandidates() {
  const list = []
  if (app.isPackaged) {
    list.push(join(process.resourcesPath, 'app.asar.unpacked', ...CLI_REL))
  }
  list.push(join(app.getAppPath(), ...CLI_REL))
  return list
}

export function resolveCliPath() {
  const bundled = bundledCliCandidates().find((item) => existsSync(item))
  if (bundled) return bundled

  // 回退到全局安装的 CLI（需要用户机器上装有 Node.js 与 npm）
  const globalCandidates = []
  if (process.env.APPDATA) {
    globalCandidates.push(join(process.env.APPDATA, 'npm', 'node_modules', 'skills', 'bin', 'cli.mjs'))
  }
  const npmRoot = readNpmRoot()
  if (npmRoot) globalCandidates.push(join(npmRoot, 'skills', 'bin', 'cli.mjs'))
  return globalCandidates.find((item) => existsSync(item)) || ''
}

export function getCliInfo() {
  const cliPath = resolveCliPath()
  if (!cliPath) return { path: '', version: '', source: 'missing' }
  const isBundled = bundledCliCandidates().includes(cliPath)
  return {
    path: cliPath,
    version: getInstalledCliVersion(cliPath),
    source: isBundled ? 'bundled' : 'global'
  }
}

// 始终用 Electron 自带的 Node 运行 CLI：安装包场景下用户机器没有 Node，
// 且内置 CLI 与 Electron 的 Node 版本是配套验证过的
function resolveNode() {
  return { cmd: process.execPath, extraEnv: { ELECTRON_RUN_AS_NODE: '1' } }
}

function buildEnv(proxyUrl) {
  const env = {
    ...process.env,
    NO_COLOR: '1',
    FORCE_COLOR: '0',
    GIT_TERMINAL_PROMPT: '0'
  }
  // 已显式设置过代理环境变量时以它为准，否则注入系统代理
  const hasProxyEnv = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY
  if (proxyUrl && !hasProxyEnv) {
    env.HTTP_PROXY = proxyUrl
    env.HTTPS_PROXY = proxyUrl
    env.http_proxy = proxyUrl
    env.https_proxy = proxyUrl
  }
  return env
}

function runProcess(command, args, options = {}) {
  const { cwd, env, onLog, timeoutMs = 300000 } = options

  return new Promise((resolve) => {
    let child
    let settled = false
    const lines = []

    const finish = (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({ code, output: lines.join('\n') })
    }

    try {
      child = spawn(command, args, {
        cwd: cwd || homedir(),
        env: { ...env },
        windowsHide: true
      })
    } catch (error) {
      resolve({ code: -1, output: String(error && error.message) })
      return
    }

    const timer = setTimeout(() => {
      try {
        child.kill()
      } catch {
        /* ignore */
      }
    }, timeoutMs)

    // stdout 与 stderr 必须各自缓冲：共用一个缓冲区时，半行内容会被另一条流粘住，解析出错
    const buffers = { stdout: '', stderr: '' }
    const consume = (chunk, stream) => {
      buffers[stream] += chunk.toString('utf8')
      const parts = buffers[stream].split(/\r?\n/)
      buffers[stream] = parts.pop()
      for (const part of parts) {
        const clean = stripAnsi(part).replace(/\r/g, '').trimEnd()
        if (!clean.trim()) continue
        lines.push(clean)
        if (onLog) onLog(stream, clean)
      }
    }

    child.stdout.on('data', (chunk) => consume(chunk, 'stdout'))
    child.stderr.on('data', (chunk) => consume(chunk, 'stderr'))
    child.on('error', (error) => {
      lines.push(String(error && error.message))
      finish(-1)
    })
    child.on('close', (code) => {
      for (const stream of ['stdout', 'stderr']) {
        const rest = buffers[stream]
        if (!rest.trim()) continue
        const clean = stripAnsi(rest).replace(/\r/g, '').trimEnd()
        lines.push(clean)
        if (onLog) onLog(stream, clean)
      }
      finish(code == null ? -1 : code)
    })
  })
}

export async function runCli(cliPath, args, options = {}) {
  const { cwd, onLog, timeoutMs = 300000 } = options
  const node = resolveNode()
  const proxyUrl = await systemProxyUrl()
  return runProcess(node.cmd, [cliPath, ...args], {
    cwd: cwd || homedir(),
    env: { ...buildEnv(proxyUrl), ...node.extraEnv },
    onLog,
    timeoutMs
  })
}

export async function testGitAccess() {
  const proxyUrl = await systemProxyUrl()
  const result = spawnSync('git', ['ls-remote', '--heads', 'https://github.com/vercel-labs/agent-skills'], {
    env: buildEnv(proxyUrl),
    encoding: 'utf8',
    timeout: 25000
  })
  return { ok: result.status === 0, detail: result.status === 0 ? 'git 可用' : 'git 连接 GitHub 失败' }
}

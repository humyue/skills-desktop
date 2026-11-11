import { existsSync, readFileSync } from 'node:fs'
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

const ANSI_PATTERN = /\u001B\[[0-9;?]*[ -/]*[@-~]/g

export function stripAnsi(value) {
  return String(value).replace(ANSI_PATTERN, '')
}

export function normalizeProxy(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return /^https?:\/\//i.test(raw) ? raw : `http://${raw}`
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

export function resolveCliPath(explicit) {
  const candidates = []
  if (explicit) candidates.push(explicit)
  if (process.env.SKILLS_CLI_PATH) candidates.push(process.env.SKILLS_CLI_PATH)
  candidates.push(join(process.cwd(), 'node_modules', 'skills', 'bin', 'cli.mjs'))
  if (process.env.APPDATA) {
    candidates.push(join(process.env.APPDATA, 'npm', 'node_modules', 'skills', 'bin', 'cli.mjs'))
  }
  const npmRoot = readNpmRoot()
  if (npmRoot) candidates.push(join(npmRoot, 'skills', 'bin', 'cli.mjs'))
  return candidates.find((item) => item && existsSync(item)) || ''
}

function resolveNode() {
  const probe = spawnSync('node', ['-v'], { encoding: 'utf8' })
  if (probe.status === 0) return { cmd: 'node', extraEnv: {} }
  return { cmd: process.execPath, extraEnv: { ELECTRON_RUN_AS_NODE: '1' } }
}

function buildEnv(proxy) {
  const env = {
    ...process.env,
    NO_COLOR: '1',
    FORCE_COLOR: '0',
    GIT_TERMINAL_PROMPT: '0'
  }
  const proxyUrl = normalizeProxy(proxy)
  if (proxyUrl) {
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

    let buffer = ''
    const consume = (chunk, stream) => {
      buffer += chunk.toString('utf8')
      const parts = buffer.split(/\r?\n/)
      buffer = parts.pop()
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
      if (buffer.trim()) {
        const clean = stripAnsi(buffer).replace(/\r/g, '').trimEnd()
        lines.push(clean)
        if (onLog) onLog('stdout', clean)
      }
      finish(code == null ? -1 : code)
    })
  })
}

export function runCli(cliPath, args, options = {}) {
  const { cwd, proxy, onLog, timeoutMs = 300000 } = options
  const node = resolveNode()
  return runProcess(node.cmd, [cliPath, ...args], {
    cwd: cwd || homedir(),
    env: { ...buildEnv(proxy), ...node.extraEnv },
    onLog,
    timeoutMs
  })
}

export function installSkillsPackage(onLog) {
  const npmArgs = ['install', '-g', 'skills@latest', '--registry=https://registry.npmmirror.com']
  const isWindows = process.platform === 'win32'
  const command = isWindows ? process.env.ComSpec || 'cmd.exe' : 'npm'
  const args = isWindows ? ['/c', 'npm', ...npmArgs] : npmArgs
  return runProcess(command, args, { env: buildEnv(''), onLog, timeoutMs: 300000 })
}

export function testGitAccess(proxy) {
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' }
  const proxyUrl = normalizeProxy(proxy)
  if (proxyUrl) {
    env.HTTP_PROXY = proxyUrl
    env.HTTPS_PROXY = proxyUrl
    env.http_proxy = proxyUrl
    env.https_proxy = proxyUrl
  }
  const result = spawnSync('git', ['ls-remote', '--heads', 'https://github.com/vercel-labs/agent-skills'], {
    env,
    encoding: 'utf8',
    timeout: 25000
  })
  return { ok: result.status === 0, detail: result.status === 0 ? 'git 可用' : 'git 连接 GitHub 失败' }
}

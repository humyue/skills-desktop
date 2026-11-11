import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { parse as parseYaml } from 'yaml'
import { runCli, stripAnsi } from './cli.js'

export async function listSkills({ scope = 'global', projectPath, cliPath, proxy }) {
  const args = ['ls', '--json']
  const cwd = scope === 'global' ? homedir() : projectPath
  if (scope === 'global') args.push('-g')
  if (scope === 'project' && !cwd) throw new Error('请先选择项目目录')
  const { code, output } = await runCli(cliPath, args, { cwd, proxy })
  if (code !== 0) throw new Error(output || 'skills ls 执行失败')
  const start = output.indexOf('[')
  if (start === -1) return []
  try {
    return JSON.parse(output.slice(start))
  } catch {
    return []
  }
}

export function parseRepoList(raw) {
  const lines = stripAnsi(raw).replace(/\r/g, '').split('\n')
  const start = lines.findIndex((line) => line.includes('Available Skills'))
  if (start === -1) return { skills: [] }
  const skills = []
  let group = 'General'
  let current = null

  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line.trim()) continue
    if (line.includes('Use --skill')) break
    if (line.includes('Discover more skills')) break

    if (line.startsWith('│')) {
      const body = line.slice(1)
      const indent = body.length - body.trimStart().length
      const content = body.trim()
      if (!content) continue
      if (indent >= 5) {
        if (current && !current.description) current.description = content
      } else {
        current = { name: content, description: '', group }
        skills.push(current)
      }
      continue
    }

    const trimmed = line.trim()
    if (/^[◇◆●○└┌├╭╰✓✗]/.test(trimmed)) continue
    if (!/^\s/.test(line) && trimmed) group = trimmed
  }

  return { skills }
}

export function buildInstallArgs({ source, skills, agents, global, copy = true }) {
  const args = ['add', source]
  for (const name of skills) args.push('--skill', name)
  for (const agent of agents) args.push('--agent', agent)
  if (copy) args.push('--copy')
  if (global) args.push('-g')
  args.push('-y')
  return args
}

export async function previewRepo({ source, cliPath, proxy }) {
  const { code, output } = await runCli(cliPath, ['add', source, '-l'], {
    cwd: homedir(),
    proxy
  })
  const parsed = parseRepoList(output)
  return { code, output, skills: parsed.skills }
}

export async function installSkills(options) {
  const { source, skills, agents, scope, projectPath, cliPath, proxy, onLog } = options
  if (!source) throw new Error('请填写技能来源')
  if (!skills || skills.length === 0) throw new Error('请至少选择一个技能')
  if (!agents || agents.length === 0) throw new Error('请至少选择一个 Agent')
  const global = scope === 'global'
  const cwd = global ? homedir() : projectPath
  if (!global && !cwd) throw new Error('请先选择项目目录')
  const args = buildInstallArgs({ source, skills, agents, global })
  return runCli(cliPath, args, { cwd, proxy, onLog, timeoutMs: 600000 })
}

export async function removeSkills(options) {
  const { names, agents, scope, projectPath, cliPath, proxy, onLog } = options
  if (!names || names.length === 0) throw new Error('请选择要卸载的技能')
  const args = ['remove', ...names]
  for (const agent of agents || []) args.push('--agent', agent)
  const global = scope === 'global'
  if (global) args.push('-g')
  args.push('-y')
  return runCli(cliPath, args, {
    cwd: global ? homedir() : projectPath,
    proxy,
    onLog
  })
}

export async function updateSkills(options) {
  const { names, scope, projectPath, cliPath, proxy, onLog } = options
  const args = ['update']
  for (const name of names || []) args.push(name)
  args.push(scope === 'global' ? '-g' : '-p')
  args.push('-y')
  return runCli(cliPath, args, {
    cwd: scope === 'global' ? homedir() : projectPath,
    proxy,
    onLog,
    timeoutMs: 600000
  })
}

export async function initSkill({ name, dir, cliPath }) {
  if (!name || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
    throw new Error('技能名只能包含小写字母、数字与连字符')
  }
  if (!dir || !existsSync(dir)) throw new Error('请选择有效的目录')
  const { code, output } = await runCli(cliPath, ['init', name], { cwd: dir })
  if (code !== 0) throw new Error(output || 'skills init 执行失败')
  return { path: join(dir, name, 'SKILL.md'), output }
}

export function readSkill(skillPath) {
  const file = join(skillPath, 'SKILL.md')
  if (!existsSync(file)) throw new Error('该技能目录下没有 SKILL.md')
  const raw = readFileSync(file, 'utf8')
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return { frontmatter: {}, body: raw }
  let frontmatter = {}
  try {
    frontmatter = parseYaml(match[1]) || {}
  } catch {
    frontmatter = {}
  }
  return { frontmatter, body: raw.slice(match[0].length) }
}
